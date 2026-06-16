# VoiceBlog 프로젝트 개요

## 서비스 개요
음성 파일 또는 텍스트를 입력하면 Claude AI가 네이버 블로그 포스트를 자동 작성해주는 SaaS.
이미지 생성(gpt-image-1), 해시태그 자동 생성, 네이버/티스토리 붙여넣기 최적화 포함.

## 기술 스택
| 구분 | 기술 |
|------|------|
| 프론트엔드 | React + Vite (Railway 배포) |
| 백엔드 | Node.js + Express (Railway 배포) |
| 인증/DB | Supabase (Auth + PostgreSQL + Storage) |
| AI | Anthropic Claude API (글 생성, 스타일 분석, 해시태그) |
| 이미지 생성 | OpenAI gpt-image-1 |
| 스톡 이미지 | Unsplash API |
| STT | OpenAI Whisper |

---

## 프로젝트 구조

```
VoiceBlog/
├── backend/                        # Node.js Express 서버
│   ├── index.js                    # 서버 진입점, 라우터 등록
│   ├── Procfile                    # Railway 실행 설정
│   ├── .env.example                # 환경변수 샘플
│   ├── schema.sql                  # Supabase DB 스키마
│   ├── middleware/
│   │   └── auth.js                 # Supabase JWT 인증 미들웨어
│   ├── routes/
│   │   ├── transcribe.js           # POST /api/transcribe — 음성→텍스트 (Whisper)
│   │   ├── generate.js             # POST /api/generate/blog — 블로그 생성
│   │   │                           # POST /api/generate/style — 커스텀 스타일 분석
│   │   │                           # GET  /api/generate/styles — 스타일 목록
│   │   │                           # DELETE /api/generate/style/:id
│   │   ├── images.js               # POST /api/generate/images — 이미지 생성
│   │   ├── generations.js          # GET /api/generations — 이력 목록
│   │   │                           # GET /api/generations/:id — 이력 상세
│   │   │                           # GET /api/generations/images/all — 이미지 라이브러리
│   │   └── profiles.js             # CRUD /api/profiles — 프로필 관리
│   │                               # CRUD /api/profiles/:id/hashtag-groups
│   │                               # CRUD /api/profiles/:id/signatures
│   └── services/
│       ├── claude.js               # Claude API 호출
│       │                           #   generateBlogPost() — 블로그 생성
│       │                           #   generateHashtags() — 해시태그 생성
│       │                           #   analyzeStyle() — 스타일 분석
│       ├── dalle.js                # OpenAI gpt-image-1 이미지 생성
│       ├── whisper.js              # OpenAI Whisper STT
│       └── unsplash.js             # Unsplash 스톡 이미지 검색
│
└── frontend/                       # React + Vite
    ├── index.html
    ├── vite.config.js
    ├── Dockerfile                  # Railway 프론트 배포용
    ├── .env.example
    └── src/
        ├── main.jsx                # React 진입점
        ├── index.css               # 전역 CSS (다크 테마, CSS 변수)
        ├── App.jsx                 # 라우터 설정, 네비게이션
        ├── pages/
        │   ├── Login.jsx           # 로그인/회원가입 페이지
        │   ├── Home.jsx            # 메인 페이지 (4단계 플로우)
        │   ├── History.jsx         # 생성 이력 + 상세 모달
        │   └── Settings.jsx        # 글쓰기 스타일 + 프로필 관리
        ├── components/
        │   ├── AudioInput.jsx      # 음성 녹음/파일 업로드
        │   ├── OptionPanel.jsx     # 생성 옵션 선택 UI
        │   └── BlogPreview.jsx     # 결과 미리보기 + 붙여넣기/다운로드
        ├── services/
        │   ├── supabase.js         # Supabase 클라이언트 초기화
        │   └── api.js              # 백엔드 API 호출 함수 모음
        └── utils/
            └── markdownToNaver.js  # 마크다운 → 네이버/티스토리 HTML 변환
```

---

## 주요 사용자 플로우

```
[Step 0] 음성 입력 또는 텍스트 직접 입력
    ↓
[Step 1] 옵션 설정
    - 글 길이 (짧게/보통/길게/아주 길게)
    - 웹 검색 보충 토글
    - 이미지 수량 + 스타일 (AI생성/스톡)
    - 이전 이미지 재사용 체크박스
    - 톤앤매너 (기본 4개 + 커스텀 스타일)
    - 예상 크레딧 안내
    ↓
[Step 2] 생성 중 (프로그레스바)
    - 블로그 글 생성 (Claude)
    - 이미지 생성 (gpt-image-1 or Unsplash)
    ↓
[Step 3] 결과 확인
    - 미리보기 / 이미지 / Markdown 원문 탭
    - 프로필 선택 → 해시태그 그룹 / 서명 선택
    - AI 생성 해시태그 + 프로필 해시태그 병합
    - 네이버 순차 붙여넣기 / 티스토리 붙여넣기
    - ZIP 다운로드 / 이미지 라이브러리
    - 옵션 재설정 (이전 글 참고 재생성)
```

---

## Supabase DB 테이블

| 테이블 | 설명 |
|--------|------|
| `auth.users` | Supabase 기본 인증 테이블 |
| `user_plans` | 플랜 정보 (현재: generations_used, generations_limit) |
| `generations` | 생성 이력 (transcript, tone, markdown, image_count 등) |
| `user_styles` | 커스텀 글쓰기 스타일 (name, description, system_prompt) |
| `profiles` | 클라이언트 프로필 (name) |
| `hashtag_groups` | 프로필별 해시태그 그룹 (naver_tags[], instagram_tags[]) |
| `blog_signatures` | 프로필별 블로그 서명 (html_content) |

**Supabase Storage:**
- `blog-images/` 버킷 — 생성된 이미지 저장
- 경로: `generations/{user_id}/{generation_id}/{filename}`

---

## 환경변수

**백엔드 (.env)**
```
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
UNSPLASH_ACCESS_KEY=
FRONTEND_URL=
PORT=3000
```

**프론트엔드 (.env)**
```
VITE_API_URL=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 배포 구성
- **백엔드:** Railway (Node.js, Procfile로 실행)
- **프론트엔드:** Railway (Dockerfile로 빌드 후 nginx 서빙)
- **DB/Auth/Storage:** Supabase (별도 프로젝트)
- **GitHub:** Public 레포 (`.env`는 `.gitignore` 처리)
