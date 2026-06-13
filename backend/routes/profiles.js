const express = require('express');
const { authMiddleware, supabase } = require('../middleware/auth');

const router = express.Router();

// ─── 프로필 ───────────────────────────────────────────

// GET /api/profiles — 목록 조회
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        hashtag_groups (*),
        blog_signatures (*)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ profiles: data || [] });
  } catch (err) {
    next(err);
  }
});

// POST /api/profiles — 생성
router.post('/', authMiddleware, async (req, res, next) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '프로필 이름을 입력해주세요.' });
  }

  try {
    // 무료 플랜 3개 제한 체크
    const { data: plan } = await supabase
      .from('user_plans')
      .select('plan')
      .eq('user_id', req.user.id)
      .single();

    const isPro = plan?.plan === 'pro';

    if (!isPro) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', req.user.id);

      if (existing && existing.length >= 3) {
        return res.status(400).json({
          error: '무료 플랜은 프로필을 3개까지 만들 수 있습니다. 유료 플랜으로 업그레이드하세요.',
        });
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert({ user_id: req.user.id, name: name.trim() })
      .select()
      .single();

    if (error) throw error;
    res.json({ profile: data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/profiles/:id — 이름 수정
router.patch('/:id', authMiddleware, async (req, res, next) => {
  const { name } = req.body;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ name: name.trim() })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ profile: data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/profiles/:id — 삭제 (종속 데이터 cascade)
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── 해시태그 그룹 ────────────────────────────────────

// POST /api/profiles/:id/hashtag-groups
router.post('/:id/hashtag-groups', authMiddleware, async (req, res, next) => {
  const { name, naverTags, instagramTags } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '그룹 이름을 입력해주세요.' });
  }

  try {
    const { data, error } = await supabase
      .from('hashtag_groups')
      .insert({
        profile_id: req.params.id,
        name: name.trim(),
        naver_tags: naverTags || [],
        instagram_tags: instagramTags || [],
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ group: data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/profiles/hashtag-groups/:groupId
router.patch('/hashtag-groups/:groupId', authMiddleware, async (req, res, next) => {
  const { name, naverTags, instagramTags } = req.body;
  try {
    const { data, error } = await supabase
      .from('hashtag_groups')
      .update({
        name: name?.trim(),
        naver_tags: naverTags,
        instagram_tags: instagramTags,
      })
      .eq('id', req.params.groupId)
      .select()
      .single();

    if (error) throw error;
    res.json({ group: data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/profiles/hashtag-groups/:groupId
router.delete('/hashtag-groups/:groupId', authMiddleware, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('hashtag_groups')
      .delete()
      .eq('id', req.params.groupId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── 블로그 서명 ──────────────────────────────────────

// POST /api/profiles/:id/signatures
router.post('/:id/signatures', authMiddleware, async (req, res, next) => {
  const { name, htmlContent } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '서명 이름을 입력해주세요.' });
  }

  try {
    const { data, error } = await supabase
      .from('blog_signatures')
      .insert({
        profile_id: req.params.id,
        name: name.trim(),
        html_content: htmlContent || '',
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ signature: data });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/profiles/signatures/:sigId
router.patch('/signatures/:sigId', authMiddleware, async (req, res, next) => {
  const { name, htmlContent } = req.body;
  try {
    const { data, error } = await supabase
      .from('blog_signatures')
      .update({ name: name?.trim(), html_content: htmlContent })
      .eq('id', req.params.sigId)
      .select()
      .single();

    if (error) throw error;
    res.json({ signature: data });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/profiles/signatures/:sigId
router.delete('/signatures/:sigId', authMiddleware, async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('blog_signatures')
      .delete()
      .eq('id', req.params.sigId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
