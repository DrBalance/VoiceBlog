// middleware/credits.js
// ─────────────────────────────────────────────────────────────
// 크레딧 차감 미들웨어 & 헬퍼
// ─────────────────────────────────────────────────────────────
const { supabase } = require('./auth');

/**
 * 크레딧을 원자적으로 차감합니다.
 * @param {string} userId
 * @param {number} amount  - 차감할 크레딧 수
 * @param {string} reason  - 로그용 사유
 * @returns {Promise<{ok: boolean, balance: number}>}
 */
async function deductCredits(userId, amount, reason) {
  const { data, error } = await supabase.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount:  amount,
    p_reason:  reason,
  });

  if (error) throw error;

  // RPC 반환값: 잔액(>=0) 또는 -1(부족)
  if (data === -1) {
    return { ok: false, balance: 0 };
  }
  return { ok: true, balance: data };
}

/**
 * 잔액만 조회합니다.
 */
async function getBalance(userId) {
  const { data, error } = await supabase.rpc('get_credits', {
    p_user_id: userId,
  });
  if (error) throw error;
  return data;
}

/**
 * Express 미들웨어 팩토리.
 * requireCredits(n) → 요청 처리 전 n 크레딧이 있는지 확인.
 * 실제 차감은 라우터 핸들러에서 deductCredits()로 직접 수행합니다.
 * (이미지처럼 수량이 동적인 경우를 위해 분리)
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

module.exports = { deductCredits, getBalance, requireCredits };
