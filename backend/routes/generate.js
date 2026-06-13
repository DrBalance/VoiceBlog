const express = require('express');
const { authMiddleware, supabase } = require('../middleware/auth');
const { generateBlogPost, generateHashtags, analyzeStyle } = require('../services/claude');

const router = express.Router();

// POST /api/generate/blog
router.post('/blog', authMiddleware, async (req, res, next) => {
  const { transcript, tone = 'informative', imageCount = 3, imageSource = 'dalle', customStyleId, contentLength = 'normal', useWebSearch = false } = req.body;

  if (!transcript || transcript.trim().length < 10) {
    return res.status(400).json({ error: '글감 텍스트가 너무 짧습니다.' });
  }

  try {
    // 플랜 체크
    const { data: plan, error: planError } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (plan && plan.generations_used >= plan.generations_limit) {
      return res.status(403).json({
        error: '이번 달 생성 한도를 초과했습니다.',
        plan: plan.plan,
        limit: plan.generations_limit,
      });
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

    // 블로그 생성 + 해시태그 병렬 생성
    const [markdown, hashtags] = await Promise.all([
      generateBlogPost(transcript, { tone, imageCount, imageSource, contentLength, useWebSearch, customSystemPrompt }),
      generateHashtags(transcript),
    ]);

    // 생성 이력 저장
    const { data: generation, error } = await supabase
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

    if (error) throw error;

    // 사용량 업데이트
    await supabase
      .from('user_plans')
      .upsert({
        user_id: req.user.id,
        generations_used: (plan?.generations_used || 0) + 1,
      });

    res.json({
      generationId: generation.id,
      markdown,
      hashtags,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/generate/style — 커스텀 스타일 분석 및 저장
router.post('/style', authMiddleware, async (req, res, next) => {
  let { exampleText } = req.body;

  if (!exampleText || exampleText.trim().length < 50) {
    return res.status(400).json({ error: '예시 글이 너무 짧습니다. 50자 이상 입력해주세요.' });
  }

  try {
    // 기존 스타일 수 확인 (최대 4개)
    const { data: existing, error: countError } = await supabase
      .from('user_styles')
      .select('id')
      .eq('user_id', req.user.id);

    if (countError) throw countError;

    if (existing && existing.length >= 4) {
      return res.status(400).json({ error: '커스텀 스타일은 최대 4개까지 만들 수 있습니다. 기존 스타일을 삭제 후 다시 시도해주세요.' });
    }

    // HTML 태그 제거 및 공백 정리
    exampleText = exampleText
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 1000);

    // Claude로 스타일 분석
    const { name, description, systemPrompt } = await analyzeStyle(exampleText);

    // Supabase 저장
    const { data: style, error } = await supabase
      .from('user_styles')
      .insert({ user_id: req.user.id, name, description, system_prompt: systemPrompt })
      .select()
      .single();

    if (error) throw error;

    res.json({ style });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/generate/style/:id — 커스텀 스타일 삭제
router.delete('/style/:id', authMiddleware, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('user_styles')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/generate/styles — 커스텀 스타일 목록 조회
router.get('/styles', authMiddleware, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('user_styles')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ styles: data || [] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
