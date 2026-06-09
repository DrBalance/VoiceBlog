const express = require('express');
const { authMiddleware, supabase } = require('../middleware/auth');
const { generateBlogPost } = require('../services/claude');

const router = express.Router();

// POST /api/generate/blog
router.post('/blog', authMiddleware, async (req, res, next) => {
  const { transcript, tone = 'informative', imageCount = 3, imageSource = 'dalle' } = req.body;

  console.log('=== generate/blog 호출 ===');
  console.log('user id:', req.user?.id);
  console.log('body:', req.body);
  console.log('transcript:', transcript);

  if (!transcript || transcript.trim().length < 10) {
    return res.status(400).json({ error: '글감 텍스트가 너무 짧습니다.' });
  }

  try {
    // 플랜 체크
    const { data: plan, error: planError } = await supabase
      .from('user_plans')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    console.log('plan:', plan, 'planError:', planError);

    if (plan && plan.generations_used >= plan.generations_limit) {
      return res.status(403).json({
        error: '이번 달 생성 한도를 초과했습니다.',
        plan: plan.plan,
        limit: plan.generations_limit,
      });
    }

    // 블로그 생성
    console.log('Claude API 호출 시작...');
    const markdown = await generateBlogPost(transcript, { tone, imageCount, imageSource });
    console.log('Claude API 완료, markdown 길이:', markdown?.length);

    // 생성 이력 저장 (이미지 업로드 전 초기 저장)
    const { data: generation, error } = await supabase
      .from('generations')
      .insert({
        user_id: req.user.id,
        transcript,
        content_markdown: markdown,
        tone,
        image_count: imageCount,
        image_source: imageSource,
      })
      .select()
      .single();

    console.log('generation insert:', generation, 'error:', error);

    if (error) throw error;

    // 사용량 업데이트
    const { error: upsertError } = await supabase
      .from('user_plans')
      .upsert({
        user_id: req.user.id,
        generations_used: (plan?.generations_used || 0) + 1,
      });

    console.log('upsert error:', upsertError);

    res.json({
      generationId: generation.id,
      markdown,
    });
  } catch (err) {
    console.error('=== 에러 발생 ===', err);
    next(err);
  }
});

module.exports = router;
