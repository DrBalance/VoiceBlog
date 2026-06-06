const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '20px' },
  label: { fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' },
  row: { display: 'flex', gap: '8px' },
  optBtn: (active) => ({
    flex: 1, padding: '10px 8px', borderRadius: '8px', fontSize: '0.85rem',
    fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
    background: active ? 'var(--accent-dim)' : 'var(--bg-hover)',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
  }),
  counter: {
    display: 'flex', alignItems: 'center', gap: '12px',
  },
  countBtn: {
    width: '32px', height: '32px', borderRadius: '8px', fontSize: '1.1rem',
    background: 'var(--bg-hover)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  countNum: { fontSize: '1.2rem', fontWeight: 600, minWidth: '24px', textAlign: 'center' },
}

const IMAGE_SOURCES = [
  { value: 'dalle', label: 'AI 생성', desc: 'DALL·E 3' },
  { value: 'unsplash', label: '스톡 사진', desc: 'Unsplash' },
]

const TONES = [
  { value: 'informative', label: '정보전달형' },
  { value: 'friendly', label: '친근한 일상체' },
  { value: 'expert', label: '전문가형' },
  { value: 'storytelling', label: '스토리텔링' },
]

export default function OptionPanel({ options, onChange }) {
  const { imageCount, imageSource, tone } = options

  return (
    <div style={styles.wrap}>
      {/* 이미지 소스 */}
      <div>
        <span style={styles.label}>이미지 스타일</span>
        <div style={styles.row}>
          {IMAGE_SOURCES.map(s => (
            <button key={s.value} style={styles.optBtn(imageSource === s.value)}
              onClick={() => onChange({ ...options, imageSource: s.value })}>
              {s.label}
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 이미지 수량 */}
      <div>
        <span style={styles.label}>이미지 수량</span>
        <div style={styles.counter}>
          <button style={styles.countBtn}
            onClick={() => onChange({ ...options, imageCount: Math.max(1, imageCount - 1) })}>−</button>
          <span style={styles.countNum}>{imageCount}</span>
          <button style={styles.countBtn}
            onClick={() => onChange({ ...options, imageCount: Math.min(10, imageCount + 1) })}>+</button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>장</span>
        </div>
      </div>

      {/* 톤앤매너 */}
      <div>
        <span style={styles.label}>톤앤매너</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {TONES.map(t => (
            <button key={t.value} style={styles.optBtn(tone === t.value)}
              onClick={() => onChange({ ...options, tone: t.value })}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
