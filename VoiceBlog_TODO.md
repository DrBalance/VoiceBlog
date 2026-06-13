# VoiceBlog 남은 작업 목록 (2026-06-14 업데이트)

## ✅ 완성된 기능
- 회원가입 / 로그인 (Supabase Auth)
- 음성 파일 업로드 → Whisper STT
- 텍스트 직접 입력
- Claude API 블로그 글 생성
- AI 이미지 생성 (gpt-image-1, Supabase Storage 저장)
- Unsplash 이미지 검색
- 네이버 블로그 순차 붙여넣기 (이미지 포함)
- 티스토리 붙여넣기
- ZIP 다운로드 (글 + 이미지)
- **이미지 수량 0장 옵션** — 0 선택 시 이미지 소스 UI 숨김, 이미지 생성 스킵
- **해시태그 자동 생성** — 네이버/인스타 탭 구분, 복사 버튼, 블로그 생성과 병렬 처리

---

## 🔧 남은 작업

### 1. 커스텀 스타일 만들기
**개요:** 예시 문장을 입력하면 AI가 스타일을 분석하고 저장. 기존 4개 톤앤매너와 함께 선택 가능.

**수정 파일:**
- `backend/routes/generate.js` — POST `/api/generate/style` 엔드포인트 추가
- `backend/services/claude.js` — `analyzeStyle(exampleText)` 함수 추가
- `frontend/src/pages/Home.jsx` — 옵션 설정 화면에 "커스텀 스타일 추가" 버튼 및 모달 UI 추가
- `frontend/src/services/api.js` — `analyzeStyle()` API 호출 함수 추가

**DB:**
```sql
create table user_styles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  description text not null,
  system_prompt text not null,
  created_at timestamptz default now()
);
alter table user_styles enable row level security;
grant all on public.user_styles to service_role;
create policy "Users can manage own styles"
on user_styles for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

---

### 2. 이미지 라이브러리 (이미지 선택 다운로드)
**개요:** 과거에 생성된 이미지들을 모아서 보고, 원하는 것만 골라서 다운로드할 수 있는 전용 화면.

**수정 파일:**
- `frontend/src/pages/ImageLibrary.jsx` — 새 파일, 이미지 갤러리 페이지
- `frontend/src/App.jsx` — `/images` 라우트 추가
- `backend/routes/generations.js` — 이미지 목록 반환 API 추가

---

### 3. 기본 해시태그 설정
**개요:** 사용자가 미리 정해둔 고정 해시태그를 AI 생성 해시태그에 자동으로 추가.

**수정 파일:**
- `frontend/src/pages/Settings.jsx` — 기본 해시태그 입력/저장 UI
- `backend/routes/settings.js` — 기본 해시태그 저장/조회 API
- `frontend/src/components/BlogPreview.jsx` — 기본 해시태그 prepend 처리

**DB:**
```sql
alter table user_plans add column default_hashtags_naver text[] default '{}';
alter table user_plans add column default_hashtags_instagram text[] default '{}';
```

---

### 4. 크레딧 기반 과금 시스템
**개요:** 플랜 기반(무료 3건/월) 대신 크레딧 차감 방식으로 전환. 글 생성/이미지 생성을 분리 과금.

**크레딧 소모 기준:**
- 글 생성 (STT + Claude): 1 크레딧
- 이미지 생성: 1장당 1 크레딧

**크레딧 패키지:**
- 무료: 가입 시 10 크레딧
- Basic: 50 크레딧 / 5,900원
- Standard: 150 크레딧 / 14,900원
- Pro: 월정액 무제한 / 29,900원

**DB:**
```sql
alter table user_plans add column credits integer default 10;
alter table user_plans add column total_credits_used integer default 0;
```

---

### 5. 결제 연동
**개요:** 토스페이먼츠 결제 연동. 크레딧 패키지 구매.

---

### 6. 티스토리 자동 포스팅
**개요:** 티스토리 OAuth 연동 후 원클릭 자동 발행.

---

## 작업 우선순위
1. **커스텀 스타일 만들기** — 차별화 기능
2. **이미지 라이브러리** — 사용성 향상
3. **기본 해시태그 설정** — 해시태그 기능 확장
4. **크레딧 기반 과금 시스템** — 수익화 모델 (결제 연동 전 선행)
5. **결제 연동** — 수익화
6. **티스토리 자동 포스팅** — 고급 기능
