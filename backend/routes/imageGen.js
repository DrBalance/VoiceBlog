const express = require('express');
const OpenAI = require('openai');
const multer = require('multer');
const { authMiddleware, supabase } = require('../middleware/auth');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const ALLOWED_EMAILS = ['drbalance@naver.com'];

function privateOnly(req, res, next) {
  if (!ALLOWED_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }
  next();
}

function bufferToFile(buffer, filename, mimeType) {
  const blob = new Blob([buffer], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

async function uploadToStorage(buffer, storagePath) {
  const { error } = await supabase.storage
    .from('blog-images')
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('blog-images').getPublicUrl(storagePath);
  return data.publicUrl;
}

// ── POST /api/imagegen/generate ──────────────────────────────
router.post(
  '/generate',
  authMiddleware,
  privateOnly,
  upload.single('refImage'),
  async (req, res, next) => {
    const { prompt, count = 1, size = '1024x1024', quality = 'medium', scene, korText } = req.body;

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'prompt가 필요합니다.' });
    }

    const safeCount = Math.min(Math.max(parseInt(count) || 1, 1), 4);
    const hasRefImage = !!req.file;

    try {
      const results = [];

      for (let i = 0; i < safeCount; i++) {
        let b64;

        if (hasRefImage) {
          const refFile = bufferToFile(req.file.buffer, req.file.originalname, req.file.mimetype);
          const response = await openai.images.edit({
            model: 'gpt-image-2',
            image: refFile,
            prompt: prompt.trim(),
            n: 1,
            size,
            quality,
          });
          b64 = response.data[0].b64_json;
        } else {
          const response = await openai.images.generate({
            model: 'gpt-image-2',
            prompt: prompt.trim(),
            n: 1,
            size,
            quality,
          });
          b64 = response.data[0].b64_json;
        }

        const buffer = Buffer.from(b64, 'base64');
        const timestamp = Date.now();
        const storagePath = `imagegen/${req.user.id}/${timestamp}_${i + 1}.png`;
        const publicUrl = await uploadToStorage(buffer, storagePath);

        await supabase.from('imagegen_history').insert({
          user_id: req.user.id,
          storage_path: storagePath,
          public_url: publicUrl,
          scene: scene || '',
          kor_text: korText || '',
          size,
          quality,
          has_ref_image: hasRefImage,
          created_at: new Date().toISOString(),
        });

        results.push({ index: i + 1, url: publicUrl });
      }

      res.json({ images: results });
    } catch (err) {
      console.error('[ImageGen] 이미지 생성 오류:', err.message);
      next(err);
    }
  }
);

// ── POST /api/imagegen/hashtags ──────────────────────────────
router.post('/hashtags', authMiddleware, privateOnly, async (req, res, next) => {
  const { scene, korText } = req.body;

  if (!scene) return res.status(400).json({ error: 'scene이 필요합니다.' });

  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `다음 한의원 카드뉴스 콘텐츠에 맞는 인스타그램 해시태그를 생성해주세요.

장면 설명: ${scene}
${korText ? `이미지 텍스트: ${korText}` : ''}

규칙:
- 총 5개 생성
- 첫 번째는 반드시 #테이프침 (고정)
- 나머지 4개는 콘텐츠에 맞는 한국어 해시태그
- 너무 일반적인 태그(#건강 #운동 등)보다 구체적이고 타겟이 명확한 태그
- 한의원/테이프침/Dr.Balance 브랜드 맥락에 맞게
- JSON 배열로만 응답: ["#테이프침", "#태그2", "#태그3", "#태그4", "#태그5"]`
      }]
    });

    const text = message.content[0].text.trim();
    const hashtags = JSON.parse(text);
    res.json({ hashtags });
  } catch (err) {
    console.error('[ImageGen] 해시태그 생성 오류:', err.message);
    // 실패해도 기본값 반환
    res.json({ hashtags: ['#테이프침', '#한의원', '#Dr_Balance', '#붓기', '#통증'] });
  }
});

// ── GET /api/imagegen/history ─────────────────────────────────
router.get('/history', authMiddleware, privateOnly, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('imagegen_history')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    res.json({ history: data });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/imagegen/history/:id ─────────────────────────
router.delete('/history/:id', authMiddleware, privateOnly, async (req, res, next) => {
  try {
    const { data: item } = await supabase
      .from('imagegen_history')
      .select('storage_path')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (item?.storage_path) {
      await supabase.storage.from('blog-images').remove([item.storage_path]);
    }

    await supabase.from('imagegen_history').delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
