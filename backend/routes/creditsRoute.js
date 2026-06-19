// routes/credits.js
// GET  /api/credits        → 잔액 조회
// GET  /api/credits/log    → 최근 트랜잭션 내역

const express = require('express');
const { authMiddleware, supabase } = require('../middleware/auth');
const { getBalance } = require('../middleware/credits');

const router = express.Router();

// GET /api/credits
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const balance = await getBalance(req.user.id);
    res.json({ credits: balance });
  } catch (err) {
    next(err);
  }
});

// GET /api/credits/log?limit=20
router.get('/log', authMiddleware, async (req, res, next) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  try {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    res.json({ transactions: data || [] });
  } catch (err) {
    next(err);
  }
});

// GET /api/credits/plan — 플랜 + 크레딧 통합 조회 (Settings 페이지용)
router.get('/plan', authMiddleware, async (req, res, next) => {
  try {
    const [creditBalance, planData] = await Promise.all([
      getBalance(req.user.id),
      supabase
        .from('user_plans')
        .select('plan, generations_used, generations_limit')
        .eq('user_id', req.user.id)
        .single(),
    ]);

    // 총 사용 크레딧
    const { data: usageData } = await supabase
      .from('user_credits')
      .select('total_used')
      .eq('user_id', req.user.id)
      .single();

    res.json({
      plan: planData.data?.plan || 'free',
      credits: creditBalance,
      totalCreditsUsed: usageData?.total_used || 0,
      generationsUsed: planData.data?.generations_used || 0,
      generationsLimit: planData.data?.generations_limit || 30,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
