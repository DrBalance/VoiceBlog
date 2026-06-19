// routes/creditsRouter.js
const express = require('express');
const { authMiddleware, supabase } = require('../middleware/auth');
const { getBalance } = require('../middleware/credits');

const router = express.Router();

// GET /api/credits — 잔량 조회
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const balance = await getBalance(req.user.id);
    res.json({ credits: balance });
  } catch (err) {
    next(err);
  }
});

// GET /api/credits/log — 트랜잭션 내역
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

// GET /api/credits/plan — Settings 페이지용
router.get('/plan', authMiddleware, async (req, res, next) => {
  try {
    const [balance, planData, usageData] = await Promise.all([
      getBalance(req.user.id),
      supabase.from('user_plans').select('plan, generations_used, generations_limit').eq('user_id', req.user.id).single(),
      supabase.from('credit_transactions').select('delta').eq('user_id', req.user.id),
    ]);

    const transactions = usageData.data || [];
    const totalCharged = transactions.filter(t => t.delta > 0).reduce((s, t) => s + t.delta, 0);
    const totalUsed    = transactions.filter(t => t.delta < 0).reduce((s, t) => s + Math.abs(t.delta), 0);

    res.json({
      plan:             planData.data?.plan || 'free',
      credits:          balance,
      totalCreditsUsed: totalUsed,
      totalCharged,
      generationsUsed:  planData.data?.generations_used || 0,
      generationsLimit: planData.data?.generations_limit || 30,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
