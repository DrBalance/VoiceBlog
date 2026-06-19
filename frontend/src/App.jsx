// ─────────────────────────────────────────────────────────────
// App.jsx  (크레딧 배지 포함 버전)
// ─────────────────────────────────────────────────────────────
import { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { supabase } from './services/supabase'
import Home from './pages/Home'
import Login from './pages/Login'
import History from './pages/History'
import Settings from './pages/Settings'
import ImageGen from './pages/ImageGen'
import Admin from './pages/Admin'
import Manual from './pages/Manual'

const API_URL = import.meta.env.VITE_API_URL
const OWNER_EMAIL = 'drbalance@naver.com'

// ── 크레딧 컨텍스트 ────────────────────────────────────────
export const CreditContext = createContext({ credits: null, refreshCredits: () => {} })
export function useCredits() { return useContext(CreditContext) }

// ── 크레딧 배지 ────────────────────────────────────────────
function CreditBadge({ credits }) {
  if (credits === null) return null

  const low = credits <= 5
  const empty = credits === 0

  const style = {
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '4px 10px', borderRadius: '20px',
    fontSize: '0.82rem', fontWeight: 600,
    border: `1px solid ${empty ? '#ef4444' : low ? '#f59e0b' : 'var(--border)'}`,
    background: empty ? 'rgba(239,68,68,0.12)' : low ? 'rgba(245,158,11,0.12)' : 'var(--surface)',
    color: empty ? '#f87171' : low ? '#fbbf24' : 'var(--text-secondary)',
    transition: 'all 0.3s',
    userSelect: 'none',
  }

  const icon = empty ? '⚠️' : low ? '🟡' : '✦'

  return (
    <div style={style} title="잔여 크레딧">
      <span style={{ fontSize: '0.75rem' }}>{icon}</span>
      <span>{credits} 크레딧</span>
    </div>
  )
}

// ── 스타일 ─────────────────────────────────────────────────
const styles = {
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    background: 'rgba(14,14,14,0.85)', backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px', height: '56px',
  },
  logo: {
    fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 400,
    color: 'var(--text-primary)', letterSpacing: '-0.01em',
  },
  logoAccent: { color: 'var(--accent)', fontStyle: 'italic' },
  navLinks: { display: 'flex', gap: '8px', alignItems: 'center' },
  navLink: (active) => ({
    padding: '6px 14px', borderRadius: '8px', fontSize: '0.88rem',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    background: active ? 'var(--accent-dim)' : 'transparent',
    transition: 'all 0.2s', cursor: 'pointer',
  }),
  logoutBtn: {
    padding: '6px 14px', borderRadius: '8px', fontSize: '0.88rem',
    color: 'var(--text-muted)', background: 'transparent',
    border: '1px solid var(--border)', cursor: 'pointer',
  },
  main: { paddingTop: '56px' },
}

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState(null)
  const location = useLocation()

  // 크레딧 조회
  const refreshCredits = async (token) => {
    try {
      const t = token || (await supabase.auth.getSession()).data.session?.access_token
      if (!t) return
      const res = await fetch(`${API_URL}/api/credits`, {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (res.ok) {
        const data = await res.json()
        setCredits(data.credits)
      }
    } catch (_) {}
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) refreshCredits(session.access_token)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
      if (session) refreshCredits(session.access_token)
      else setCredits(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null
  if (!session) return <Login />

  const isOwner = session.user.email === OWNER_EMAIL

  return (
    <CreditContext.Provider value={{ credits, refreshCredits }}>
      <nav style={styles.nav}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={styles.logo}>Voice<span style={styles.logoAccent}>Blog</span></span>
        </Link>
        <div style={styles.navLinks}>
          <Link to="/" style={{ ...styles.navLink(location.pathname === '/'), textDecoration: 'none' }}>
            새 포스트
          </Link>
          <Link to="/history" style={{ ...styles.navLink(location.pathname === '/history'), textDecoration: 'none' }}>
            이력
          </Link>
          <Link to="/settings" style={{ ...styles.navLink(location.pathname === '/settings'), textDecoration: 'none' }}>
            설정
          </Link>
          {isOwner && (
            <Link to="/imagegen" style={{ ...styles.navLink(location.pathname === '/imagegen'), textDecoration: 'none' }}>
              카드이미지
            </Link>
          )}
          {isOwner && (
            <Link to="/admin" style={{ ...styles.navLink(location.pathname === '/admin'), textDecoration: 'none' }}>
              관리자
            </Link>
          )}
          <Link to="/manual" style={{ ...styles.navLink(location.pathname === '/manual'), textDecoration: 'none' }}>
            사용법
          </Link>

          {/* 크레딧 배지 */}
          <CreditBadge credits={credits} />

          <button style={styles.logoutBtn} onClick={() => supabase.auth.signOut()}>
            로그아웃
          </button>
        </div>
      </nav>
      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/imagegen" element={<ImageGen />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/manual" element={<Manual />} />
        </Routes>
      </main>
    </CreditContext.Provider>
  )
}
