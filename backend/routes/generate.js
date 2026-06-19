const express = require('express');
const { authMiddleware, supabase } = require('../middleware/auth');
const { generateBlogPostStream, generateHashtags, analyzeStyle } = require('../services/claude');
const { generateImages } = require('../services/dalle');
const { searchImages } = require('../services/unsplash');
const { deductCredits, getBalance } = require('../credits');
const fetch = require('node-fetch');

const router = express.Router();

function base64ToBuffer(dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

function sseWrite(res, event, data) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// POST /api/generate/blog — SSE 스트리밍
router.post('/blog', authMiddleware, async (req, res, next) => {
  const {
    transcript, tone = 'informative', imageCount = 3,
    imageSource = 'dalle', customStyleId, contentLength = 'normal',
    useWebSearch = false, prevMarkdown,
  } = req.body;

  if (!transcript || transcript.trim().length < 10) {
    return res.status(400).json({ error: '글감 텍스트가 너무 짧습니다.' });
  }

  // ── 크레딧 사전 확인 (SSE 시작 전) ──────────────────────
  const creditCost = 1 + (useWebSearch ? 1 : 0);
  const balance = await getBalance(req.user.id);
  if (balance < creditCost) {
    return res.status(402).json({
      error: `크레딧이 부족합니다. (필요: ${creditCost}, 잔여: ${balance})`,
      code: 'INSUFFICIENT_CREDITS',
      balance,
      required: creditCost,
    });
  }

  // SSE 헤더
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let clientGone = false;
  req.on('close', () => { clientGone = true; });

  try {
    // 플랜 체크
    const { data: plan } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (plan && plan.generations_used >= plan.generations_limit) {
      sseWrite(res, 'error', { error: '이번 달 생성 한도를 초과했습니다.' });
      return res.end();
    }

    // 커스텀 스타일 조회
    let customSystemPrompt = null;
    if (customStyleId) {
      const { data: styleData } = await supabase
        .from('user_styles')
        .select('system_prompt')
        .eq('id', customStyleId)
        .eq('user_id', req.user.id)
        .single();
      if (styleData) customSystemPrompt = styleData.system_prompt;
    }

    // Phase 1: 블로그 글 스트리밍
    sseWrite(res, 'progress', { phase: 'blog', status: 'generating' });

    let markdown = '';
    markdown = await generateBlogPostStream(
      transcript,
      { tone, imageCount, imageSource, contentLength, useWebSearch, customSystemPrompt, prevMarkdown },
      (chunk) => {
        if (clientGone) return;
        sseWrite(res, 'blog_chunk', { text: chunk });
      },
    );

    if (clientGone) return res.end();
    sseWrite(res, 'progress', { phase: 'blog', status: 'done' });

    // 생성 이력 저장
    const { data: generation, error: genError } = await supabase
      .from('generations')
      .insert({
        user_id: req.user.id,
        transcript,
        content_markdown: markdown,
        tone,
        image_count: imageCount,
        image_source: imageSource,
      })
      .select()
      .single();

    if (genError) throw genError;

    // 월별 사용량 업데이트
    await supabase
      .from('user_plans')
      .upsert({ user_id: req.user.id, generations_used: (plan?.generations_used || 0) + 1 });

    // ── 크레딧 차감 ──────────────────────────────────────
    const { ok, balance: newBalance } = await deductCredits(
      req.user.id,
      creditCost,
      useWebSearch ? 'blog_generate+web_search' : 'blog_generate',
    );

    // 해시태그 생성
    const rawHashtags = await generateHashtags(markdown);
    const hashtags = {
      naver: rawHashtags.naver || [],
      instagram: (rawHashtags.instagram || []).slice(0, 5),
    };

    // Phase 2: 이미지 생성
    let uploadedImages = [];
    if (imageCount > 0) {
      sseWrite(res, 'progress', { phase: 'image', status: 'generating', current: 0, total: imageCount });

      let rawImages = [];
      if (imageSource === 'dalle') {
        rawImages = await generateImages(markdown, imageCount);
      } else {
        rawImages = await searchImages(markdown, imageCount);
      }

      for (const img of rawImages) {
        if (clientGone) break;
        if (!img.url) { uploadedImages.push(img); continue; }

        try {
          let buffer;
          const storagePath = `generations/${req.user.id}/${generation.id}/${img.index}.jpg`;

          if (img.url.startsWith('data:')) {
            buffer = base64ToBuffer(img.url);
          } else {
            const response = await fetch(img.url);
            buffer = await response.buffer();
          }

          const { error: uploadError } = await supabase.storage
            .from('blog-images')
            .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from('blog-images')
            .getPublicUrl(storagePath);

          const permanentUrl = publicUrlData.publicUrl;
          const uploaded = { ...img, storagePath, permanentUrl, url: permanentUrl };
          uploadedImages.push(uploaded);

          sseWrite(res, 'progress', {
            phase: 'image', status: 'progress',
            current: uploadedImages.length, total: imageCount,
            url: permanentUrl, index: img.index,
          });
        } catch (err) {
          console.error(`이미지 ${img.index} 업로드 오류:`, err.message);
          uploadedImages.push(img);
          sseWrite(res, 'progress', {
            phase: 'image', status: 'progress',
            current: uploadedImages.length, total: imageCount,
          });
        }
      }

      await supabase
        .from('generations')
        .update({ storage_path: `generations/${req.user.id}/${generation.id}` })
        .eq('id', generation.id)
        .eq('user_id', req.user.id);
    }

    // 완료
    sseWrite(res, 'done', {
      generationId: generation.id,
      markdown,
      hashtags,
      images: uploadedImages,
      credits: ok ? newBalance : balance,
    });

    res.end();
  } catch (err) {
    console.error('[SSE /blog error]', err);
    if (!clientGone) sseWrite(res, 'error', { error: err.message || '서버 오류가 발생했습니다.' });
    res.end();
  }
});

// POST /api/generate/style
router.post('/style', authMiddleware, async (req, res, next) => {
  let { exampleText } = req.body;
  if (!exampleText || exampleText.trim().length < 50) {
    return res.status(400).json({ error: '예시 글이 너무 짧습니다. 50자 이상 입력해주세요.' });
  }
  try {
    const { data: existing, error: countError } = await supabase
      .from('user_styles').select('id').eq('user_id', req.user.id);
    if (countError) throw countError;
    if (existing && existing.length >= 4) {
      return res.status(400).json({ error: '커스텀 스타일은 최대 4개까지 만들 수 있습니다.' });
    }
    exampleText = exampleText.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000);
    const { name, description, systemPrompt } = await analyzeStyle(exampleText);
    const { data: style, error } = await supabase
      .from('user_styles')
      .insert({ user_id: req.user.id, name, description, system_prompt: systemPrompt })
      .select().single();
    if (error) throw error;
    res.json({ style });
  } catch (err) { next(err); }
});

// DELETE /api/generate/style/:id
router.delete('/style/:id', authMiddleware, async (req, res, next) => {
  try {
    const { error } = await supabase.from('user_styles').delete()
      .eq('id', req.params.id).eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
});

// GET /api/generate/styles
router.get('/styles', authMiddleware, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from('user_styles').select('*')
      .eq('user_id', req.user.id).order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ styles: data || [] });
  } catch (err) { next(err); }
});

module.exports = router;
