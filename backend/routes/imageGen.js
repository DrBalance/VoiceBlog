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

// gpt-image-2로 생성된 이미지의 배경을 GPT-4o image edit으로 제거
async function removeBgWithGPT(imageBuffer) {
  const imageFile = bufferToFile(imageBuffer, 'image.png', 'image/png');
  const response = await openai.images.edit({
    model: 'gpt-image-2',
    image: imageFile,
    prompt: 'Remove the background completely. Make the background fully transparent. Keep only the illustration character and text elements. Output as PNG with transparent background.',
    n: 1,
    size: '1024x1024',
    quality: 'medium',
  });
  return Buffer.from(response.data[0].b64_json, 'base64');
}

// Supabase Storage에 업로드 후 URL 반환
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

        // ① 이미지 생성
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

        const originalBuffer = Buffer.from(b64, 'base64');
        const timestamp = Date.now();

        // ② 원본 업로드
        const originalPath = `imagegen/${req.user.id}/${timestamp}_${i + 1}_original.png`;
        const originalUrl = await uploadToStorage(originalBuffer, originalPath);

        // ③ 배경 제거본 생성 및 업로드
        let noBgUrl = null;
        let noBgPath = null;
        try {
          const noBgBuffer = await removeBgWithGPT(originalBuffer);
          noBgPath = `imagegen/${req.user.id}/${timestamp}_${i + 1}_nobg.png`;
          noBgUrl = await uploadToStorage(noBgBuffer, noBgPath);
        } catch (bgErr) {
          console.error(`배경 제거 오류 (이미지 ${i + 1}):`, bgErr.message);
        }

        // ④ DB 저장
        await supabase.from('imagegen_history').insert({
          user_id: req.user.id,
          storage_path: originalPath,
          public_url: originalUrl,
          nobg_storage_path: noBgPath,
          nobg_url: noBgUrl,
          scene: scene || '',
          kor_text: korText || '',
          size,
          quality,
          has_ref_image: hasRefImage,
          created_at: new Date().toISOString(),
        });

        results.push({
          index: i + 1,
          url: originalUrl,
          noBgUrl,
        });
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
      .select('storage_path, nobg_storage_path')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    const paths = [item?.storage_path, item?.nobg_storage_path].filter(Boolean);
    if (paths.length) await supabase.storage.from('blog-images').remove(paths);

    await supabase.from('imagegen_history').delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
