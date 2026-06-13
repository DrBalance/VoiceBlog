import { useState, useEffect } from 'react'
import { getStyles, analyzeStyle, deleteStyle } from '../services/api'

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
  counter: { display: 'flex', alignItems: 'center', gap: '12px' },
  countBtn: {
    width: '32px', height: '32px', borderRadius: '8px', fontSize: '1.1rem',
    background: 'var(--bg-hover)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
  },
  countNum: { fontSize: '1.2rem', fontWeight: 600, minWidth: '24px', textAlign: 'center' },
  customBtn: {
    width: '100%', padding: '10px', borderRadius: '8px', fontSize: '0.85rem',
    fontWeight: 500, cursor: 'pointer', marginTop: '8px',
    background: 'transparent', color: 'var(--accent)',
    border: '1px dashed var(--accent)',
  },
  deleteBtn: {
    padding: '2px 6px', fontSize: '0.75rem', borderRadius: '4px',
    background: 'transparent', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', marginLeft: '4px',
  },
  // 크레딧 안내
  creditBox: {
    padding: '12px 14px', borderRadius: '8px',
    background: 'var(--bg-hover)', border: '1px solid var(--border)',
    fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.8,
  },
  creditRow: { display: 'flex', justifyContent: 'space-between' },
  creditTotal: {
    marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border)',
    display: 'flex', justifyContent: 'space-between',
    fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem',
  },
  // 웹 검색 토글
  toggleRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 14px', borderRadius: '8px',
    background: 'var(--bg-hover)', border: '1px solid var(--border)',
  },
  toggle: (active) => ({
    width: '40px', height: '22px', borderRadius: '11px', cursor: 'pointer',
    background: active ? 'var(--accent)' : 'var(--border)',
    border: 'none', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
  }),
  toggleThumb: (active) => ({
    position: 'absolute', top: '3px',
    left: active ? '21px' : '3px',
    width: '16px', height: '16px', borderRadius: '50%',
    background: '#fff', transition: 'left 0.2s',
  }),
  // 경고
  warnBox: {
    padding: '12px 14px', borderRadius: '8px',
    background: 'rgba(255, 180, 0, 0.1)', border: '1px solid rgba(255, 180, 0, 0.4)',
    fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6,
  },
  // 모달
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '20px',
  },
  modal: {
    background: 'var(--bg-card)', borderRadius: '16px', padding: '28px',
    width: '100%', maxWidth: '480px', border: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', gap: '16px',
  },
  modalTitle: { fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' },
  textarea: {
    width: '100%', minHeight: '160px', padding: '12px',
    borderRadius: '8px', fontSize: '0.88rem', lineHeight: 1.7,
    background: 'var(--bg-hover)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', resize: 'vertical', boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  charCount: (over) => ({
    fontSize: '0.8rem', textAlign: 'right',
    color: over ? 'var(--error, #e05c5c)' : 'var(--text-muted)',
  }),
  modalBtnRow: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  modalBtn: (primary) => ({
    padding: '10px 20px', borderRadius: '8px', fontSize: '0.88rem',
    fontWeight: 500, cursor: 'pointer',
    background: primary ? 'var(--accent)' : 'var(--bg-hover)',
    color: primary ? '#0e0e0e' : 'var(--text-secondary)',
    border: `1px solid ${primary ? 'var(--accent)' : 'var(--border)'}`,
  }),
  resultBox: {
    padding: '14px 16px', borderRadius: '8px',
    background: 'var(--accent-dim)', border: '1px solid var(--accent)',
  },
  resultName: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '4px' },
  resultDesc: { fontSize: '0.83rem', color: 'var(--text-secondary)' },
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

const CONTENT_LENGTHS = [
  { value: 'short', label: '짧게', desc: '800~1200자' },
  { value: 'normal', label: '보통', desc: '1500~2500자' },
  { value: 'long', label: '길게', desc: '3000~4000자' },
  { value: 'very_long', label: '아주 길게', desc: '5000자+' },
]

const MAX_CHARS = 1000

export default function OptionPanel({ options, onChange, transcriptLength = 0 }) {
  const { imageCount, imageSource, tone, contentLength = 'normal', useWebSearch = false } = options
  const [customStyles, setCustomStyles] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [exampleText, setExampleText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [modalError, setModalError] = useState('')

  // 글감 부족 여부 (300자 이하)
  const isTranscriptShort = transcriptLength > 0 && transcriptLength <= 300

  useEffect(() => {
    loadStyles()
  }, [])

  async function loadStyles() {
    try {
      const { styles: data } = await getStyles()
      setCustomStyles(data)
    } catch {}
  }

  async function handleAnalyze() {
    if (exampleText.trim().length < 50) {
      setModalError('50자 이상 입력해주세요.')
      return
    }
    setModalError('')
    setAnalyzing(true)
    try {
      const { style } = await analyzeStyle(exampleText)
      setResult(style)
    } catch (err) {
      setModalError(err.message || '분석 중 오류가 발생했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  function handleSave() {
    if (!result) return
    setCustomStyles(prev => [...prev, result])
    onChange({ ...options, tone: result.id })
    handleCloseModal()
  }

  function handleCloseModal() {
    setShowModal(false)
    setExampleText('')
    setResult(null)
    setModalError('')
  }

  async function handleDelete(e, styleId) {
    e.stopPropagation()
    try {
      await deleteStyle(styleId)
      setCustomStyles(prev => prev.filter(s => s.id !== styleId))
      if (tone === styleId) onChange({ ...options, tone: 'informative' })
    } catch {}
  }

  // 크레딧 계산
  const creditBlog = 1
  const creditImages = imageCount
  const creditSearch = useWebSearch ? 1 : 0
  const creditTotal = creditBlog + creditImages + creditSearch

  const charCount = exampleText.length
  const isOver = charCount > MAX_CHARS

  return (
    <div style={styles.wrap}>

      {/* 글 길이 */}
      <div>
        <span style={styles.label}>글 길이</span>
        <div style={styles.row}>
          {CONTENT_LENGTHS.map(l => (
            <button key={l.value} style={styles.optBtn(contentLength === l.value)}
              onClick={() => onChange({ ...options, contentLength: l.value })}>
              {l.label}
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{l.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 이미지 수량 */}
      <div>
        <span style={styles.label}>이미지 수량</span>
        <div style={styles.counter}>
          <button style={styles.countBtn}
            onClick={() => onChange({ ...options, imageCount: Math.max(0, imageCount - 1) })}>−</button>
          <span style={styles.countNum}>{imageCount}</span>
          <button style={styles.countBtn}
            onClick={() => onChange({ ...options, imageCount: Math.min(10, imageCount + 1) })}>+</button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>장</span>
          {imageCount === 0 && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
              (글만 생성)
            </span>
          )}
        </div>
      </div>

      {/* 이미지 소스 */}
      {imageCount > 0 && (
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
      )}

      {/* 웹 검색 보충 */}
      <div>
        <div style={styles.toggleRow}>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              🔍 웹 검색으로 내용 보충
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              글감이 부족할 때 관련 정보를 검색해서 보완합니다
            </div>
          </div>
          <button style={styles.toggle(useWebSearch)}
            onClick={() => onChange({ ...options, useWebSearch: !useWebSearch })}>
            <div style={styles.toggleThumb(useWebSearch)} />
          </button>
        </div>

        {/* 글감 부족 경고 */}
        {isTranscriptShort && (
          <div style={{ ...styles.warnBox, marginTop: '8px' }}>
            ⚠️ 글감이 짧습니다 ({transcriptLength}자). 웹 검색을 켜면 관련 정보를 보충해 더 풍부한 글을 작성할 수 있습니다.
            {!useWebSearch && ' 그렇지 않으면 일부 내용을 지어낼 수 있습니다.'}
          </div>
        )}
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
          {customStyles.map(s => (
            <button key={s.id} style={styles.optBtn(tone === s.id)}
              onClick={() => onChange({ ...options, tone: s.id })}>
              <span>{s.name}</span>
              <button style={styles.deleteBtn} onClick={(e) => handleDelete(e, s.id)}>✕</button>
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{s.description}</div>
            </button>
          ))}
        </div>
        {customStyles.length < 4 && (
          <button style={styles.customBtn} onClick={() => setShowModal(true)}>
            + 커스텀 스타일 추가
          </button>
        )}
        {customStyles.length >= 4 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
            커스텀 스타일 최대 4개 (삭제 후 추가 가능)
          </div>
        )}
      </div>

      {/* 크레딧 안내 */}
      <div>
        <span style={styles.label}>💳 예상 크레딧 사용량</span>
        <div style={styles.creditBox}>
          <div style={styles.creditRow}>
            <span>글 작성</span>
            <span>{creditBlog} 크레딧</span>
          </div>
          {imageCount > 0 && (
            <div style={styles.creditRow}>
              <span>이미지 {imageCount}장</span>
              <span>{creditImages} 크레딧</span>
            </div>
          )}
          {useWebSearch && (
            <div style={styles.creditRow}>
              <span>웹 검색 보충</span>
              <span>{creditSearch} 크레딧</span>
            </div>
          )}
          <div style={styles.creditTotal}>
            <span>합계</span>
            <span>{creditTotal} 크레딧</span>
          </div>
        </div>
      </div>

      {/* 커스텀 스타일 모달 */}
      {showModal && (
        <div style={styles.overlay} onClick={handleCloseModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalTitle}>✦ 커스텀 스타일 만들기</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              좋아하는 글 스타일의 예시를 붙여넣으세요. AI가 문체와 어조를 분석해서 스타일을 만들어드립니다.
            </div>
            {!result ? (
              <>
                <textarea style={styles.textarea}
                  placeholder="예시 글을 붙여넣으세요 (50자 이상 권장)"
                  value={exampleText} onChange={e => setExampleText(e.target.value)} />
                <div style={styles.charCount(isOver)}>
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}자
                  {isOver && ' · 초과분은 자동으로 잘립니다'}
                </div>
                {modalError && <div style={{ fontSize: '0.85rem', color: 'var(--error, #e05c5c)' }}>{modalError}</div>}
                <div style={styles.modalBtnRow}>
                  <button style={styles.modalBtn(false)} onClick={handleCloseModal}>취소</button>
                  <button style={styles.modalBtn(true)} onClick={handleAnalyze} disabled={analyzing}>
                    {analyzing ? '분석 중...' : '스타일 분석'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={styles.resultBox}>
                  <div style={styles.resultName}>{result.name}</div>
                  <div style={styles.resultDesc}>{result.description}</div>
                </div>
                <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                  이 스타일로 저장할까요?
                </div>
                {modalError && <div style={{ fontSize: '0.85rem', color: 'var(--error, #e05c5c)' }}>{modalError}</div>}
                <div style={styles.modalBtnRow}>
                  <button style={styles.modalBtn(false)} onClick={() => setResult(null)}>다시 분석</button>
                  <button style={styles.modalBtn(true)} onClick={handleSave}>저장</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
