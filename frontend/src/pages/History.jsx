import { useState, useEffect } from 'react'
import { getGenerations } from '../services/api'
import { Link } from 'react-router-dom'

const styles = {
  page: { maxWidth: '800px', margin: '0 auto', padding: '48px 24px' },
  title: { fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 400, marginBottom: '32px' },
  list: { display: 'flex', flexDirection: 'column', gap: '12px' },
  item: {
    padding: '20px 24px', borderRadius: '12px', background: 'var(--bg-card)',
    border: '1px solid var(--border)', cursor: 'pointer', transition: 'border-color 0.2s',
    textDecoration: 'none', display: 'block',
  },
  date: { fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' },
  excerpt: { fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 },
  badges: { display: 'flex', gap: '6px', marginTop: '10px' },
  badge: {
    padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem',
    background: 'var(--bg-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)',
  },
  empty: { textAlign: 'center', padding: '60px', color: 'var(--text-muted)' },
}

const TONE_LABELS = {
  informative: '정보전달형', friendly: '친근한 일상체',
  expert: '전문가형', storytelling: '스토리텔링',
}

export default function History() {
  const [generations, setGenerations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getGenerations()
      .then(({ generations }) => setGenerations(generations))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function excerpt(transcript) {
    return transcript?.slice(0, 80) + (transcript?.length > 80 ? '...' : '')
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  if (loading) return <div style={{ ...styles.page, color: 'var(--text-muted)' }}>불러오는 중...</div>

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>생성 이력</h1>
      {generations.length === 0 ? (
        <div style={styles.empty}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>📝</div>
          아직 생성된 포스트가 없습니다
        </div>
      ) : (
        <div style={styles.list}>
          {generations.map((g) => (
            <div key={g.id} style={styles.item}>
              <div style={styles.date}>{formatDate(g.created_at)}</div>
              <div style={styles.excerpt}>{excerpt(g.transcript)}</div>
              <div style={styles.badges}>
                <span style={styles.badge}>{TONE_LABELS[g.tone] || g.tone}</span>
                <span style={styles.badge}>이미지 {g.image_count}장</span>
                <span style={styles.badge}>{g.image_source === 'dalle' ? 'AI 생성' : '스톡'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
