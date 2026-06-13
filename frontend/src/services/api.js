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

// 텍스트 → 블로그 생성
export async function generateBlog(transcript, options) {
  const headers = await getAuthHeader()

  const res = await fetch(`${API_URL}/api/generate/blog`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, ...options }),
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
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
