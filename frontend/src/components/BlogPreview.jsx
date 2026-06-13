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
  hashSection: {
    padding: '20px', borderRadius: '12px',
    background: 'var(--bg-hover)', border: '1px solid var(--border)',
  },
  hashTitle: { fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' },
  hashTabs: { display: 'flex', gap: '8px', marginBottom: '12px' },
  hashContent: {
    fontSize: '0.88rem', lineHeight: 2, color: 'var(--accent)',
    wordBreak: 'break-all',
  },
  toast: (show) => ({
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    padding: '10px 20px', borderRadius: '8px', fontSize: '0.9rem',
    background: 'var(--success)', color: '#fff', fontWeight: 500,
    opacity: show ? 1 : 0, transition: 'opacity 0.3s', pointerEvents: 'none',
    zIndex: 999,
  }),
  stepBox: {
    padding: '16px 20px', borderRadius: '12px',
    background: 'var(--accent-dim)', border: '1px solid var(--accent)',
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  stepTitle: { fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent)' },
  stepDesc: { fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 },
  stepBtnRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  progressDots: { display: 'flex', gap: '6px' },
  dot: (active, done) => ({
    width: '8px', height: '8px', borderRadius: '50%',
    background: done ? 'var(--accent)' : active ? 'var(--accent)' : 'var(--border)',
    opacity: done ? 1 : active ? 1 : 0.4,
  }),
}

// 마크다운을 IMAGE_PLACEHOLDER 기준으로 구간 분할
function splitMarkdownByImages(markdown, images) {
  const placeholderPattern = /!\[[^\]]*\]\(IMAGE_PLACEHOLDER_(\d+)\)/g
  const parts = []
  let lastIndex = 0
  let match

  while ((match = placeholderPattern.exec(markdown)) !== null) {
    const imgIndex = parseInt(match[1]) - 1
    const textBefore = markdown.slice(lastIndex, match.index)
    parts.push({ text: textBefore, image: images[imgIndex] || null, imageIndex: imgIndex + 1 })
    lastIndex = match.index + match[0].length
  }

  // 마지막 텍스트 구간
  const remaining = markdown.slice(lastIndex)
  if (remaining.trim()) {
    parts.push({ text: remaining, image: null, imageIndex: null })
  }

  return parts
}

// 구간 HTML 변환 (네이버용)
function sectionToNaverHtml(section) {
  let html = section.text

  // 제목 변환
  html = html.replace(/^### (.+)$/gm, '<p><span style="font-size:1.1em;font-weight:bold;">$1</span></p>')
  html = html.replace(/^## (.+)$/gm, '<p><span style="font-size:1.3em;font-weight:bold;">$1</span></p>')
  html = html.replace(/^# (.+)$/gm, '<p><span style="font-size:1.6em;font-weight:bold;">$1</span></p>')
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f4f4f4;padding:2px 6px;border-radius:3px;font-size:0.9em;">$1</code>')
  html = html.replace(/\n\n/g, '<br><br>')
  html = html.replace(/\n/g, '<br>')

  // 이미지 추가
  if (section.image && (section.image.permanentUrl || section.image.url)) {
    const imgSrc = section.image.permanentUrl || section.image.url
    const imgAlt = section.image.description || ''
    html += `<img src="${imgSrc}" alt="${imgAlt}" style="max-width:100%;margin:16px 0;" />`
  }

  return html
}

export default function BlogPreview({ markdown, images = [], hashtags = { naver: [], instagram: [] } }) {
  const [tab, setTab] = useState('preview')
  const [toast, setToast] = useState('')
  const [naverStep, setNaverStep] = useState(0)
  const [hashTab, setHashTab] = useState('naver')

  function showToast(msg = '✓ 클립보드에 복사됐습니다') {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  // 순차 복사용 구간 분할
  const sections = splitMarkdownByImages(markdown, images)
  const totalSteps = sections.length

  async function handleNaverStep(stepIndex) {
    const section = sections[stepIndex]
    const html = sectionToNaverHtml(section)
    await copyToClipboard(html)
    showToast(`✓ ${stepIndex + 1}/${totalSteps} 복사됐습니다. 네이버에 붙여넣기 하세요!`)
    setNaverStep(stepIndex + 1)
  }

  function handleNaverReset() {
    setNaverStep(0)
  }

  async function handleCopyTistory() {
    const html = markdownToHtml(markdown, images)
    await copyToClipboard(html)
    showToast()
  }

  async function handleDownloadZip() {
    const zip = new JSZip()
    zip.file('post.md', markdown)

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

      {/* 네이버 순차 붙여넣기 UI */}
      {images.length > 0 && (
        <div style={styles.stepBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={styles.stepTitle}>
              📋 네이버 블로그 순차 붙여넣기
            </span>
            <div style={styles.progressDots}>
              {sections.map((_, i) => (
                <div key={i} style={styles.dot(i === naverStep, i < naverStep)} />
              ))}
            </div>
          </div>

          {naverStep < totalSteps ? (
            <>
              <div style={styles.stepDesc}>
                {naverStep === 0
                  ? `총 ${totalSteps}단계로 나눠서 붙여넣기합니다. 각 단계마다 복사 후 네이버에 붙여넣기 하세요.`
                  : `${naverStep}/${totalSteps} 완료! 네이버에 붙여넣기 후 다음 단계를 눌러주세요.`
                }
                {sections[naverStep]?.image && (
                  <span style={{ color: 'var(--accent)', display: 'block', marginTop: '4px' }}>
                    ✦ 이미지 {sections[naverStep].imageIndex} 포함
                  </span>
                )}
              </div>
              <div style={styles.stepBtnRow}>
                <button style={styles.btn('primary')} onClick={() => handleNaverStep(naverStep)}>
                  {naverStep === 0 ? '1단계 복사 시작' : `${naverStep + 1}단계 복사`}
                </button>
                {naverStep > 0 && (
                  <button style={styles.btn()} onClick={handleNaverReset}>
                    처음부터
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div style={styles.stepDesc}>
                🎉 모든 단계 완료! 네이버 블로그에 글과 이미지가 모두 삽입됐습니다.
              </div>
              <button style={styles.btn()} onClick={handleNaverReset}>
                처음부터 다시
              </button>
            </>
          )}
        </div>
      )}

      {/* 이미지 없을 때 기존 네이버 버튼 */}
      {images.length === 0 && (
        <div style={styles.btnRow}>
          <button style={styles.btn('primary')} onClick={async () => {
            const html = markdownToNaver(markdown, [])
            await copyToClipboard(html)
            showToast()
          }}>
            📋 네이버 블로그에 붙여넣기
          </button>
        </div>
      )}

      {/* 해시태그 섹션 */}
      {(hashtags.naver.length > 0 || hashtags.instagram.length > 0) && (
        <div style={styles.hashSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={styles.hashTitle}>🏷️ 해시태그</span>
            <div style={styles.hashTabs}>
              <button style={styles.tab(hashTab === 'naver')} onClick={() => setHashTab('naver')}>네이버</button>
              <button style={styles.tab(hashTab === 'instagram')} onClick={() => setHashTab('instagram')}>인스타</button>
            </div>
          </div>
          <div style={styles.hashContent}>
            {hashTab === 'naver'
              ? hashtags.naver.map(tag => `#${tag}`).join(' ')
              : hashtags.instagram.map(tag => `#${tag}`).join(' ')
            }
          </div>
          <div style={{ marginTop: '12px' }}>
            <button style={styles.btn()} onClick={async () => {
              const tags = hashTab === 'naver'
                ? hashtags.naver.map(t => `#${t}`).join(' ')
                : hashtags.instagram.map(t => `#${t}`).join(' ')
              await copyToClipboard(tags)
              showToast(`✓ ${hashTab === 'naver' ? '네이버' : '인스타'} 해시태그 복사됐습니다`)
            }}>
              📋 복사
            </button>
          </div>
        </div>
      )}

      {/* 공통 버튼 */}
      <div style={styles.btnRow}>
        <button style={styles.btn()} onClick={handleCopyTistory}>
          📋 티스토리에 붙여넣기
        </button>
        <button style={styles.btn()} onClick={handleDownloadZip}>
          ↓ ZIP 다운로드
        </button>
      </div>

      <div style={styles.toast(!!toast)}>{toast}</div>
    </div>
  )
}
