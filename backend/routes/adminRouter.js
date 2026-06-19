// routes/adminRouter.js
const express = require('express');
const { authMiddleware, supabase } = require('../middleware/auth');

const router = express.Router();
const OWNER_EMAIL = 'drbalance@naver.com';

function adminOnly(req, res, next) {
  if (req.user.email !== OWNER_EMAIL) {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
}

// GET /api/admin/users
router.get('/users', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const userIds = authUsers.users.map(u => u.id);

    const { data: credits } = await supabase
      .from('user_credits')
      .select('user_id, credits, total_used')
      .in('user_id', userIds);

    const { data: plans } = await supabase
      .from('user_plans')
      .select('user_id, plan, generations_used, generations_limit')
      .in('user_id', userIds);

    const creditMap = Object.fromEntries((credits || []).map(c => [c.user_id, c]));
    const planMap   = Object.fromEntries((plans   || []).map(p => [p.user_id, p]));

    const users = authUsers.users.map(u => ({
      user_id:            u.id,
      email:              u.email,
      created_at:         u.created_at,
      credits:            creditMap[u.id]?.credits ?? 0,
      total_credits_used: creditMap[u.id]?.total_used ?? 0,
      plan:               planMap[u.id]?.plan ?? 'free',
      generations_used:   planMap[u.id]?.generations_used ?? 0,
      generations_limit:  planMap[u.id]?.generations_limit ?? 30,
    }));

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/grant-credits  — userId로 직접 지급
router.post('/grant-credits', authMiddleware, adminOnly, async (req, res, next) => {
  const { userId, amount } = req.body;

  if (!userId || !amount || amount < 1) {
    return res.status(400).json({ error: 'userId와 크레딧 수량이 필요합니다.' });
  }

  try {
    const { data: existing } = await supabase
      .from('user_credits')
      .select('credits, total_used')
      .eq('user_id', userId)
      .single();

    const currentCredits = existing?.credits ?? 0;
    const newCredits = currentCredits + Number(amount);

    const { error: upsertError } = await supabase
      .from('user_credits')
      .upsert({
        user_id:    userId,
        credits:    newCredits,
        total_used: existing?.total_used ?? 0,
        updated_at: new Date().toISOString(),
      });

    if (upsertError) throw upsertError;

    await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        delta:   Number(amount),
        reason:  `admin_grant:${req.user.email}`,
        balance: newCredits,
      });

    res.json({ newCredits });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:userId — 플랜/크레딧 수정
router.patch('/users/:userId', authMiddleware, adminOnly, async (req, res, next) => {
  const { userId } = req.params;
  const { plan, credits } = req.body;

  try {
    // 플랜 수정 — UPDATE만 (기존 행 보존)
    if (plan !== undefined) {
      const { error } = await supabase
        .from('user_plans')
        .update({ plan })
        .eq('user_id', userId);
      if (error) throw error;
    }

    // 크레딧 수정 — user_credits 테이블
    if (credits !== undefined) {
      const { data: existing } = await supabase
        .from('user_credits')
        .select('credits, total_used')
        .eq('user_id', userId)
        .single();

      const delta = Number(credits) - (existing?.credits ?? 0);

      const { error: creditError } = await supabase
        .from('user_credits')
        .upsert({
          user_id:    userId,
          credits:    Number(credits),
          total_used: existing?.total_used ?? 0,
          updated_at: new Date().toISOString(),
        });

      if (creditError) throw creditError;

      if (delta !== 0) {
        await supabase
          .from('credit_transactions')
          .insert({
            user_id: userId,
            delta,
            reason:  `admin_edit:${req.user.email}`,
            balance: Number(credits),
          });
      }
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
