// middleware/credits.js
const { supabase } = require('./auth');

/**
 * credit_transactions 기반 잔량 조회
 */
async function getBalance(userId) {
  const { data, error } = await supabase
    .from('credit_transactions')
    .select('delta')
    .eq('user_id', userId);

  if (error) throw error;
  return (data || []).reduce((sum, row) => sum + row.delta, 0);
}

/**
 * 크레딧 차감
 */
async function deductCredits(userId, amount, reason) {
  const balance = await getBalance(userId);
  if (balance < amount) return { ok: false, balance };

  const newBalance = balance - amount;
  const { error } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      delta:   -amount,
      reason,
      balance: newBalance,
    });

  if (error) throw error;
  return { ok: true, balance: newBalance };
}

/**
 * 크레딧 충전
 */
async function chargeCredits(userId, amount, reason) {
  const balance = await getBalance(userId);
  const newBalance = balance + amount;

  const { error } = await supabase
    .from('credit_transactions')
    .insert({
      user_id: userId,
      delta:   amount,
      reason,
      balance: newBalance,
    });

  if (error) throw error;
  return { ok: true, balance: newBalance };
}

/**
 * Express 미들웨어 — n 크레딧 사전 확인
 */
function requireCredits(amount) {
  return async (req, res, next) => {
    try {
      const balance = await getBalance(req.user.id);
      if (balance < amount) {
        return res.status(402).json({
          error: `크레딧이 부족합니다. (필요: ${amount}, 잔여: ${balance})`,
          code:  'INSUFFICIENT_CREDITS',
          balance,
          required: amount,
        });
      }
      req.creditBalance = balance;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { getBalance, deductCredits, chargeCredits, requireCredits };
