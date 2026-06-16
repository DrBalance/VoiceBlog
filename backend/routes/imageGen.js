const express = require('express');
const OpenAI = require('openai');
const { authMiddleware, supabase } = require('../middleware/auth');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 허용된 이메일 목록 (본인 이메일만 추가)
const ALLOWED_EMAILS = [
  'drbalance@naver.com',
];

// 내부 전용 접근 제한 미들웨어
function privateOnly(req, res, next) {
  if (!ALLOWED_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }
  next();
}

// POST /api/imagegen/generate
// body: { prompt, count, size, quality }
router.post('/generate', authMiddleware, privateOnly, async (req, res, next) => {
  const {
    prompt,
    count   = 1,
    size    = '1024x1024',
    quality = 'medium',
  } = req.body;

  if (!prompt || prompt.trim().length === 0) {
    return res.status(400).json({ error: 'prompt가 필요합니다.' });
  }

  const safeCount = Math.min(Math.max(parseInt(count) || 1, 1), 4);

  try {
    const results = [];

    for (let i = 0; i < safeCount; i++) {
      const response = await openai.images.generate({
        model: 'gpt-image-1',
        prompt: prompt.trim(),
        n: 1,
        size,
        quality,
      });

      const b64 = response.data[0].b64_json;
      const buffer = Buffer.from(b64, 'base64');
      const timestamp = Date.now();
      const storagePath = `imagegen/${req.user.id}/${timestamp}_${i + 1}.png`;

      // Supabase Storage에 업로드
      const { error: uploadError } = await supabase.storage
        .from('blog-images') // 기존 버킷 재사용
        .upload(storagePath, buffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (uploadError) {
        console.error(`이미지 ${i + 1} 업로드 오류:`, uploadError.message);
        // 업로드 실패해도 base64로 반환
        results.push({
          index: i + 1,
          url: `data:image/png;base64,${b64}`,
        });
        continue;
      }

      const { data: publicUrl } = supabase.storage
        .from('blog-images')
        .getPublicUrl(storagePath);

      results.push({
        index: i + 1,
        url: publicUrl.publicUrl,
        storagePath,
      });
    }

    res.json({ images: results });
  } catch (err) {
    console.error('[ImageGen] 이미지 생성 오류:', err.message);
    next(err);
  }
});

module.exports = router;
