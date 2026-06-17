const express = require('express');
const OpenAI = require('openai');
const multer = require('multer');
const sharp = require('sharp');
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

// 밝은 배경(흰색/회색 격자) → 투명으로 변환
async function removeBackground(inputBuffer, threshold = 240) {
  const image = sharp(inputBuffer).ensureAlpha();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let i = 0; i < width * height; i++) {
    const r = data[i * channels];
    const g = data[i * channels + 1];
    const b = data[i * channels + 2];
    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i * channels + 3] = 0;
    }
  }

  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
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

        const rawBuffer = Buffer.from(b64, 'base64');
        const buffer = await removeBackground(rawBuffer);
        const timestamp = Date.now();
        const storagePath = `imagegen/${req.user.id}/${timestamp}_${i + 1}.png`;

        const { error: uploadError } = await supabase.storage
          .from('blog-images')
          .upload(storagePath, buffer, { contentType: 'image/png', upsert: true });

        if (uploadError) {
          console.error(`이미지 ${i + 1} 업로드 오류:`, uploadError.message);
          results.push({ index: i + 1, url: `data:image/png;base64,${b64}` });
          continue;
        }

        const { data: publicUrlData } = supabase.storage
          .from('blog-images')
          .getPublicUrl(storagePath);

        const publicUrl = publicUrlData.publicUrl;

        // DB에 이력 저장
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

        results.push({ index: i + 1, url: publicUrl, storagePath });
      }

      res.json({ images: results });
    } catch (err) {
      console.error('[ImageGen] 이미지 생성 오류:', err.message);
      next(err);
    }
  }
);

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
