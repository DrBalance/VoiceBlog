const express = require('express');
const OpenAI = require('openai');
const multer = require('multer');
const { Readable } = require('stream');
const { authMiddleware, supabase } = require('../middleware/auth');

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// multer: 참고이미지 메모리 저장 (최대 10MB)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// 허용된 이메일 목록
const ALLOWED_EMAILS = [
  'drbalance@naver.com',
];

function privateOnly(req, res, next) {
  if (!ALLOWED_EMAILS.includes(req.user.email)) {
    return res.status(403).json({ error: '접근 권한이 없습니다.' });
  }
  next();
}

// Buffer → File 객체 변환 (OpenAI SDK용)
function bufferToFile(buffer, filename, mimeType) {
  const blob = new Blob([buffer], { type: mimeType });
  return new File([blob], filename, { type: mimeType });
}

// POST /api/imagegen/generate
// multipart/form-data: { prompt, count, size, quality, refImage? }
router.post(
  '/generate',
  authMiddleware,
  privateOnly,
  upload.single('refImage'),
  async (req, res, next) => {
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
    const hasRefImage = !!req.file;

    try {
      const results = [];

      for (let i = 0; i < safeCount; i++) {
        let b64;

        if (hasRefImage) {
          // 참고이미지 있음 → images.edit 사용 (스타일 참조)
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
          // 참고이미지 없음 → images.generate 사용
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

        const { error: uploadError } = await supabase.storage
          .from('blog-images')
          .upload(storagePath, buffer, { contentType: 'image/png', upsert: true });

        if (uploadError) {
          console.error(`이미지 ${i + 1} 업로드 오류:`, uploadError.message);
          results.push({ index: i + 1, url: `data:image/png;base64,${b64}` });
          continue;
        }

        const { data: publicUrl } = supabase.storage
          .from('blog-images')
          .getPublicUrl(storagePath);

        results.push({ index: i + 1, url: publicUrl.publicUrl, storagePath });
      }

      res.json({ images: results });
    } catch (err) {
      console.error('[ImageGen] 이미지 생성 오류:', err.message);
      next(err);
    }
  }
);

module.exports = router;
