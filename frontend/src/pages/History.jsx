import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getGenerations, getGeneration } from '../services/api'
import ReactMarkdown from 'react-markdown'

const styles = {
  page: { maxWidth: '800px', margin: '0 auto', padding: '48px 24px' },
  title: { fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 400, marginBottom: '32px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  item: {
    padding: '20px 24px', borderRadius: '12px', background: 'var(--bg-card)',
    border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.2s',
  },
  date: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' },
  excerpt: { fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 },
  badges: { display: 'flex', gap: '6px', marginTop: '10px' },
  badge: {
    padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem',
    background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)',
  },
  empty: { textAlign: 'center', padding: '60px', color: 'var(--text-muted)' },
  // 모달
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '20px',
  },
  modal: {
    background: 'var(--bg-card)', borderRadius: '16px',
    width: '100%', maxWidth: '720px', maxHeight: '85vh',
    display: 'flex', flexDirection: 'column',
    border: '1px solid var(--border)', overflow: 'hidden',
  },
  modalHead: {
    padding: '20px 24px', borderBottom: '1px solid var(--border)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexShrink: 0,
  },
  modalTitle: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' },
  modalBody: { padding: '24px', overflowY: 'auto', flex: 1 },
  modalFoot: {
    padding: '16px 24px', borderTop: '1px solid var(--border)',
    display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0,
  },
  btn: (primary) => ({
    padding: '10px 20px', borderRadius: '8px', fontSize: '0.88rem',
    fontWeight: 500, cursor: 'pointer',
    background: primary ? 'var(--accent)' : 'var(--bg-hover)',
    color: primary ? '#0e0e0e' : 'var(--text-secondary)',
    border: `1px solid ${primary ? 'var(--accent)' : 'var(--border)'}`,
  }),
  closeBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    color: 'var(--text-muted)', fontSize: '1.2rem', padding: '4px',
  },
  preview: {
    padding: '20px', borderRadius: '10px',
    background: 'var(--bg-hover)', border: '1px solid var(--border)',
    lineHeight: 1.8, color: 'var(--text-primary)', marginBottom: '16px',
  },
  imgGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: '10px', marginTop: '16px',
  },
  imgCard: { borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' },
  sectionLabel: {
    fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-secondary)',
    marginBottom: '10px', marginTop: '16px',
  },
}

const TONE_LABELS = {
  informative: '정보전달형', friendly: '친근한 일상체',
  expert: '전문가형', storytelling: '스토리텔링',
}

export default function History() {
  const navigate = useNavigate()
  const [generations, setGenerations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null) // 모달용
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    getGenerations()
      .then(({ generations }) => setGenerations(generations))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleOpen(gen) {
    setLoadingDetail(true)
    setSelected({ ...gen, loading: true })
    try {
      const { generation, images } = await getGeneration(gen.id)
      setSelected({ ...generation, images })
    } catch {
      setSelected({ ...gen, images: [], loadError: true })
    } finally {
      setLoadingDetail(false)
    }
  }

  function handleClose() {
    setSelected(null)
  }

  function handleLoadToResult() {
    if (!selected) return
    navigate('/', {
      state: {
        restore: {
          markdown: selected.content_markdown,
          images: selected.images || [],
          hashtags: { naver: [], instagram: [] },
        }
      }
    })
  }

  function excerpt(text) {
    return text?.slice(0, 80) + (text?.length > 80 ? '...' : '')
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })
  }

  if (loading) return (
    <div style={{ ...styles.page, color: 'var(--text-muted)' }}>불러오는 중...</div>
  )

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>생성 이력</h1>

      {generations.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📝</div>
          아직 생성된 포스트가 없습니다
        </div>
      ) : (
        <div style={styles.list}>
          {generations.map((g) => (
            <div key={g.id} style={styles.item} onClick={() => handleOpen(g)}>
              <div style={styles.date}>{formatDate(g.created_at)}</div>
              <div style={styles.excerpt}>{excerpt(g.transcript)}</div>
              <div style={styles.badges}>
                <span style={styles.badge}>{TONE_LABELS[g.tone] || g.tone}</span>
                <span style={styles.badge}>이미지 {g.image_count}장</span>
                <span style={styles.badge}>{g.image_source === 'dalle' ? 'AI 생성' : '스톡'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 상세 모달 */}
      {selected && (
        <div style={styles.overlay} onClick={handleClose}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHead}>
              <div>
                <div style={styles.modalTitle}>{formatDate(selected.created_at)}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {TONE_LABELS[selected.tone] || selected.tone} · 이미지 {selected.image_count}장
                </div>
              </div>
              <button style={styles.closeBtn} onClick={handleClose}>✕</button>
            </div>

            <div style={styles.modalBody}>
              {selected.loading || loadingDetail ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  불러오는 중...
                </div>
              ) : selected.loadError ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  불러오기에 실패했습니다
                </div>
              ) : (
                <>
                  {/* 마크다운 미리보기 */}
                  <div style={styles.sectionLabel}>📄 블로그 글</div>
                  <div style={styles.preview}>
                    <ReactMarkdown>
                      {selected.content_markdown?.replace(/!\[[^\]]*\]\(IMAGE_PLACEHOLDER_\d+\)/g, '') || ''}
                    </ReactMarkdown>
                  </div>

                  {/* 이미지 */}
                  {selected.images?.length > 0 && (
                    <>
                      <div style={styles.sectionLabel}>🖼 이미지 ({selected.images.length}장)</div>
                      <div style={styles.imgGrid}>
                        {selected.images.map((img, i) => (
                          <div key={i} style={styles.imgCard}>
                            <img src={img.url} alt={img.name}
                              style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} />
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            <div style={styles.modalFoot}>
              <button style={styles.btn(false)} onClick={handleClose}>닫기</button>
              <button style={styles.btn(true)} onClick={handleLoadToResult}
                disabled={selected.loading || loadingDetail}>
                결과 화면으로 불러오기 →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
