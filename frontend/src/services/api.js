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

// 커스텀 스타일 목록 조회
export async function getStyles() {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/generate/styles`, { headers })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}

// 커스텀 스타일 생성
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

// 커스텀 스타일 삭제
export async function deleteStyle(id) {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/api/generate/style/${id}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error((await res.json()).error)
  return res.json()
}
