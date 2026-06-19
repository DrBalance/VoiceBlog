// routes/images.js  (이미지 1장당 1 크레딧 차감 버전)
const express = require('express');
const fetch = require('node-fetch');
const { authMiddleware, supabase } = require('../middleware/auth');
const { generateImages } = require('../services/dalle');
const { searchImages } = require('../services/unsplash');
const { deductCredits, getBalance } = require('../middleware/credits');

const router = express.Router();

function base64ToBuffer(dataUrl) {
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64, 'base64');
}

// POST /api/generate/images
router.post('/images', authMiddleware, async (req, res, next) => {
  const { generationId, markdown, imageCount = 3, imageSource = 'dalle' } = req.body;

  if (!generationId || !markdown) {
    return res.status(400).json({ error: 'generationId와 markdown이 필요합니다.' });
  }

  const safeCount = Math.min(Math.max(parseInt(imageCount) || 3, 1), 10);

  try {
    // ── 크레딧 사전 확인 (이미지 수만큼) ────────────────────
    const balance = await getBalance(req.user.id);
    if (balance < safeCount) {
      return res.status(402).json({
        error: `크레딧이 부족합니다. (필요: ${safeCount}장 × 1크레딧, 잔여: ${balance})`,
        code: 'INSUFFICIENT_CREDITS',
        balance,
        required: safeCount,
      });
    }

    // ── 이미지 생성 ──────────────────────────────────────────
    let images = [];
    if (imageSource === 'dalle') {
      images = await generateImages(markdown, safeCount);
    } else {
      images = await searchImages(markdown, safeCount);
    }

    // ── Storage 업로드 ───────────────────────────────────────
    const uploadedImages = await Promise.all(
      images.map(async (img) => {
        if (!img.url) return img;
        try {
          let buffer;
          const storagePath = `generations/${req.user.id}/${generationId}/${img.index}.jpg`;

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

          const { data: publicUrl } = supabase.storage
            .from('blog-images')
            .getPublicUrl(storagePath);

          return { ...img, storagePath, permanentUrl: publicUrl.publicUrl, url: publicUrl.publicUrl };
        } catch (err) {
          console.error(`이미지 ${img.index} 업로드 오류:`, err.message);
          return img;
        }
      })
    );

    // ── 성공한 이미지 수만큼 크레딧 차감 ───────────────────
    const successCount = uploadedImages.filter(img => img.url).length;
    let newBalance = balance;

    if (successCount > 0) {
      const { ok, balance: b } = await deductCredits(
        req.user.id,
        successCount,
        `image_generate:${imageSource}:${successCount}장`,
      );
      if (ok) newBalance = b;
    }

    // DB 업데이트
    const storagePath = `generations/${req.user.id}/${generationId}`;
    await supabase
      .from('generations')
      .update({ storage_path: storagePath })
      .eq('id', generationId)
      .eq('user_id', req.user.id);

    res.json({
      images: uploadedImages,
      credits: newBalance,   // 프론트엔드 즉시 갱신용
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
