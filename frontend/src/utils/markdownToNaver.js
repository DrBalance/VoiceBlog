/**
 * Markdown → 네이버 스마트에디터 최적화 HTML 변환
 */
export function markdownToNaver(markdown, images = []) {
  let html = markdown

  // 이미지 플레이스홀더를 실제 이미지로 교체
  images.forEach((img, i) => {
    const placeholder = `IMAGE_PLACEHOLDER_${i + 1}`
    if (img.permanentUrl || img.url) {
      html = html.replace(
        new RegExp(`!\\[[^\\]]*\\]\\(${placeholder}\\)`, 'g'),
        `<img src="${img.permanentUrl || img.url}" alt="${img.description || ''}" style="max-width:100%;margin:16px 0;" />`
      )
    }
  })

  // 남은 플레이스홀더 제거
  html = html.replace(/!\[[^\]]*\]\(IMAGE_PLACEHOLDER_\d+\)/g, '')

  // 제목 변환 (네이버는 font-size로 처리, 명시적 font-weight 지정)
  html = html.replace(/^### (.+)$/gm, '<p><span style="font-size:1.1em;font-weight:bold;">$1</span></p>')
  html = html.replace(/^## (.+)$/gm, '<p><span style="font-size:1.3em;font-weight:bold;">$1</span></p>')
  html = html.replace(/^# (.+)$/gm, '<p><span style="font-size:1.6em;font-weight:bold;">$1</span></p>')

  // 볼드/이탤릭 (명시적 스타일 지정)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong style="font-weight:bold;"><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<span style="font-weight:bold;">$1</span>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // 인라인 코드
  html = html.replace(/`([^`]+)`/g, '<code style="background:#f4f4f4;padding:2px 6px;border-radius:3px;font-size:0.9em;font-weight:normal;">$1</code>')

  // 수평선
  html = html.replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />')

  // 단락 단위로 분리해서 각각 normal 처리
  const lines = html.split('\n')
  const processedLines = lines.map(line => {
    // 이미 HTML 태그로 시작하는 줄은 그대로
    if (line.trim().startsWith('<')) return line
    // 빈 줄은 그대로
    if (line.trim() === '') return line
    // 일반 텍스트는 font-weight:normal로 감싸기
    return `<p style="font-weight:normal;line-height:1.8;">${line}</p>`
  })

  html = processedLines.join('\n')

  // 연속된 빈 줄 정리
  html = html.replace(/\n{3,}/g, '\n\n')

  return html
}

/**
 * Markdown → 티스토리용 일반 HTML 변환
 */
export function markdownToHtml(markdown, images = []) {
  let html = markdown

  images.forEach((img, i) => {
    const placeholder = `IMAGE_PLACEHOLDER_${i + 1}`
    if (img.permanentUrl || img.url) {
      html = html.replace(
        new RegExp(`!\\[[^\\]]*\\]\\(${placeholder}\\)`, 'g'),
        `<figure><img src="${img.permanentUrl || img.url}" alt="${img.description || ''}" style="max-width:100%;" /><figcaption>${img.description || ''}</figcaption></figure>`
      )
    }
  })

  html = html.replace(/!\[[^\]]*\]\(IMAGE_PLACEHOLDER_\d+\)/g, '')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/^---$/gm, '<hr />')
  html = html.replace(/\n\n/g, '</p><p>')
  html = `<p>${html}</p>`

  return html
}

/**
 * 클립보드에 HTML 복사
 */
export async function copyToClipboard(html) {
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([html.replace(/<[^>]+>/g, '')], { type: 'text/plain' }),
      }),
    ])
    return true
  } catch {
    await navigator.clipboard.writeText(html.replace(/<[^>]+>/g, ''))
    return true
  }
}
