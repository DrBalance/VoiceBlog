const express = require('express');
const { authMiddleware, supabase } = require('../middleware/auth');

const router = express.Router();

// GET /api/generations
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('generations')
      .select('id, transcript, tone, image_count, image_source, storage_path, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ generations: data });
  } catch (err) {
    next(err);
  }
});

// GET /api/generations/:id
router.get('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('generations')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: '찾을 수 없습니다.' });
    }

    // 이미지 목록 조회
    const { data: files } = await supabase.storage
      .from('blog-images')
      .list(`generations/${req.user.id}/${req.params.id}`);

    const images = files
      ? files.map((file) => ({
          name: file.name,
          url: supabase.storage
            .from('blog-images')
            .getPublicUrl(`generations/${req.user.id}/${req.params.id}/${file.name}`)
            .data.publicUrl,
        }))
      : [];

    res.json({ generation: data, images });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
