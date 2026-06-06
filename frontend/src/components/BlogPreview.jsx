import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { markdownToNaver, markdownToHtml, copyToClipboard } from '../utils/markdownToNaver'
import JSZip from 'jszip'

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '20px' },
  tabs: { display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' },
  tab: (active) => ({
    padding: '8px 16px', borderRadius: '8px', fontSize: '0.9rem',
    fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
    background: active ? 'var(--accent-dim)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    border: `1px solid ${active ? 'var(--accent)' : 'transparent'}`,
  }),
  preview: {
    padding: '24px', borderRadius: '12px', background: 'var(--bg-hover)',
    border: '1px solid var(--border)', minHeight: '300px',
    lineHeight: 1.8, color: 'var(--text-primary)',
  },
  btnRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  btn: (variant = 'default') => ({
    padding: '10px 18px', borderRadius: '8px', fontSize: '0.88rem',
    fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
    background: variant === 'primary' ? 'var(--accent)' : 'var(--bg-hover)',
    color: variant === 'primary' ? '#0e0e0e' : 'var(--text-secondary)',
    border: `1px solid ${variant === 'primary' ? 'var(--accent)' : 'var(--border)'}`,
  }),
  images: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' },
  imgCard: {
    borderRadius: '8px', overflow: 'hidden',
    border: '1px solid var(--border)', background: 'var(--bg-hover)',
  },
  imgLabel: {
    padding: '8px 12px', fontSize: '0.8rem',
    color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between',
  },
  toast: (show) => ({
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem',
    background: 'var(--success)', color: '#fff', fontWeight: 500,
    opacity: show ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: 'none',
    zIndex: 999,
  }),
}

export default function BlogPreview({ markdown, images = [] }) {
  const [tab, setTab] = useState('preview')
  const [toast, setToast] = useState(false)

  function showToast() {
    setToast(true)
    setTimeout(() => setToast(false), 2000)
  }

  async function handleCopyNaver() {
    const html = markdownToNaver(markdown, images)
    await copyToClipboard(html)
    showToast()
  }

  async function handleCopyTistory() {
    const html = markdownToHtml(markdown, images)
    await copyToClipboard(html)
    showToast()
  }

  async function handleDownloadZip() {
    const zip = new JSZip()
    zip.file('post.md', markdown)

    // 이미지 다운로드
    await Promise.all(images.map(async (img, i) => {
      if (!img.permanentUrl && !img.url) return
      try {
        const res = await fetch(img.permanentUrl || img.url)
        const blob = await res.blob()
        zip.file(`images/${i + 1}.jpg`, blob)
      } catch {}
    }))

    const blob = await zip.generateAsync({ type: 'blob' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `blog_${Date.now()}.zip`
    a.click()
  }

  return (
    <div style={styles.wrap}>
      {/* 탭 */}
      <div style={styles.tabs}>
        <button style={styles.tab(tab === 'preview')} onClick={() => setTab('preview')}>미리보기</button>
        <button style={styles.tab(tab === 'images')} onClick={() => setTab('images')}>
          이미지 {images.length > 0 && `(${images.length})`}
        </button>
        <button style={styles.tab(tab === 'markdown')} onClick={() => setTab('markdown')}>Markdown 원문</button>
      </div>

      {/* 콘텐츠 */}
      {tab === 'preview' && (
        <div style={styles.preview}>
          <ReactMarkdown>{markdown.replace(/!\[[^\]]*\]\(IMAGE_PLACEHOLDER_\d+\)/g, '')}</ReactMarkdown>
        </div>
      )}

      {tab === 'images' && (
        <div>
          {images.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px' }}>
              이미지가 없습니다
            </div>
          ) : (
            <div style={styles.images}>
              {images.map((img, i) => (
                <div key={i} style={styles.imgCard}>
                  <img src={img.permanentUrl || img.url} alt={img.description}
                    style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />
                  <div style={styles.imgLabel}>
                    <span>이미지 {i + 1}</span>
                    <a href={img.permanentUrl || img.url} download={`${i + 1}.jpg`}
                      style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>↓ 저장</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'markdown' && (
        <div style={{ ...styles.preview, fontFamily: 'monospace', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
          {markdown}
        </div>
      )}

      {/* 액션 버튼 */}
      <div style={styles.btnRow}>
        <button style={styles.btn('primary')} onClick={handleCopyNaver}>
          📋 네이버 블로그에 붙여넣기
        </button>
        <button style={styles.btn()} onClick={handleCopyTistory}>
          📋 티스토리에 붙여넣기
        </button>
        <button style={styles.btn()} onClick={handleDownloadZip}>
          ↓ ZIP 다운로드
        </button>
      </div>

      {/* 네이버 이미지 안내 */}
      {images.length > 0 && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px',
          background: 'var(--accent-dim)', border: '1px solid var(--accent)',
          fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6,
        }}>
          💡 네이버 블로그: 텍스트 붙여넣기 후, 이미지 탭에서 번호 순서대로 해당 위치에 업로드하세요.
        </div>
      )}

      <div style={styles.toast(toast)}>✓ 클립보드에 복사됐습니다</div>
    </div>
  )
}
