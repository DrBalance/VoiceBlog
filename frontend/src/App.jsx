import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { supabase } from './services/supabase'
import Home from './pages/Home'
import Login from './pages/Login'
import History from './pages/History'
import Settings from './pages/Settings'
import ImageGen from './pages/ImageGen'

const OWNER_EMAIL = 'drbalance@naver.com'

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
  const location = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  if (!session) return <Login />

  const isOwner = session.user.email === OWNER_EMAIL

  return (
    <>
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
        </Routes>
      </main>
    </>
  )
}
