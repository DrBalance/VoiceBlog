const express = require('express');
const fetch = require('node-fetch');
const { authMiddleware, supabase } = require('../middleware/auth');
const { generateImages } = require('../services/dalle');
const { searchImages } = require('../services/unsplash');

const router = express.Router();

// base64 data URL → Buffer 변환
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

  try {
    let images = [];

    if (imageSource === 'dalle') {
      images = await generateImages(markdown, imageCount);
    } else {
      images = await searchImages(markdown, imageCount);
    }

    // 이미지를 Supabase Storage에 업로드
    const uploadedImages = await Promise.all(
      images.map(async (img) => {
        if (!img.url) return img;

        try {
          let buffer;
          const storagePath = `generations/${req.user.id}/${generationId}/${img.index}.jpg`;

          // base64 data URL인 경우 직접 변환
          if (img.url.startsWith('data:')) {
            buffer = base64ToBuffer(img.url);
          } else {
            // 외부 URL인 경우 fetch로 다운로드
            const response = await fetch(img.url);
            buffer = await response.buffer();
          }

          const { error: uploadError } = await supabase.storage
            .from('blog-images')
            .upload(storagePath, buffer, {
              contentType: 'image/jpeg',
              upsert: true,
            });

          if (uploadError) throw uploadError;

          const { data: publicUrl } = supabase.storage
            .from('blog-images')
            .getPublicUrl(storagePath);

          return {
            ...img,
            storagePath,
            permanentUrl: publicUrl.publicUrl,
            url: publicUrl.publicUrl, // URL도 영구 URL로 교체
          };
        } catch (err) {
          console.error(`이미지 ${img.index} 업로드 오류:`, err.message);
          return img;
        }
      })
    );

    // DB에 storage_path 업데이트
    const storagePath = `generations/${req.user.id}/${generationId}`;
    await supabase
      .from('generations')
      .update({ storage_path: storagePath })
      .eq('id', generationId)
      .eq('user_id', req.user.id);

    res.json({ images: uploadedImages });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
