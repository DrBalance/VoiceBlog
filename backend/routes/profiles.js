const express = require('express');
const { authMiddleware, supabase } = require('../middleware/auth');

const router = express.Router();

// ─── 크레딧 조회 ──────────────────────────────────────

// GET /api/profiles/plan — 내 플랜 + 크레딧 조회
router.get('/plan', authMiddleware, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('user_plans')
      .select('plan, credits, total_credits_used, generations_used, generations_limit')
      .eq('user_id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    res.json({
      plan: data?.plan || 'free',
      credits: data?.credits ?? 10,
      totalCreditsUsed: data?.total_credits_used ?? 0,
      generationsUsed: data?.generations_used ?? 0,
      generationsLimit: data?.generations_limit ?? 30,
    });
  } catch (err) {
    next(err);
  }
});

// ─── 관리자 API ───────────────────────────────────────

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'drbalance@naver.com';

function adminOnly(req, res, next) {
  if (req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: '관리자 전용 기능입니다.' });
  }
  next();
}

// GET /api/profiles/admin/users — 전체 유저 목록
router.get('/admin/users', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { data: plans, error } = await supabase
      .from('user_plans')
      .select('user_id, plan, credits, total_credits_used, generations_used, generations_limit');

    if (error) throw error;

    // 유저 이메일 조회 (service role 필요)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const emailMap = {};
    users.forEach(u => { emailMap[u.id] = u.email; });

    const result = (plans || []).map(p => ({
      ...p,
      email: emailMap[p.user_id] || '(알 수 없음)',
    }));

    res.json({ users: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/profiles/admin/credits — 크레딧 부여
router.post('/admin/credits', authMiddleware, adminOnly, async (req, res, next) => {
  const { email, amount } = req.body;
  if (!email || !amount || isNaN(amount)) {
    return res.status(400).json({ error: 'email과 amount가 필요합니다.' });
  }

  try {
    // 이메일로 user_id 찾기
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    if (usersError) throw usersError;

    const target = users.find(u => u.email === email);
    if (!target) return res.status(404).json({ error: '해당 이메일의 유저를 찾을 수 없습니다.' });

    const { error } = await supabase
      .from('user_plans')
      .upsert({
        user_id: target.id,
        credits: supabase.rpc ? undefined : amount, // upsert fallback
      });

    // upsert 방식 대신 직접 업데이트
    const { data: current } = await supabase
      .from('user_plans')
      .select('credits')
      .eq('user_id', target.id)
      .single();

    const newCredits = (current?.credits ?? 0) + Number(amount);

    const { error: updateError } = await supabase
      .from('user_plans')
      .upsert({ user_id: target.id, credits: newCredits });

    if (updateError) throw updateError;

    res.json({ success: true, email, newCredits });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/profiles/admin/users/:userId — 플랜 변경
router.patch('/admin/users/:userId', authMiddleware, adminOnly, async (req, res, next) => {
  const { plan, credits, generationsLimit } = req.body;
  try {
    const update = {};
    if (plan !== undefined) update.plan = plan;
    if (credits !== undefined) update.credits = credits;
    if (generationsLimit !== undefined) update.generations_limit = generationsLimit;

    const { data, error } = await supabase
      .from('user_plans')
      .upsert({ user_id: req.params.userId, ...update })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

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
