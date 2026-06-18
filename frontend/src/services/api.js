import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('로그인이 필요합니다.')
  return { Authorization: `Bearer ${session.access_token}` }
}

// 음성 파일 → 텍스트
export async function transcribeAudio(file) {
  const headers = await getAuthHeader()
  const formData = new FormData()
  formData.append('audio', file)

  const res = await fetch(`${API_URL}/api/transcribe`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

/**
 * 블로그 생성 — SSE 스트리밍
 *
 * onProgress({ phase, status, current, total, url, index })  — 진행 이벤트
 * onBlogChunk(text)  — 블로그 텍스트 청크 (실시간 타이핑)
 *
 * 반환: { generationId, markdown, hashtags, images }
 */
export async function generateBlog(transcript, options, { onProgress, onBlogChunk } = {}) {
  const headers = await getAuthHeader()

  const res = await fetch(`${API_URL}/api/generate/blog`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, ...options }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `서버 오류 (${res.status})`)
  }

  // SSE 스트림 파싱
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // SSE는 '\n\n'으로 이벤트 구분
    const parts = buffer.split('\n\n')
    buffer = parts.pop() // 마지막 불완전 조각 보류

    for (const part of parts) {
      const lines = part.split('\n')
      let eventName = 'message'
      let dataStr = ''

      for (const line of lines) {
        if (line.startsWith('event: ')) eventName = line.slice(7).trim()
        else if (line.startsWith('data: ')) dataStr += line.slice(6)
      }

      if (!dataStr) continue
      let data
      try { data = JSON.parse(dataStr) } catch { continue }

      if (eventName === 'progress' && onProgress) {
        onProgress(data)
      } else if (eventName === 'blog_chunk' && onBlogChunk) {
        onBlogChunk(data.text)
      } else if (eventName === 'done') {
        result = data
      } else if (eventName === 'error') {
        throw new Error(data.error || '서버 오류')
      }
    }
  }

  if (!result) throw new Error('응답이 완료되지 않았습니다.')
  return result
}

// 이미지 생성
export async function generateImages(generationId, markdown, options) {
  const headers = await getAuthHeader()

  const res = await fetch(`${API_URL}/api/generate/images`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ generationId, markdown, ...options }),
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

// 생성 이력 조회
export async function getGenerations() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/generations`, { headers })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

// 이력 상세 조회
export async function getGeneration(id) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/generations/${id}`, { headers })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

// ─── 커스텀 스타일 ────────────────────────────────────

export async function getStyles() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/generate/styles`, { headers })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function analyzeStyle(exampleText) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/generate/style`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ exampleText }),
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function deleteStyle(id) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/generate/style/${id}`, {
    method: 'DELETE', headers,
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

// ─── 프로필 ───────────────────────────────────────────

export async function getProfiles() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles`, { headers })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function createProfile(name) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function updateProfile(id, name) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles/${id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function deleteProfile(id) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles/${id}`, {
    method: 'DELETE', headers,
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

// ─── 해시태그 그룹 ────────────────────────────────────

export async function createHashtagGroup(profileId, { name, naverTags, instagramTags }) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles/${profileId}/hashtag-groups`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, naverTags, instagramTags }),
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function updateHashtagGroup(groupId, { name, naverTags, instagramTags }) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles/hashtag-groups/${groupId}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, naverTags, instagramTags }),
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function deleteHashtagGroup(groupId) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles/hashtag-groups/${groupId}`, {
    method: 'DELETE', headers,
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

// ─── 블로그 서명 ──────────────────────────────────────

export async function createSignature(profileId, { name, htmlContent }) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles/${profileId}/signatures`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, htmlContent }),
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function updateSignature(sigId, { name, htmlContent }) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles/signatures/${sigId}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, htmlContent }),
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function deleteSignature(sigId) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles/signatures/${sigId}`, {
    method: 'DELETE', headers,
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

// ─── 카드뉴스 이미지 생성 (ImageGen) ─────────────────

export async function generateCardImage({ prompt, count, size, quality, scene, korText, refImageFile }) {
  const headers = await getAuthHeader()

  const formData = new FormData()
  formData.append('prompt', prompt)
  formData.append('count', count)
  formData.append('size', size)
  formData.append('quality', quality)
  if (scene)   formData.append('scene', scene)
  if (korText) formData.append('korText', korText)
  if (refImageFile) formData.append('refImage', refImageFile)

  const res = await fetch(`${API_URL}/api/imagegen/generate`, {
    method: 'POST',
    headers, // Content-Type은 FormData가 자동 설정
    body: formData,
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function getStyleImage() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/imagegen/style-image`, { headers })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function uploadStyleImage(file) {
  const headers = await getAuthHeader()
  const formData = new FormData()
  formData.append('styleImage', file)
  const res = await fetch(`${API_URL}/api/imagegen/style-image`, {
    method: 'POST',
    headers,
    body: formData,
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function generateCardHashtags(scene, korText) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/imagegen/hashtags`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ scene, korText }),
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function getImageGenHistory() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/imagegen/history`, { headers })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

export async function deleteImageGenHistory(id) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/imagegen/history/${id}`, { method: 'DELETE', headers })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

// 전체 이미지 라이브러리
export async function getAllImages() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/generations/images/all`, { headers })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}
