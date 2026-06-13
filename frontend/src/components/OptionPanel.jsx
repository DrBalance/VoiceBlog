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

const MAX_CHARS = 1000

export default function OptionPanel({ options, onChange }) {
  const { imageCount, imageSource, tone } = options
  const [customStyles, setCustomStyles] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [exampleText, setExampleText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null) // 분석 결과 미리보기
  const [modalError, setModalError] = useState('')

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

  const charCount = exampleText.length
  const isOver = charCount > MAX_CHARS

  return (
    <div style={styles.wrap}>
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

      {/* 이미지 소스 — imageCount > 0일 때만 표시 */}
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

          {/* 커스텀 스타일 버튼들 */}
          {customStyles.map(s => (
            <button key={s.id} style={styles.optBtn(tone === s.id)}
              onClick={() => onChange({ ...options, tone: s.id })}>
              <span>{s.name}</span>
              <button style={styles.deleteBtn} onClick={(e) => handleDelete(e, s.id)}>✕</button>
              <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{s.description}</div>
            </button>
          ))}
        </div>

        {/* 커스텀 스타일 추가 버튼 */}
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

      {/* 모달 */}
      {showModal && (
        <div style={styles.overlay} onClick={handleCloseModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalTitle}>✦ 커스텀 스타일 만들기</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              좋아하는 글 스타일의 예시를 붙여넣으세요. AI가 문체와 어조를 분석해서 스타일을 만들어드립니다.
            </div>

            {!result ? (
              <>
                <textarea
                  style={styles.textarea}
                  placeholder="예시 글을 붙여넣으세요 (50자 이상 권장)"
                  value={exampleText}
                  onChange={e => setExampleText(e.target.value)}
                />
                <div style={styles.charCount(isOver)}>
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}자
                  {isOver && ' · 초과분은 자동으로 잘립니다'}
                </div>
                {modalError && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--error, #e05c5c)' }}>{modalError}</div>
                )}
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
                  이 스타일로 저장할까요? 저장 후 톤앤매너에서 선택할 수 있습니다.
                </div>
                {modalError && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--error, #e05c5c)' }}>{modalError}</div>
                )}
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
