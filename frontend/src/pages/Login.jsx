import { useState } from 'react'
import { supabase } from '../services/supabase'

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '24px',
  },
  card: {
    width: '100%', maxWidth: '400px', background: 'var(--bg-card)',
    border: '1px solid var(--border)', borderRadius: '16px', padding: '40px 32px',
  },
  title: {
    fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 400,
    marginBottom: '8px', letterSpacing: '-0.02em',
  },
  accent: { color: 'var(--accent)', fontStyle: 'italic' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '32px' },
  label: { fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: '8px', marginBottom: '16px',
    background: 'var(--bg-hover)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', fontSize: '0.95rem',
  },
  btn: {
    width: '100%', padding: '14px', borderRadius: '10px', fontSize: '0.95rem',
    fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
    background: 'var(--accent)', color: '#0e0e0e', border: 'none', marginTop: '8px',
  },
  toggle: {
    textAlign: 'center', marginTop: '20px', fontSize: '0.88rem',
    color: 'var(--text-secondary)',
  },
  toggleLink: { color: 'var(--accent)', cursor: 'pointer', marginLeft: '4px' },
  error: {
    padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
    background: 'rgba(224,92,92,0.1)', border: '1px solid var(--error)',
    color: 'var(--error)', fontSize: '0.85rem',
  },
  success: {
    padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
    background: 'rgba(92,184,122,0.1)', border: '1px solid var(--success)',
    color: 'var(--success)', fontSize: '0.85rem',
  },
}

export default function Login() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit() {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('가입 확인 이메일을 전송했습니다. 이메일을 확인해주세요.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Voice<span style={styles.accent}>Blog</span></h1>
        <p style={styles.subtitle}>음성으로 블로그 포스트를 자동 작성</p>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <label style={styles.label}>이메일</label>
        <input style={styles.input} type="email" placeholder="email@example.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />

        <label style={styles.label}>비밀번호</label>
        <input style={styles.input} type="password" placeholder="••••••••"
          value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} />

        <button style={styles.btn} onClick={handleSubmit} disabled={loading}>
          {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
        </button>

        <div style={styles.toggle}>
          {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
          <span style={styles.toggleLink}
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}>
            {mode === 'login' ? '회원가입' : '로그인'}
          </span>
        </div>
      </div>
    </div>
  )
}
