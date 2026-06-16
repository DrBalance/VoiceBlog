import { useState } from 'react'
import { generateCardImage } from '../services/api'

// ── 스타일 상수 ──────────────────────────────────────────────
const STYLE_PROMPT = `Illustration style: Korean webtoon / SNS health card news style.
Image size: 1254 x 1254px, square format (1:1 ratio).
Transparent background (PNG, no background).
Simple 2D flat illustration with bold, slightly rough hand-drawn black outlines.
Minimal flat coloring — warm beige/peach skin tone, soft pink accents, no gradients.
Slight crayon/sketch texture on lines, imperfect and natural-looking strokes.
Cute, simplified rounded character design (Korean SNS style).
Korean handwritten-style white/light gray text in upper-left corner.
Simple white speech bubble with black outline if needed.
Generous negative space. Object or character placed center-right.
No background elements, no shadows, no complex shading.`

const QUALITY_OPTIONS = [
  { value: 'low',    label: '빠름',   desc: '저품질 · 빠른 생성' },
  { value: 'medium', label: '보통',   desc: '균형 잡힌 품질' },
  { value: 'high',   label: '고품질', desc: '느리지만 정교함' },
]

const SIZE_OPTIONS = [
  { value: '1024x1024', label: '정방형', icon: '⬜' },
  { value: '1536x1024', label: '가로형', icon: '▬' },
  { value: '1024x1536', label: '세로형', icon: '▮' },
]

// ── 스타일 ────────────────────────────────────────────────────
const s = {
  page: { maxWidth: '720px', margin: '0 auto', padding: '48px 24px' },

  header: { marginBottom: '40px' },
  title: {
    fontFamily: 'var(--font-serif)', fontSize: '2.4rem',
    fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  titleAccent: { color: 'var(--accent)', fontStyle: 'italic' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '0.95rem' },

  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: '16px', padding: '24px', marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '0.9rem', fontWeight: 600, marginBottom: '16px',
    color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em',
  },

  textarea: {
    width: '100%', minHeight: '100px', padding: '14px',
    background: 'var(--bg-input, #1a1a1a)', border: '1px solid var(--border)',
    borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.95rem',
    resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6,
    boxSizing: 'border-box',
  },
  input: {
    width: '100%', padding: '12px 14px',
    background: 'var(--bg-input, #1a1a1a)', border: '1px solid var(--border)',
    borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.95rem',
    fontFamily: 'inherit', boxSizing: 'border-box',
  },

  optionRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  optionBtn: (active) => ({
    flex: 1, minWidth: '80px', padding: '10px 8px', borderRadius: '10px',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-dim)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    fontSize: '0.85rem', fontWeight: active ? 600 : 400,
    cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center',
  }),

  countRow: { display: 'flex', gap: '8px' },
  countBtn: (active) => ({
    width: '48px', height: '48px', borderRadius: '10px',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-dim)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    fontSize: '1rem', fontWeight: active ? 700 : 400,
    cursor: 'pointer', transition: 'all 0.2s',
  }),

  promptPreview: {
    marginTop: '12px', padding: '12px 14px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
    borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-muted)',
    lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '120px',
    overflow: 'hidden', position: 'relative',
  },
  promptToggle: {
    fontSize: '0.8rem', color: 'var(--accent)', cursor: 'pointer',
    background: 'none', border: 'none', padding: '4px 0', marginTop: '6px',
  },

  generateBtn: {
    width: '100%', padding: '16px', borderRadius: '12px', fontSize: '1rem',
    fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
    background: 'var(--accent)', color: '#0e0e0e', border: 'none',
    marginTop: '8px',
  },
  generateBtnDisabled: {
    width: '100%', padding: '16px', borderRadius: '12px', fontSize: '1rem',
    fontWeight: 600, background: 'var(--border)', color: 'var(--text-muted)',
    border: 'none', cursor: 'not-allowed', marginTop: '8px',
  },

  progressWrap: { textAlign: 'center', padding: '32px 0' },
  spinner: {
    width: '40px', height: '40px', border: '3px solid var(--border)',
    borderTop: '3px solid var(--accent)', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
  },
  progressText: { color: 'var(--text-secondary)', fontSize: '0.95rem' },

  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px', marginTop: '8px',
  },
  imgWrap: {
    borderRadius: '12px', overflow: 'hidden',
    border: '1px solid var(--border)', background: 'var(--bg-card)',
    position: 'relative',
  },
  img: { width: '100%', display: 'block' },
  downloadBtn: {
    position: 'absolute', bottom: '10px', right: '10px',
    padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem',
    fontWeight: 600, cursor: 'pointer',
    background: 'rgba(14,14,14,0.85)', color: 'var(--accent)',
    border: '1px solid var(--accent)', backdropFilter: 'blur(6px)',
  },

  error: {
    padding: '14px', borderRadius: '10px', fontSize: '0.9rem',
    background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.3)',
    color: '#ff6b6b', marginBottom: '16px',
  },
}

// ── 컴포넌트 ──────────────────────────────────────────────────
export default function ImageGen() {
  const [scene, setScene]       = useState('')
  const [korText, setKorText]   = useState('')
  const [count, setCount]       = useState(1)
  const [size, setSize]         = useState('1024x1024')
  const [quality, setQuality]   = useState('medium')
  const [showPrompt, setShowPrompt] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [images, setImages]     = useState([])
  const [error, setError]       = useState('')

  // 최종 프롬프트 조합
  const buildPrompt = () => {
    let p = STYLE_PROMPT
    if (scene.trim())   p += `\n\nScene to illustrate: ${scene.trim()}`
    if (korText.trim()) p += `\nKorean text to include: "${korText.trim()}"`
    return p
  }

  const handleGenerate = async () => {
    if (!scene.trim()) return
    setError('')
    setLoading(true)
    setImages([])

    try {
      const result = await generateCardImage({
        prompt: buildPrompt(),
        count,
        size,
        quality,
      })
      setImages(result.images || [])
    } catch (e) {
      setError(e.message || '이미지 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (url, index) => {
    const a = document.createElement('a')
    a.href = url
    a.download = `card_${Date.now()}_${index + 1}.png`
    a.click()
  }

  const canGenerate = scene.trim().length > 0 && !loading

  return (
    <div style={s.page}>
      {/* 헤더 */}
      <div style={s.header}>
        <h1 style={s.title}>
          Card<span style={s.titleAccent}>Image</span>
        </h1>
        <p style={s.subtitle}>Dr. Balance 카드뉴스 일러스트 생성기</p>
      </div>

      {/* 장면 설명 */}
      <div style={s.card}>
        <div style={s.cardTitle}>장면 설명 *</div>
        <textarea
          style={s.textarea}
          placeholder="예: 여성이 손으로 종아리를 꾹 눌렀을 때 자국이 남는 모습"
          value={scene}
          onChange={e => setScene(e.target.value)}
        />
      </div>

      {/* 한국어 텍스트 */}
      <div style={s.card}>
        <div style={s.cardTitle}>이미지 안 한국어 텍스트 (선택)</div>
        <input
          style={s.input}
          placeholder='예: 눌렀을 때 자국이 남아요...'
          value={korText}
          onChange={e => setKorText(e.target.value)}
        />
      </div>

      {/* 옵션 */}
      <div style={s.card}>
        <div style={s.cardTitle}>옵션</div>

        {/* 수량 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>수량</div>
          <div style={s.countRow}>
            {[1, 2, 3, 4].map(n => (
              <button key={n} style={s.countBtn(count === n)} onClick={() => setCount(n)}>{n}</button>
            ))}
          </div>
        </div>

        {/* 사이즈 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>사이즈</div>
          <div style={s.optionRow}>
            {SIZE_OPTIONS.map(o => (
              <button key={o.value} style={s.optionBtn(size === o.value)} onClick={() => setSize(o.value)}>
                {o.icon} {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* 품질 */}
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>품질</div>
          <div style={s.optionRow}>
            {QUALITY_OPTIONS.map(o => (
              <button key={o.value} style={s.optionBtn(quality === o.value)} onClick={() => setQuality(o.value)}>
                <div>{o.label}</div>
                <div style={{ fontSize: '0.75rem', marginTop: '2px', opacity: 0.7 }}>{o.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 스타일 프롬프트 미리보기 */}
      <div style={{ marginBottom: '16px' }}>
        <button style={s.promptToggle} onClick={() => setShowPrompt(v => !v)}>
          {showPrompt ? '▲ 스타일 프롬프트 숨기기' : '▼ 스타일 프롬프트 보기'}
        </button>
        {showPrompt && (
          <div style={s.promptPreview}>{buildPrompt()}</div>
        )}
      </div>

      {/* 에러 */}
      {error && <div style={s.error}>⚠️ {error}</div>}

      {/* 생성 버튼 */}
      <button
        style={canGenerate ? s.generateBtn : s.generateBtnDisabled}
        onClick={handleGenerate}
        disabled={!canGenerate}
      >
        {loading ? '생성 중...' : `이미지 생성 (${count}장)`}
      </button>

      {/* 로딩 */}
      {loading && (
        <div style={s.progressWrap}>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          <div style={s.spinner} />
          <div style={s.progressText}>gpt-image-1 생성 중... 잠시만 기다려 주세요</div>
        </div>
      )}

      {/* 결과 */}
      {images.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <div style={s.cardTitle}>생성 결과 ({images.length}장)</div>
          <div style={s.grid}>
            {images.map((img, i) => (
              <div key={i} style={s.imgWrap}>
                <img src={img.url || img.permanentUrl} alt={`생성 이미지 ${i + 1}`} style={s.img} />
                <button style={s.downloadBtn} onClick={() => handleDownload(img.url || img.permanentUrl, i)}>
                  ↓ 다운로드
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
