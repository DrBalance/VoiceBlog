// routes/adminRouter.js
// 관리자 전용 라우터 — OWNER_EMAIL만 접근 가능

const express = require('express');
const { authMiddleware, supabase } = require('../middleware/auth');

const router = express.Router();
const OWNER_EMAIL = 'drbalance@naver.com';

// ── 관리자 권한 체크 미들웨어 ─────────────────────────────
function adminOnly(req, res, next) {
  if (req.user.email !== OWNER_EMAIL) {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
}

// ── GET /api/admin/users ──────────────────────────────────
// 모든 유저 목록 + 크레딧 + 플랜 정보
router.get('/users', authMiddleware, adminOnly, async (req, res, next) => {
  try {
    // auth.users는 service role로만 조회 가능
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    const userIds = authUsers.users.map(u => u.id);

    // 크레딧 조회
    const { data: credits } = await supabase
      .from('user_credits')
      .select('user_id, credits, total_used')
      .in('user_id', userIds);

    // 플랜 조회
    const { data: plans } = await supabase
      .from('user_plans')
      .select('user_id, plan, generations_used, generations_limit')
      .in('user_id', userIds);

    const creditMap = Object.fromEntries((credits || []).map(c => [c.user_id, c]));
    const planMap   = Object.fromEntries((plans   || []).map(p => [p.user_id, p]));

    const users = authUsers.users.map(u => ({
      user_id:           u.id,
      email:             u.email,
      created_at:        u.created_at,
      credits:           creditMap[u.id]?.credits ?? 0,
      total_credits_used: creditMap[u.id]?.total_used ?? 0,
      plan:              planMap[u.id]?.plan ?? 'free',
      generations_used:  planMap[u.id]?.generations_used ?? 0,
      generations_limit: planMap[u.id]?.generations_limit ?? 30,
    }));

    res.json({ users });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/admin/grant-credits ─────────────────────────
// 이메일로 크레딧 지급
router.post('/grant-credits', authMiddleware, adminOnly, async (req, res, next) => {
  const { email, amount } = req.body;

  if (!email || !amount || amount < 1) {
    return res.status(400).json({ error: '이메일과 크레딧 수량을 입력해주세요.' });
  }

  try {
    // 이메일로 유저 조회
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const target = users.find(u => u.email === email);
    if (!target) {
      return res.status(404).json({ error: `${email} 유저를 찾을 수 없습니다.` });
    }

    // 크레딧 추가 (upsert)
    const { data: existing } = await supabase
      .from('user_credits')
      .select('credits, total_used')
      .eq('user_id', target.id)
      .single();

    const currentCredits = existing?.credits ?? 0;
    const newCredits = currentCredits + Number(amount);

    await supabase
      .from('user_credits')
      .upsert({
        user_id:    target.id,
        credits:    newCredits,
        total_used: existing?.total_used ?? 0,
        updated_at: new Date().toISOString(),
      });

    // 트랜잭션 로그
    await supabase
      .from('credit_transactions')
      .insert({
        user_id: target.id,
        delta:   Number(amount),
        reason:  `admin_grant:${req.user.email}`,
        balance: newCredits,
      });

    res.json({ newCredits, email });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/admin/users/:userId ────────────────────────
// 유저 플랜 및 크레딧 직접 수정
router.patch('/users/:userId', authMiddleware, adminOnly, async (req, res, next) => {
  const { userId } = req.params;
  const { plan, credits } = req.body;

  try {
    if (plan !== undefined) {
      await supabase
        .from('user_plans')
        .upsert({ user_id: userId, plan });
    }

    if (credits !== undefined) {
      const { data: existing } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', userId)
        .single();

      const delta = credits - (existing?.credits ?? 0);

      await supabase
        .from('user_credits')
        .upsert({
          user_id:    userId,
          credits:    Number(credits),
          updated_at: new Date().toISOString(),
        });

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
