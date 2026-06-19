// routes/adminRouter.js
const express = require('express');
const { authMiddleware, supabase } = require('../middleware/auth');
const { chargeCredits } = require('../middleware/credits');

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
    // credit_transactions 집계
    const { data: txData, error: txError } = await supabase
      .from('credit_transactions')
      .select('user_id, delta');
    if (txError) throw txError;

    // user_plans
    const { data: plans, error: planError } = await supabase
      .from('user_plans')
      .select('user_id, plan, generations_used, generations_limit');
    if (planError) throw planError;

    // auth.users — RPC로 조회
    const { data: usersData, error: usersError } = await supabase
      .rpc('get_all_users_admin');
    if (usersError) throw usersError;

    // 트랜잭션 집계 맵
    const txMap = {};
    for (const row of txData || []) {
      if (!txMap[row.user_id]) txMap[row.user_id] = { charged: 0, used: 0 };
      if (row.delta > 0) txMap[row.user_id].charged += row.delta;
      else txMap[row.user_id].used += Math.abs(row.delta);
    }

    const planMap = Object.fromEntries((plans || []).map(p => [p.user_id, p]));

    const users = (usersData || []).map(u => ({
      user_id:           u.user_id,
      email:             u.email,
      created_at:        u.created_at,
      credits:           (txMap[u.user_id]?.charged || 0) - (txMap[u.user_id]?.used || 0),
      total_charged:     txMap[u.user_id]?.charged || 0,
      total_credits_used: txMap[u.user_id]?.used || 0,
      plan:              planMap[u.user_id]?.plan ?? 'free',
      generations_used:  planMap[u.user_id]?.generations_used ?? 0,
      generations_limit: planMap[u.user_id]?.generations_limit ?? 30,
    }));

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/grant-credits
router.post('/grant-credits', authMiddleware, adminOnly, async (req, res, next) => {
  const { userId, amount } = req.body;
  if (!userId || !amount || amount < 1) {
    return res.status(400).json({ error: 'userId와 크레딧 수량이 필요합니다.' });
  }

  try {
    const { balance: newBalance } = await chargeCredits(
      userId,
      Number(amount),
      `admin_grant:${req.user.email}`
    );
    res.json({ newCredits: newBalance });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:userId — 플랜 수정
router.patch('/users/:userId', authMiddleware, adminOnly, async (req, res, next) => {
  const { userId } = req.params;
  const { plan, credits } = req.body;

  try {
    if (plan !== undefined) {
      const { error } = await supabase
        .from('user_plans')
        .update({ plan })
        .eq('user_id', userId);
      if (error) throw error;
    }

    // 크레딧 직접 수정 — 현재 잔량과의 차이를 트랜잭션으로 기록
    if (credits !== undefined) {
      const { data: txData } = await supabase
        .from('credit_transactions')
        .select('delta')
        .eq('user_id', userId);

      const currentBalance = (txData || []).reduce((s, r) => s + r.delta, 0);
      const delta = Number(credits) - currentBalance;

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
