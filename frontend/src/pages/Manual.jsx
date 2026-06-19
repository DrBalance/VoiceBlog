const s = {
  page: { maxWidth: '760px', margin: '0 auto', padding: '48px 24px' },
  header: { marginBottom: '48px' },
  title: {
    fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 400,
    color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em',
  },
  titleAccent: { color: 'var(--accent)', fontStyle: 'italic' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '1rem' },
  section: {
    marginBottom: '40px', borderRadius: '16px',
    border: '1px solid var(--border)', overflow: 'hidden',
  },
  sectionHead: {
    padding: '18px 24px', borderBottom: '1px solid var(--border)',
    background: 'var(--bg-hover)',
    display: 'flex', alignItems: 'center', gap: '10px',
  },
  sectionIcon: { fontSize: '1.2rem' },
  sectionTitle: { fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' },
  sectionBody: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' },
  step: {
    display: 'flex', gap: '16px', alignItems: 'flex-start',
  },
  stepNum: {
    minWidth: '28px', height: '28px', borderRadius: '50%',
    background: 'var(--accent)', color: '#0e0e0e',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
  },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' },
  stepDesc: { fontSize: '0.87rem', color: 'var(--text-secondary)', lineHeight: 1.7 },
  tip: {
    padding: '12px 16px', borderRadius: '8px',
    background: 'var(--accent-dim)', border: '1px solid var(--accent)',
    fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7,
    borderLeft: '3px solid var(--accent)',
  },
  tipLabel: { fontWeight: 600, color: 'var(--accent)', marginBottom: '4px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.87rem' },
  th: {
    padding: '10px 14px', textAlign: 'left', fontWeight: 600,
    color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)',
    background: 'var(--bg-hover)',
  },
  td: {
    padding: '10px 14px', borderBottom: '1px solid var(--border)',
    color: 'var(--text-primary)', verticalAlign: 'top',
  },
  badge: (color) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
    fontSize: '0.78rem', fontWeight: 600,
    background: color === 'accent' ? 'var(--accent-dim)' : 'var(--bg-hover)',
    color: color === 'accent' ? 'var(--accent)' : 'var(--text-muted)',
    border: `1px solid ${color === 'accent' ? 'var(--accent)' : 'var(--border)'}`,
  }),
  divider: { height: '1px', background: 'var(--border)', margin: '4px 0' },
  faqQ: { fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' },
  faqA: { fontSize: '0.87rem', color: 'var(--text-secondary)', lineHeight: 1.7 },
}

export default function Manual() {
  return (
    <div style={s.page}>
      <header style={s.header}>
        <h1 style={s.title}>
          Voice<span style={s.titleAccent}>Blog</span> 사용 가이드
        </h1>
        <p style={s.subtitle}>음성에서 완성된 블로그 포스트까지 — 단계별 사용법</p>
      </header>

      {/* ── 기본 사용 흐름 ── */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <span style={s.sectionIcon}>🚀</span>
          <span style={s.sectionTitle}>기본 사용 흐름</span>
        </div>
        <div style={s.sectionBody}>
          {[
            {
              title: '음성 입력 또는 텍스트 입력',
              desc: '마이크 버튼을 눌러 음성을 녹음하거나, 음성 파일(mp3, m4a, wav 등)을 업로드하세요. 텍스트로 직접 글감을 입력하는 것도 가능합니다. 음성은 자동으로 텍스트로 변환됩니다.',
            },
            {
              title: '생성 옵션 설정',
              desc: '글 길이(짧게/보통/길게/아주 길게), 톤앤매너, 이미지 수량과 스타일(AI 생성 또는 스톡), 웹 검색 보충 여부를 선택합니다. 처음엔 기본 설정으로 시작해보세요.',
            },
            {
              title: '블로그 생성',
              desc: '생성하기 버튼을 누르면 Claude AI가 실시간으로 블로그 글을 작성합니다. 작성 중인 내용이 타이핑되듯 미리보기로 표시됩니다.',
            },
            {
              title: '결과 확인 및 복사',
              desc: '완성된 글과 이미지를 확인하고, 네이버 블로그 또는 티스토리에 맞는 형식으로 복사하세요. 해시태그도 자동으로 생성됩니다.',
            },
          ].map((item, i) => (
            <div key={i} style={s.step}>
              <div style={s.stepNum}>{i + 1}</div>
              <div style={s.stepContent}>
                <div style={s.stepTitle}>{item.title}</div>
                <div style={s.stepDesc}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 글 길이 옵션 ── */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <span style={s.sectionIcon}>📝</span>
          <span style={s.sectionTitle}>글 길이 옵션</span>
        </div>
        <div style={s.sectionBody}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>옵션</th>
                <th style={s.th}>글자 수</th>
                <th style={s.th}>적합한 상황</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['짧게', '800~1,200자', '간단한 일상 포스트, 제품 소개'],
                ['보통', '1,500~2,500자', '일반 블로그 포스트 (권장)'],
                ['길게', '3,000~4,000자', '상세한 정보성 글, 리뷰'],
                ['아주 길게', '5,000자 이상', '전문 칼럼, 심층 분석'],
              ].map(([opt, chars, use]) => (
                <tr key={opt}>
                  <td style={s.td}><span style={s.badge('accent')}>{opt}</span></td>
                  <td style={s.td}>{chars}</td>
                  <td style={s.td}>{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 이미지 생성 ── */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <span style={s.sectionIcon}>🎨</span>
          <span style={s.sectionTitle}>이미지 생성</span>
        </div>
        <div style={s.sectionBody}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>방식</th>
                <th style={s.th}>특징</th>
                <th style={s.th}>크레딧</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['AI 생성 (gpt-image-1)', '글 내용에 맞게 커스텀 이미지 생성. 독창적이고 블로그 톤에 최적화.', '1장당 1 크레딧'],
                ['스톡 이미지 (Unsplash)', '고품질 무료 사진. 실제 사진이 필요한 경우 적합.', '1장당 1 크레딧'],
              ].map(([type, desc, credit]) => (
                <tr key={type}>
                  <td style={s.td}><strong>{type}</strong></td>
                  <td style={s.td}>{desc}</td>
                  <td style={{ ...s.td, color: 'var(--accent)', fontWeight: 500 }}>{credit}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={s.tip}>
            <div style={s.tipLabel}>💡 이전 이미지 재사용</div>
            재생성할 때 "이전 이미지 재사용" 체크박스를 선택하면 이미지를 새로 만들지 않아 크레딧을 절약할 수 있습니다.
          </div>
        </div>
      </div>

      {/* ── 붙여넣기 가이드 ── */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <span style={s.sectionIcon}>📋</span>
          <span style={s.sectionTitle}>블로그 붙여넣기 가이드</span>
        </div>
        <div style={s.sectionBody}>
          {[
            {
              title: '네이버 블로그',
              desc: '결과 화면에서 "네이버 순차 복사"를 누르세요. 첫 클릭에 제목이 복사되고, 이후 클릭할 때마다 이미지와 본문이 순서대로 복사됩니다. 네이버 글쓰기 화면에서 Ctrl+V로 붙여넣기하세요.',
            },
            {
              title: '티스토리',
              desc: '"티스토리 복사" 버튼을 누르면 이미지가 포함된 HTML 전체가 한 번에 복사됩니다. 티스토리 편집기를 HTML 모드로 전환 후 붙여넣기하세요.',
            },
          ].map((item, i) => (
            <div key={i} style={s.step}>
              <div style={{ ...s.stepNum, background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
                {i === 0 ? 'N' : 'T'}
              </div>
              <div style={s.stepContent}>
                <div style={s.stepTitle}>{item.title}</div>
                <div style={s.stepDesc}>{item.desc}</div>
              </div>
            </div>
          ))}
          <div style={s.tip}>
            <div style={s.tipLabel}>💡 ZIP 다운로드</div>
            "ZIP 다운로드" 버튼을 누르면 마크다운 원문과 이미지 파일이 압축되어 다운로드됩니다. 다른 플랫폼에 사용하거나 백업용으로 활용하세요.
          </div>
        </div>
      </div>

      {/* ── 크레딧 안내 ── */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <span style={s.sectionIcon}>💳</span>
          <span style={s.sectionTitle}>크레딧 안내</span>
        </div>
        <div style={s.sectionBody}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>작업</th>
                <th style={s.th}>차감</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['글 생성 (STT + Claude)', '1 크레딧'],
                ['이미지 생성', '1장당 1 크레딧'],
                ['웹 검색 보충', '1 크레딧'],
                ['이미지 라이브러리 다운로드', '무료'],
                ['이전 이미지 재사용', '무료'],
              ].map(([work, cost]) => (
                <tr key={work}>
                  <td style={s.td}>{work}</td>
                  <td style={{ ...s.td, color: cost === '무료' ? 'var(--text-muted)' : 'var(--accent)', fontWeight: 500 }}>{cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={s.tip}>
            <div style={s.tipLabel}>💡 예시</div>
            글 1개 + AI 이미지 3장 + 웹 검색 = 1 + 3 + 1 = <strong>5 크레딧</strong>
            <br />
            글 1개 + 스톡 이미지 2장 (웹 검색 없음) = 1 + 2 = <strong>3 크레딧</strong>
          </div>
          <div style={{
            padding: '14px 16px', borderRadius: '8px', textAlign: 'center',
            border: '1px solid var(--border)', background: 'var(--bg-hover)',
          }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              크레딧 충전이 필요하신가요?
            </div>
            <a
              href="mailto:drbalance@naver.com?subject=VoiceBlog 크레딧 충전 문의"
              style={{
                display: 'inline-block', padding: '8px 20px', borderRadius: '8px',
                background: 'var(--accent)', color: '#0e0e0e',
                fontSize: '0.88rem', fontWeight: 600, textDecoration: 'none',
              }}
            >
              ✉ 크레딧 충전 문의
            </a>
          </div>
        </div>
      </div>

      {/* ── 커스텀 스타일 ── */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <span style={s.sectionIcon}>✦</span>
          <span style={s.sectionTitle}>커스텀 글쓰기 스타일</span>
        </div>
        <div style={s.sectionBody}>
          <div style={s.stepDesc}>
            설정 페이지에서 좋아하는 블로그 글의 예시를 붙여넣으면, AI가 그 문체와 어조를 분석해 나만의 글쓰기 스타일을 만들어줍니다. 최대 4개까지 저장 가능하며, 생성 옵션에서 선택해 사용하세요.
          </div>
          <div style={s.tip}>
            <div style={s.tipLabel}>💡 좋은 예시 글 고르는 법</div>
            본인이 목표로 하는 글체의 블로그 포스트 1~2개를 그대로 붙여넣으세요. 200자 이상일수록 분석 정확도가 높아집니다.
          </div>
        </div>
      </div>

      {/* ── 자주 묻는 질문 ── */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <span style={s.sectionIcon}>❓</span>
          <span style={s.sectionTitle}>자주 묻는 질문</span>
        </div>
        <div style={s.sectionBody}>
          {[
            {
              q: '음성 파일은 어떤 형식이 지원되나요?',
              a: 'mp3, m4a, wav, ogg, webm 등 대부분의 오디오 형식을 지원합니다. 파일 크기는 25MB 이하를 권장합니다.',
            },
            {
              q: '생성된 글이 마음에 안 들면 어떻게 하나요?',
              a: '결과 화면에서 "옵션 재설정" 버튼을 누르면 옵션을 변경해 재생성할 수 있습니다. 이때 이전 글을 참고해서 더 나은 버전을 만들어줍니다. "이전 이미지 재사용"을 체크하면 이미지 크레딧을 아낄 수 있습니다.',
            },
            {
              q: '웹 검색 보충은 어떤 경우에 사용하나요?',
              a: '최신 정보나 정확한 수치가 필요한 주제(신제품 리뷰, 시사 이슈 등)에 유용합니다. 생성 시간이 약 20초 더 걸리고 1 크레딧이 추가로 차감됩니다.',
            },
            {
              q: '이미지 라이브러리는 무엇인가요?',
              a: '과거에 생성한 모든 이미지를 한 곳에서 볼 수 있는 기능입니다. 이력 페이지에서 접근할 수 있으며, 마음에 드는 이미지를 개별로 다운로드할 수 있습니다.',
            },
            {
              q: '크레딧은 어떻게 충전하나요?',
              a: '설정 페이지 또는 이 페이지 하단의 "크레딧 충전 문의" 버튼으로 이메일을 보내주시면 안내해드립니다.',
            },
          ].map((item, i) => (
            <div key={i}>
              {i > 0 && <div style={s.divider} />}
              <div style={{ paddingTop: i > 0 ? '12px' : 0 }}>
                <div style={s.faqQ}>Q. {item.q}</div>
                <div style={s.faqA}>A. {item.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 문의 */}
      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        추가 문의는{' '}
        <a href="mailto:drbalance@naver.com" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
          drbalance@naver.com
        </a>
        으로 연락해주세요.
      </div>
    </div>
  )
}
