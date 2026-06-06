-- ================================
-- Voice Blog Supabase 스키마
-- ================================

-- 사용자 플랜 테이블
CREATE TABLE IF NOT EXISTS user_plans (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  generations_used INT DEFAULT 0,
  generations_limit INT DEFAULT 3,
  reset_at TIMESTAMPTZ DEFAULT (date_trunc('month', NOW()) + INTERVAL '1 month')
);

-- 생성 이력 테이블
CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  content_markdown TEXT,
  tone TEXT DEFAULT 'informative' CHECK (tone IN ('informative', 'friendly', 'expert', 'storytelling')),
  image_count INT DEFAULT 3,
  image_source TEXT DEFAULT 'dalle' CHECK (image_source IN ('dalle', 'unsplash')),
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) 활성화
ALTER TABLE user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;

-- user_plans: 본인 데이터만 접근
CREATE POLICY "user_plans_self" ON user_plans
  FOR ALL USING (auth.uid() = user_id);

-- generations: 본인 데이터만 접근
CREATE POLICY "generations_self" ON generations
  FOR ALL USING (auth.uid() = user_id);

-- Storage 버킷 생성 (Supabase 대시보드에서도 가능)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('blog-images', 'blog-images', true);

-- 월별 사용량 리셋 함수
CREATE OR REPLACE FUNCTION reset_monthly_usage()
RETURNS void AS $$
BEGIN
  UPDATE user_plans
  SET generations_used = 0,
      reset_at = date_trunc('month', NOW()) + INTERVAL '1 month'
  WHERE reset_at <= NOW();
END;
$$ LANGUAGE plpgsql;
