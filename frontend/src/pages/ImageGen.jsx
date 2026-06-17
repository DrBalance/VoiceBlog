import { useState, useRef, useEffect } from 'react'
import { generateCardImage, getImageGenHistory, deleteImageGenHistory } from '../services/api'

const STYLE_PROMPT = `Illustration style: Korean webtoon / SNS health card news style.
Image size: 1254 x 1254px, square format (1:1 ratio).
White background.
Simple 2D flat illustration with bold, slightly rough hand-drawn black outlines.
Minimal flat coloring — warm beige/peach skin tone, soft pink accents, no gradients.
Slight crayon/sketch texture on lines, imperfect and natural-looking strokes.
Cute, simplified rounded character design (Korean SNS style).
Korean handwritten-style black text in upper-left corner.
Simple white speech bubble with black outline if needed.
Generous negative space. Object or character placed center-right.
No shadows, no complex shading.`

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

const s = {
  page: { maxWidth: '720px', margin: '0 auto', padding: '48px 24px' },
  header: { marginBottom: '32px' },
  title: { fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px', letterSpacing: '-0.02em' },
  titleAccent: { color: 'var(--accent)', fontStyle: 'italic' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '0.95rem' },

  // 탭
  tabs: { display: 'flex', gap: '4px', marginBottom: '28px', background: 'var(--bg-card)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)' },
  tab: (active) => ({
    flex: 1, padding: '10px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: active ? 600 : 400,
    cursor: 'pointer', border: 'none', transition: 'all 0.2s',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#0e0e0e' : 'var(--text-secondary)',
  }),

  card: { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px', marginBottom: '16px' },
  cardTitle: { fontSize: '0.9rem', fontWeight: 600, marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  textarea: { width: '100%', minHeight: '100px', padding: '14px', background: 'var(--bg-input, #1a1a1a)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.95rem', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' },
  input: { width: '100%', padding: '12px 14px', background: 'var(--bg-input, #1a1a1a)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' },

  dropzone: (isDragging) => ({ border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`, borderRadius: '12px', padding: '20px', background: isDragging ? 'var(--accent-dim)' : 'transparent', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }),
  dropzoneText: { color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '8px' },
  dropzoneHint: { color: 'var(--text-muted)', fontSize: '0.78rem', opacity: 0.6 },
  refImgPreviewWrap: { display: 'flex', alignItems: 'center', gap: '14px' },
  refImgPreview: { width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)', flexShrink: 0 },
  refImgInfo: { flex: 1, textAlign: 'left' },
  refImgName: { fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '4px' },
  refImgDesc: { fontSize: '0.78rem', color: 'var(--accent)' },
  removeBtn: { padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', color: '#ff6b6b', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.3)', cursor: 'pointer', flexShrink: 0 },

  optionRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  optionBtn: (active) => ({ flex: 1, minWidth: '80px', padding: '10px 8px', borderRadius: '10px', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent-dim)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }),
  countRow: { display: 'flex', gap: '8px' },
  countBtn: (active) => ({ width: '48px', height: '48px', borderRadius: '10px', border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`, background: active ? 'var(--accent-dim)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '1rem', fontWeight: active ? 700 : 400, cursor: 'pointer', transition: 'all 0.2s' }),

  promptPreview: { marginTop: '12px', padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '120px', overflow: 'hidden' },
  promptToggle: { fontSize: '0.8rem', color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none', padding: '4px 0', marginTop: '6px' },

  generateBtn: { width: '100%', padding: '16px', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', background: 'var(--accent)', color: '#0e0e0e', border: 'none', marginTop: '8px' },
  generateBtnDisabled: { width: '100%', padding: '16px', borderRadius: '12px', fontSize: '1rem', fontWeight: 600, background: 'var(--border)', color: 'var(--text-muted)', border: 'none', cursor: 'not-allowed', marginTop: '8px' },

  progressWrap: { textAlign: 'center', padding: '32px 0' },
  spinner: { width: '40px', height: '40px', border: '3px solid var(--border)', borderTop: '3px solid var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' },
  progressText: { color: 'var(--text-secondary)', fontSize: '0.95rem' },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginTop: '8px' },
  imgWrap: { borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', background: 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%) 0 0 / 20px 20px', position: 'relative' },
  img: { width: '100%', display: 'block' },
  downloadBtn: { position: 'absolute', bottom: '10px', right: '10px', padding: '8px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(14,14,14,0.85)', color: 'var(--accent)', border: '1px solid var(--accent)', backdropFilter: 'blur(6px)' },

  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, marginLeft: '8px', background: 'var(--accent-dim)', color: 'var(--accent)' },
  error: { padding: '14px', borderRadius: '10px', fontSize: '0.9rem', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.3)', color: '#ff6b6b', marginBottom: '16px' },

  // 이력 탭
  historyGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' },
  historyItem: { borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)', overflow: 'hidden' },
  historyImg: { width: '100%', display: 'block', background: 'repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%) 0 0 / 16px 16px' },
  historyMeta: { padding: '10px 12px' },
  historyDate: { fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' },
  historyScene: { fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  historyActions: { display: 'flex', gap: '6px' },
  historyDlBtn: { flex: 1, padding: '6px', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)' },
  historyDelBtn: { padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem', cursor: 'pointer', background: 'rgba(255,80,80,0.08)', color: '#ff6b6b', border: '1px solid rgba(255,80,80,0.3)' },
  emptyMsg: { textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0', fontSize: '0.95rem' },
}

// ── 다운로드 헬퍼 (blob 방식 — 브라우저에서 바로 저장) ─────
async function downloadImage(url, filename) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch {
    // fetch 실패 시 fallback
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.target = '_blank'
    a.click()
  }
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function ImageGen() {
  const [tab, setTab]             = useState('generate') // 'generate' | 'history'
  const [scene, setScene]         = useState('')
  const [korText, setKorText]     = useState('')
  const [refImage, setRefImage]   = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [count, setCount]         = useState(1)
  const [size, setSize]           = useState('1024x1024')
  const [quality, setQuality]     = useState('medium')
  const [showPrompt, setShowPrompt] = useState(false)
  const [loading, setLoading]     = useState(false)
  const [images, setImages]       = useState([])
  const [error, setError]         = useState('')
  const [history, setHistory]     = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const fileInputRef              = useRef(null)

  const buildPrompt = () => {
    let p = STYLE_PROMPT
    if (refImage) p += `\n\nA reference image is provided — match its illustration style exactly.`
    if (scene.trim())   p += `\n\nScene to illustrate: ${scene.trim()}`
    if (korText.trim()) p += `\nKorean text to include: "${korText.trim()}"`
    return p
  }

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setRefImage({ file, previewUrl: URL.createObjectURL(file) })
  }

  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]) }
  const handleRemoveRef = () => { if (refImage?.previewUrl) URL.revokeObjectURL(refImage.previewUrl); setRefImage(null) }

  const handleGenerate = async () => {
    if (!scene.trim()) return
    setError(''); setLoading(true); setImages([])
    try {
      const result = await generateCardImage({ prompt: buildPrompt(), count, size, quality, scene, korText, refImageFile: refImage?.file ?? null })
      setImages(result.images || [])
    } catch (e) {
      setError(e.message || '이미지 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    setHistoryLoading(true)
    try {
      const data = await getImageGenHistory()
      setHistory(data.history || [])
    } catch (e) {
      console.error(e)
    } finally {
      setHistoryLoading(false)
    }
  }

  const handleDeleteHistory = async (id) => {
    if (!window.confirm('이 이미지를 삭제할까요?')) return
    try {
      await deleteImageGenHistory(id)
      setHistory(prev => prev.filter(h => h.id !== id))
    } catch (e) {
      alert('삭제 실패: ' + e.message)
    }
  }

  useEffect(() => { if (tab === 'history') loadHistory() }, [tab])

  const canGenerate = scene.trim().length > 0 && !loading

  return (
    <div style={s.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <div style={s.header}>
        <h1 style={s.title}>Card<span style={s.titleAccent}>Image</span></h1>
        <p style={s.subtitle}>Dr. Balance 카드뉴스 일러스트 생성기</p>
      </div>

      {/* 탭 */}
      <div style={s.tabs}>
        <button style={s.tab(tab === 'generate')} onClick={() => setTab('generate')}>✦ 새 이미지 생성</button>
        <button style={s.tab(tab === 'history')} onClick={() => setTab('history')}>🗂 생성 이력</button>
      </div>

      {/* ── 생성 탭 ── */}
      {tab === 'generate' && (
        <>
          <div style={s.card}>
            <div style={s.cardTitle}>장면 설명 *</div>
            <textarea style={s.textarea} placeholder="예: 여성이 손으로 종아리를 꾹 눌렀을 때 자국이 남는 모습" value={scene} onChange={e => setScene(e.target.value)} />
          </div>

          <div style={s.card}>
            <div style={s.cardTitle}>이미지 안 한국어 텍스트 (선택)</div>
            <input style={s.input} placeholder='예: 눌렀을 때 자국이 남아요...' value={korText} onChange={e => setKorText(e.target.value)} />
          </div>

          <div style={s.card}>
            <div style={s.cardTitle}>
              참고 이미지 (선택)
              {refImage && <span style={s.badge}>스타일 참조 ON</span>}
            </div>
            {refImage ? (
              <div style={s.refImgPreviewWrap}>
                <img src={refImage.previewUrl} alt="참고이미지" style={s.refImgPreview} />
                <div style={s.refImgInfo}>
                  <div style={s.refImgName}>{refImage.file.name}</div>
                  <div style={s.refImgDesc}>이 이미지의 스타일을 참고해서 생성합니다</div>
                </div>
                <button style={s.removeBtn} onClick={handleRemoveRef}>제거</button>
              </div>
            ) : (
              <div style={s.dropzone(isDragging)} onClick={() => fileInputRef.current?.click()} onDragOver={e => { e.preventDefault(); setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
                <div style={s.dropzoneText}>🖼 이미지를 드래그하거나 클릭해서 업로드</div>
                <div style={s.dropzoneHint}>PNG, JPG 지원 · 이전에 생성한 이미지를 붙이면 스타일이 더 일관됩니다</div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          </div>

          <div style={s.card}>
            <div style={s.cardTitle}>옵션</div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>수량</div>
              <div style={s.countRow}>{[1,2,3,4].map(n => <button key={n} style={s.countBtn(count===n)} onClick={() => setCount(n)}>{n}</button>)}</div>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>사이즈</div>
              <div style={s.optionRow}>{SIZE_OPTIONS.map(o => <button key={o.value} style={s.optionBtn(size===o.value)} onClick={() => setSize(o.value)}>{o.icon} {o.label}</button>)}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>품질</div>
              <div style={s.optionRow}>{QUALITY_OPTIONS.map(o => <button key={o.value} style={s.optionBtn(quality===o.value)} onClick={() => setQuality(o.value)}><div>{o.label}</div><div style={{ fontSize: '0.75rem', marginTop: '2px', opacity: 0.7 }}>{o.desc}</div></button>)}</div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <button style={s.promptToggle} onClick={() => setShowPrompt(v => !v)}>{showPrompt ? '▲ 스타일 프롬프트 숨기기' : '▼ 스타일 프롬프트 보기'}</button>
            {showPrompt && <div style={s.promptPreview}>{buildPrompt()}</div>}
          </div>

          {error && <div style={s.error}>⚠️ {error}</div>}

          <button style={canGenerate ? s.generateBtn : s.generateBtnDisabled} onClick={handleGenerate} disabled={!canGenerate}>
            {loading ? '생성 중...' : `이미지 생성 (${count}장)${refImage ? ' · 스타일 참조' : ''}`}
          </button>

          {loading && (
            <div style={s.progressWrap}>
              <div style={s.spinner} />
              <div style={s.progressText}>{refImage ? '참고 이미지 스타일 분석 중...' : 'gpt-image-2 생성 중...'} 잠시만 기다려 주세요</div>
            </div>
          )}

          {images.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <div style={s.cardTitle}>생성 결과 ({images.length}장)</div>
              <div style={s.grid}>
                {images.map((img, i) => (
                  <div key={i} style={s.imgWrap}>
                    <img src={img.url} alt={`생성 이미지 ${i+1}`} style={s.img} />
                    <button style={s.downloadBtn} onClick={() => downloadImage(img.url, `card_${Date.now()}_${i+1}.png`)}>↓ 다운로드</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── 이력 탭 ── */}
      {tab === 'history' && (
        <>
          {historyLoading ? (
            <div style={s.progressWrap}><div style={s.spinner} /><div style={s.progressText}>불러오는 중...</div></div>
          ) : history.length === 0 ? (
            <div style={s.emptyMsg}>아직 생성된 이미지가 없어요</div>
          ) : (
            <div style={s.historyGrid}>
              {history.map(item => (
                <div key={item.id} style={s.historyItem}>
                  <img src={item.public_url} alt={item.scene} style={s.historyImg} />
                  <div style={s.historyMeta}>
                    <div style={s.historyDate}>{new Date(item.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    <div style={s.historyScene}>{item.scene || '(장면 설명 없음)'}</div>
                    <div style={s.historyActions}>
                      <button style={s.historyDlBtn} onClick={() => downloadImage(item.public_url, `card_${item.id}.png`)}>↓ 다운로드</button>
                      <button style={s.historyDelBtn} onClick={() => handleDeleteHistory(item.id)}>🗑</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
