import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('로그인이 필요합니다.')
  return { Authorization: `Bearer ${session.access_token}` }
}

// ── 크레딧 부족 전용 에러 클래스 ──────────────────────────
export class InsufficientCreditsError extends Error {
  constructor(balance, required) {
    super(`크레딧이 부족합니다. (필요: ${required}, 잔여: ${balance})`)
    this.name = 'InsufficientCreditsError'
    this.balance = balance
    this.required = required
  }
}

// ── 에러 파싱 헬퍼 ────────────────────────────────────────
async function handleError(res) {
  const body = await res.json().catch(() => ({ error: '알 수 없는 오류' }))
  if (res.status === 402) throw new InsufficientCreditsError(body.balance, body.required)
  throw new Error(body.error || `HTTP ${res.status}`)
}

// 음성 파일 → 텍스트
export async function transcribeAudio(file) {
  const headers = await getAuthHeader()
  const formData = new FormData()
  formData.append('audio', file)
  const res = await fetch(`${API_URL}/api/transcribe`, { method: 'POST', headers, body: formData })
  if (!res.ok) await handleError(res)
  return res.json()
}

// 텍스트 → 블로그 생성 (SSE 스트리밍)
export async function generateBlog(transcript, options, { onProgress, onBlogChunk } = {}) {
  const headers = await getAuthHeader()

  const res = await fetch(`${API_URL}/api/generate/blog`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, ...options }),
  })

  if (!res.ok) await handleError(res)

  // SSE 스트림 파싱
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })

    // '\n\n'으로 이벤트 단위 분리
    const parts = buffer.split('\n\n')
    buffer = parts.pop()

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

      if (eventName === 'progress' && onProgress) onProgress(data)
      else if (eventName === 'blog_chunk' && onBlogChunk) onBlogChunk(data.text)
      else if (eventName === 'sse_done') result = data
      else if (eventName === 'error') throw new Error(data.error || '서버 오류')
    }
  }

  if (!result) throw new Error('응답이 완료되지 않았습니다.')
  return result
}

// 생성 이력 조회
export async function getGenerations() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/generations`, { headers })
  if (!res.ok) await handleError(res)
  return res.json()
}

// 이력 상세 조회
export async function getGeneration(id) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/generations/${id}`, { headers })
  if (!res.ok) await handleError(res)
  return res.json()
}

// ─── 커스텀 스타일 ────────────────────────────────────

export async function getStyles() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/generate/styles`, { headers })
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function analyzeStyle(exampleText) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/generate/style`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ exampleText }),
  })
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function deleteStyle(id) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/generate/style/${id}`, { method: 'DELETE', headers })
  if (!res.ok) await handleError(res)
  return res.json()
}

// ─── 프로필 ───────────────────────────────────────────

export async function getProfiles() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles`, { headers })
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function createProfile(name) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function updateProfile(id, name) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles/${id}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function deleteProfile(id) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles/${id}`, { method: 'DELETE', headers })
  if (!res.ok) await handleError(res)
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
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function updateHashtagGroup(groupId, { name, naverTags, instagramTags }) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles/hashtag-groups/${groupId}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, naverTags, instagramTags }),
  })
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function deleteHashtagGroup(groupId) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles/hashtag-groups/${groupId}`, { method: 'DELETE', headers })
  if (!res.ok) await handleError(res)
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
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function updateSignature(sigId, { name, htmlContent }) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles/signatures/${sigId}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, htmlContent }),
  })
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function deleteSignature(sigId) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/profiles/signatures/${sigId}`, { method: 'DELETE', headers })
  if (!res.ok) await handleError(res)
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
  if (scene)        formData.append('scene', scene)
  if (korText)      formData.append('korText', korText)
  if (refImageFile) formData.append('refImage', refImageFile)
  const res = await fetch(`${API_URL}/api/imagegen/generate`, { method: 'POST', headers, body: formData })
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function getStyleImage() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/imagegen/style-image`, { headers })
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function uploadStyleImage(file) {
  const headers = await getAuthHeader()
  const formData = new FormData()
  formData.append('styleImage', file)
  const res = await fetch(`${API_URL}/api/imagegen/style-image`, { method: 'POST', headers, body: formData })
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function generateCardHashtags(scene, korText) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/imagegen/hashtags`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ scene, korText }),
  })
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function getImageGenHistory() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/imagegen/history`, { headers })
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function deleteImageGenHistory(id) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/imagegen/history/${id}`, { method: 'DELETE', headers })
  if (!res.ok) await handleError(res)
  return res.json()
}

// 전체 이미지 라이브러리
export async function getAllImages() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/generations/images/all`, { headers })
  if (!res.ok) await handleError(res)
  return res.json()
}

// ─── 플랜 + 크레딧 통합 조회 ─────────────────────────

export async function getMyPlan() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/credits/plan`, { headers })
  if (!res.ok) await handleError(res)
  return res.json()
}

// ─── 크레딧 ───────────────────────────────────────────

export async function getCredits() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/credits`, { headers })
  if (!res.ok) await handleError(res)
  return res.json()
}

// ─── 관리자 ───────────────────────────────────────────

export async function adminGetUsers() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/admin/users`, { headers })
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function adminGrantCredits(userId, amount) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/admin/grant-credits`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, amount }),
  })
  if (!res.ok) await handleError(res)
  return res.json()
}

export async function adminUpdateUser(userId, values) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  })
  if (!res.ok) await handleError(res)
  return res.json()
}
