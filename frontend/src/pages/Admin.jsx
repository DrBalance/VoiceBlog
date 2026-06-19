import { useState, useEffect } from 'react'
import { adminGetUsers, adminGrantCredits, adminUpdateUser } from '../services/api'

const s = {
  page: { maxWidth: '900px', margin: '0 auto', padding: '48px 24px' },
  title: { fontSize: '1.4rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' },
  subtitle: { fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '32px' },
  section: {
    marginBottom: '32px', borderRadius: '16px',
    border: '1px solid var(--border)', overflow: 'hidden',
  },
  sectionHead: {
    padding: '16px 24px', borderBottom: '1px solid var(--border)',
    background: 'var(--bg-hover)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  sectionTitle: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' },
  sectionBody: { padding: '20px 24px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' },
  th: {
    padding: '10px 12px', textAlign: 'left', fontWeight: 600,
    color: 'var(--text-muted)', borderBottom: '2px solid var(--border)',
  },
  td: { padding: '12px 12px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)', verticalAlign: 'middle' },
  badge: (type) => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
    background: type === 'pro' ? 'var(--accent-dim)' : 'var(--bg-hover)',
    color: type === 'pro' ? 'var(--accent)' : 'var(--text-muted)',
    border: `1px solid ${type === 'pro' ? 'var(--accent)' : 'var(--border)'}`,
  }),
  input: {
    padding: '6px 10px', borderRadius: '6px', fontSize: '0.85rem',
    background: 'var(--bg-hover)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', width: '100%', boxSizing: 'border-box',
  },
  btn: (variant) => ({
    padding: '7px 14px', borderRadius: '7px', fontSize: '0.82rem', fontWeight: 600,
    cursor: 'pointer', border: 'none',
    background: variant === 'primary' ? 'var(--accent)' : variant === 'danger' ? 'rgba(224,92,92,0.15)' : 'var(--bg-hover)',
    color: variant === 'primary' ? '#0e0e0e' : variant === 'danger' ? '#e05c5c' : 'var(--text-secondary)',
  }),
  row: { display: 'flex', gap: '10px', alignItems: 'center' },
  label: { fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' },
  statCard: {
    padding: '16px', borderRadius: '10px', textAlign: 'center',
    border: '1px solid var(--border)', background: 'var(--bg-hover)',
  },
  statNum: { fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent)' },
  statLabel: { fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' },
  toast: (show) => ({
    position: 'fixed', bottom: '24px', right: '24px',
    padding: '12px 20px', borderRadius: '10px',
    background: 'var(--accent)', color: '#0e0e0e', fontWeight: 600, fontSize: '0.88rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
    transition: 'all 0.3s', opacity: show ? 1 : 0,
    transform: show ? 'translateY(0)' : 'translateY(10px)',
    pointerEvents: 'none', zIndex: 9999,
  }),
}

export default function Admin() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  // 크레딧 부여 폼
  const [grantEmail, setGrantEmail] = useState('')
  const [grantAmount, setGrantAmount] = useState('10')
  const [granting, setGranting] = useState(false)

  // 유저별 인라인 편집
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const { users: u } = await adminGetUsers()
      setUsers(u)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function handleGrant() {
    if (!grantEmail || !grantAmount) return
    setGranting(true)
    try {
      const { newCredits } = await adminGrantCredits(grantEmail, Number(grantAmount))
      showToast(`✓ ${grantEmail} 에게 ${grantAmount} 크레딧 지급 완료 (잔여: ${newCredits})`)
      setGrantEmail('')
      setGrantAmount('10')
      fetchUsers()
    } catch (e) {
      setError(e.message)
    } finally {
      setGranting(false)
    }
  }

  async function handleUpdateUser(userId) {
    try {
      await adminUpdateUser(userId, editValues)
      showToast('✓ 저장 완료')
      setEditingId(null)
      fetchUsers()
    } catch (e) {
      setError(e.message)
    }
  }

  // 통계
  const totalUsers = users.length
  const totalCredits = users.reduce((s, u) => s + (u.credits || 0), 0)
  const totalGenerations = users.reduce((s, u) => s + (u.generations_used || 0), 0)
  const proUsers = users.filter(u => u.plan === 'pro').length

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>불러오는 중...</div>
  )

  return (
    <div style={s.page}>
      <div style={s.title}>🛠 관리자 페이지</div>
      <div style={s.subtitle}>VoiceBlog 유저 관리 및 크레딧 운영</div>

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: '8px', marginBottom: '20px',
          background: 'rgba(224,92,92,0.1)', border: '1px solid #e05c5c',
          color: '#e05c5c', fontSize: '0.88rem',
          display: 'flex', justifyContent: 'space-between',
        }}>
          {error}
          <button style={{ background: 'none', border: 'none', color: '#e05c5c', cursor: 'pointer' }}
            onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* 통계 */}
      <div style={s.statGrid}>
        {[
          { label: '전체 유저', value: totalUsers },
          { label: 'Pro 유저', value: proUsers },
          { label: '총 생성 수', value: totalGenerations },
          { label: '총 잔여 크레딧', value: totalCredits },
        ].map(({ label, value }) => (
          <div key={label} style={s.statCard}>
            <div style={s.statNum}>{value.toLocaleString()}</div>
            <div style={s.statLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* 크레딧 즉시 지급 */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <span style={s.sectionTitle}>💳 크레딧 지급</span>
        </div>
        <div style={s.sectionBody}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'flex-end' }}>
            <div>
              <label style={s.label}>이메일</label>
              <input style={s.input} placeholder="user@example.com"
                value={grantEmail} onChange={e => setGrantEmail(e.target.value)} />
            </div>
            <div>
              <label style={s.label}>크레딧 수량</label>
              <input style={{ ...s.input, width: '100px' }} type="number" min="1"
                value={grantAmount} onChange={e => setGrantAmount(e.target.value)} />
            </div>
            <button style={s.btn('primary')} onClick={handleGrant} disabled={granting}>
              {granting ? '지급 중...' : '지급'}
            </button>
          </div>
          {/* 빠른 수량 버튼 */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>빠른 선택:</span>
            {[10, 30, 50, 100, 150].map(n => (
              <button key={n} style={s.btn('default')} onClick={() => setGrantAmount(String(n))}>
                {n}개
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 유저 목록 */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <span style={s.sectionTitle}>👥 유저 목록 ({totalUsers}명)</span>
          <button style={s.btn('default')} onClick={fetchUsers}>🔄 새로고침</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>이메일</th>
                <th style={s.th}>플랜</th>
                <th style={s.th}>잔여 크레딧</th>
                <th style={s.th}>총 사용</th>
                <th style={s.th}>이번 달 생성</th>
                <th style={s.th}>관리</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.user_id}>
                  <td style={s.td}>
                    <div style={{ fontSize: '0.85rem' }}>{user.email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(user.created_at).toLocaleDateString('ko-KR')}
                    </div>
                  </td>
                  <td style={s.td}>
                    {editingId === user.user_id ? (
                      <select
                        style={{ ...s.input, width: '80px' }}
                        value={editValues.plan ?? user.plan ?? 'free'}
                        onChange={e => setEditValues(v => ({ ...v, plan: e.target.value }))}
                      >
                        <option value="free">free</option>
                        <option value="pro">pro</option>
                      </select>
                    ) : (
                      <span style={s.badge(user.plan)}>{user.plan || 'free'}</span>
                    )}
                  </td>
                  <td style={s.td}>
                    {editingId === user.user_id ? (
                      <input type="number" style={{ ...s.input, width: '80px' }}
                        value={editValues.credits ?? user.credits ?? 0}
                        onChange={e => setEditValues(v => ({ ...v, credits: Number(e.target.value) }))} />
                    ) : (
                      <span style={{ fontWeight: 600, color: (user.credits ?? 0) < 5 ? '#e05c5c' : 'var(--accent)' }}>
                        {user.credits ?? 0}
                      </span>
                    )}
                  </td>
                  <td style={s.td}>{user.total_credits_used ?? 0}</td>
                  <td style={s.td}>
                    {user.generations_used ?? 0} / {user.generations_limit ?? 30}
                  </td>
                  <td style={s.td}>
                    {editingId === user.user_id ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button style={s.btn('primary')} onClick={() => handleUpdateUser(user.user_id)}>저장</button>
                        <button style={s.btn('default')} onClick={() => { setEditingId(null); setEditValues({}) }}>취소</button>
                      </div>
                    ) : (
                      <button style={s.btn('default')} onClick={() => {
                        setEditingId(user.user_id)
                        setEditValues({ plan: user.plan, credits: user.credits })
                      }}>편집</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 토스트 */}
      <div style={s.toast(!!toast)}>{toast}</div>
    </div>
  )
}
