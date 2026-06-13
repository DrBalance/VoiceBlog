import { useState, useEffect } from 'react'
import {
  getStyles, analyzeStyle, deleteStyle,
  getProfiles, createProfile, updateProfile, deleteProfile,
  createHashtagGroup, updateHashtagGroup, deleteHashtagGroup,
  createSignature, updateSignature, deleteSignature,
} from '../services/api'

const s = {
  page: { maxWidth: '720px', margin: '0 auto', padding: '40px 24px' },
  section: {
    marginBottom: '40px', borderRadius: '16px',
    border: '1px solid var(--border)', overflow: 'hidden',
  },
  sectionHead: {
    padding: '20px 24px', borderBottom: '1px solid var(--border)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'var(--bg-hover)',
  },
  sectionTitle: { fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' },
  sectionBody: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' },
  card: {
    padding: '16px', borderRadius: '10px',
    border: '1px solid var(--border)', background: 'var(--bg-card)',
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  cardRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardName: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' },
  cardDesc: { fontSize: '0.83rem', color: 'var(--text-secondary)', marginTop: '2px' },
  iconBtnRow: { display: 'flex', gap: '6px' },
  iconBtn: (danger) => ({
    padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem',
    cursor: 'pointer', border: '1px solid var(--border)',
    background: 'transparent',
    color: danger ? 'var(--error, #e05c5c)' : 'var(--text-muted)',
  }),
  addBtn: {
    padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem',
    fontWeight: 500, cursor: 'pointer',
    background: 'var(--accent-dim)', color: 'var(--accent)',
    border: '1px solid var(--accent)',
  },
  emptyMsg: { fontSize: '0.88rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' },
  // 프로필 확장
  profileExpanded: {
    marginTop: '8px', paddingTop: '12px',
    borderTop: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  subTitle: { fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' },
  subCard: {
    padding: '10px 12px', borderRadius: '8px',
    background: 'var(--bg-hover)', border: '1px solid var(--border)',
    fontSize: '0.83rem', color: 'var(--text-secondary)',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  // 모달
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '20px',
  },
  modal: {
    background: 'var(--bg-card)', borderRadius: '16px', padding: '28px',
    width: '100%', maxWidth: '500px', border: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column', gap: '16px',
    maxHeight: '80vh', overflowY: 'auto',
  },
  modalTitle: { fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' },
  label: { fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' },
  input: {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    fontSize: '0.88rem', background: 'var(--bg-hover)',
    border: '1px solid var(--border)', color: 'var(--text-primary)',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%', minHeight: '120px', padding: '10px 12px',
    borderRadius: '8px', fontSize: '0.88rem', lineHeight: 1.7,
    background: 'var(--bg-hover)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', resize: 'vertical',
    boxSizing: 'border-box', fontFamily: 'monospace',
  },
  previewBox: {
    padding: '12px', borderRadius: '8px',
    background: '#fff', border: '1px solid var(--border)',
    minHeight: '60px', fontSize: '0.88rem',
  },
  btnRow: { display: 'flex', gap: '8px', justifyContent: 'flex-end' },
  btn: (primary) => ({
    padding: '10px 20px', borderRadius: '8px', fontSize: '0.88rem',
    fontWeight: 500, cursor: 'pointer',
    background: primary ? 'var(--accent)' : 'var(--bg-hover)',
    color: primary ? '#0e0e0e' : 'var(--text-secondary)',
    border: `1px solid ${primary ? 'var(--accent)' : 'var(--border)'}`,
  }),
  errMsg: { fontSize: '0.85rem', color: 'var(--error, #e05c5c)' },
  charCount: (over) => ({
    fontSize: '0.8rem', textAlign: 'right',
    color: over ? 'var(--error, #e05c5c)' : 'var(--text-muted)',
  }),
  tabRow: { display: 'flex', gap: '6px', marginBottom: '8px' },
  tab: (active) => ({
    padding: '6px 14px', borderRadius: '6px', fontSize: '0.83rem',
    cursor: 'pointer', fontWeight: 500,
    background: active ? 'var(--accent-dim)' : 'var(--bg-hover)',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
  }),
}

const MAX_CHARS = 1000

// ─── 커스텀 스타일 분석 모달 ──────────────────────────
function StyleModal({ onClose, onSaved }) {
  const [text, setText] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState(null)
  const [err, setErr] = useState('')

  async function handleAnalyze() {
    if (text.trim().length < 50) { setErr('50자 이상 입력해주세요.'); return }
    setErr(''); setAnalyzing(true)
    try {
      const { style } = await analyzeStyle(text)
      setResult(style)
    } catch (e) { setErr(e.message) }
    finally { setAnalyzing(false) }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalTitle}>✦ 커스텀 스타일 만들기</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          좋아하는 글 스타일의 예시를 붙여넣으세요. AI가 문체와 어조를 분석해 스타일을 만들어드립니다.
        </div>
        {!result ? (
          <>
            <textarea style={s.textarea}
              placeholder="예시 글 붙여넣기 (50자 이상 권장)"
              value={text} onChange={e => setText(e.target.value)} />
            <div style={s.charCount(text.length > MAX_CHARS)}>
              {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}자
              {text.length > MAX_CHARS && ' · 초과분은 자동으로 잘립니다'}
            </div>
            {err && <div style={s.errMsg}>{err}</div>}
            <div style={s.btnRow}>
              <button style={s.btn(false)} onClick={onClose}>취소</button>
              <button style={s.btn(true)} onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? '분석 중...' : '스타일 분석'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ padding: '14px 16px', borderRadius: '8px', background: 'var(--accent-dim)', border: '1px solid var(--accent)' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent)', marginBottom: '4px' }}>{result.name}</div>
              <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{result.description}</div>
            </div>
            <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
              이 스타일로 저장할까요?
            </div>
            {err && <div style={s.errMsg}>{err}</div>}
            <div style={s.btnRow}>
              <button style={s.btn(false)} onClick={() => setResult(null)}>다시 분석</button>
              <button style={s.btn(true)} onClick={() => { onSaved(result); onClose() }}>저장</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── 프로필 생성 모달 ─────────────────────────────────
function ProfileModal({ onClose, onSaved }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleSave() {
    if (!name.trim()) { setErr('프로필 이름을 입력해주세요.'); return }
    setLoading(true)
    try {
      const { profile } = await createProfile(name)
      onSaved(profile); onClose()
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalTitle}>프로필 추가</div>
        <div>
          <label style={s.label}>프로필 이름 (업체명)</label>
          <input style={s.input} placeholder="예: 강남 ○○한의원"
            value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()} />
        </div>
        {err && <div style={s.errMsg}>{err}</div>}
        <div style={s.btnRow}>
          <button style={s.btn(false)} onClick={onClose}>취소</button>
          <button style={s.btn(true)} onClick={handleSave} disabled={loading}>
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 해시태그 그룹 모달 ───────────────────────────────
function HashtagGroupModal({ profileId, group, onClose, onSaved }) {
  const [name, setName] = useState(group?.name || '')
  const [naverTab, setNaverTab] = useState(true)
  const [naverText, setNaverText] = useState((group?.naver_tags || []).join(' '))
  const [instaText, setInstaText] = useState((group?.instagram_tags || []).join(' '))
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  function parseTags(text) {
    return text.split(/[\s,]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean)
  }

  async function handleSave() {
    if (!name.trim()) { setErr('그룹 이름을 입력해주세요.'); return }
    setLoading(true)
    try {
      const payload = {
        name,
        naverTags: parseTags(naverText),
        instagramTags: parseTags(instaText),
      }
      const result = group
        ? await updateHashtagGroup(group.id, payload)
        : await createHashtagGroup(profileId, payload)
      onSaved(result.group); onClose()
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalTitle}>{group ? '해시태그 그룹 수정' : '해시태그 그룹 추가'}</div>
        <div>
          <label style={s.label}>그룹 이름</label>
          <input style={s.input} placeholder="예: 강남한의원 기본태그"
            value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <div style={s.tabRow}>
            <button style={s.tab(naverTab)} onClick={() => setNaverTab(true)}>네이버용</button>
            <button style={s.tab(!naverTab)} onClick={() => setNaverTab(false)}>인스타용</button>
          </div>
          {naverTab ? (
            <>
              <label style={s.label}>태그 입력 (공백 또는 쉼표로 구분, # 없이 입력)</label>
              <textarea style={{ ...s.textarea, fontFamily: 'inherit', minHeight: '100px' }}
                placeholder="강남한의원 침술 추나요법 한방치료"
                value={naverText} onChange={e => setNaverText(e.target.value)} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {parseTags(naverText).length}개 태그
              </div>
            </>
          ) : (
            <>
              <label style={s.label}>태그 입력 (공백 또는 쉼표로 구분, # 없이 입력)</label>
              <textarea style={{ ...s.textarea, fontFamily: 'inherit', minHeight: '100px' }}
                placeholder="gangnamclinic acupuncture 강남한의원 침술"
                value={instaText} onChange={e => setInstaText(e.target.value)} />
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {parseTags(instaText).length}개 태그
              </div>
            </>
          )}
        </div>
        {err && <div style={s.errMsg}>{err}</div>}
        <div style={s.btnRow}>
          <button style={s.btn(false)} onClick={onClose}>취소</button>
          <button style={s.btn(true)} onClick={handleSave} disabled={loading}>
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 블로그 서명 모달 ─────────────────────────────────
function SignatureModal({ profileId, signature, onClose, onSaved }) {
  const [name, setName] = useState(signature?.name || '')
  const [html, setHtml] = useState(signature?.html_content || '')
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function handleSave() {
    if (!name.trim()) { setErr('서명 이름을 입력해주세요.'); return }
    setLoading(true)
    try {
      const payload = { name, htmlContent: html }
      const result = signature
        ? await updateSignature(signature.id, payload)
        : await createSignature(profileId, payload)
      onSaved(result.signature); onClose()
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.modalTitle}>{signature ? '서명 수정' : '서명 추가'}</div>
        <div>
          <label style={s.label}>서명 이름</label>
          <input style={s.input} placeholder="예: 강남한의원 기본 서명"
            value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ ...s.label, margin: 0 }}>HTML 서명</label>
            <button style={s.tab(preview)} onClick={() => setPreview(p => !p)}>
              {preview ? '편집' : '미리보기'}
            </button>
          </div>
          {!preview ? (
            <textarea style={s.textarea}
              placeholder={'<p>📍 서울 강남구 ...</p>\n<p>🌐 https://example.com</p>'}
              value={html} onChange={e => setHtml(e.target.value)} />
          ) : (
            <div style={s.previewBox} dangerouslySetInnerHTML={{ __html: html || '<span style="color:#aaa">미리보기</span>' }} />
          )}
        </div>
        {err && <div style={s.errMsg}>{err}</div>}
        <div style={s.btnRow}>
          <button style={s.btn(false)} onClick={onClose}>취소</button>
          <button style={s.btn(true)} onClick={handleSave} disabled={loading}>
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 프로필 카드 ──────────────────────────────────────
function ProfileCard({ profile, onDeleted, onUpdated }) {
  const [expanded, setExpanded] = useState(false)
  const [hashModal, setHashModal] = useState(false)
  const [editHash, setEditHash] = useState(null)
  const [sigModal, setSigModal] = useState(false)
  const [editSig, setEditSig] = useState(null)
  const [groups, setGroups] = useState(profile.hashtag_groups || [])
  const [sigs, setSigs] = useState(profile.blog_signatures || [])

  async function handleDeleteGroup(id) {
    await deleteHashtagGroup(id)
    setGroups(prev => prev.filter(g => g.id !== id))
  }

  async function handleDeleteSig(id) {
    await deleteSignature(id)
    setSigs(prev => prev.filter(s => s.id !== id))
  }

  return (
    <div style={s.card}>
      <div style={s.cardRow}>
        <div>
          <div style={s.cardName}>{profile.name}</div>
          <div style={s.cardDesc}>
            해시태그 그룹 {groups.length}개 · 서명 {sigs.length}개
          </div>
        </div>
        <div style={s.iconBtnRow}>
          <button style={s.iconBtn(false)} onClick={() => setExpanded(p => !p)}>
            {expanded ? '접기' : '편집'}
          </button>
          <button style={s.iconBtn(true)} onClick={() => onDeleted(profile.id)}>삭제</button>
        </div>
      </div>

      {expanded && (
        <div style={s.profileExpanded}>
          {/* 해시태그 그룹 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={s.subTitle}>해시태그 그룹</span>
              <button style={{ ...s.iconBtn(false), fontSize: '0.75rem' }}
                onClick={() => { setEditHash(null); setHashModal(true) }}>+ 추가</button>
            </div>
            {groups.length === 0
              ? <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '8px 0' }}>없음</div>
              : groups.map(g => (
                <div key={g.id} style={{ ...s.subCard, marginTop: '6px' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{g.name}</div>
                    <div style={{ fontSize: '0.78rem', marginTop: '2px' }}>
                      네이버 {g.naver_tags?.length || 0}개 · 인스타 {g.instagram_tags?.length || 0}개
                    </div>
                  </div>
                  <div style={s.iconBtnRow}>
                    <button style={s.iconBtn(false)} onClick={() => { setEditHash(g); setHashModal(true) }}>수정</button>
                    <button style={s.iconBtn(true)} onClick={() => handleDeleteGroup(g.id)}>삭제</button>
                  </div>
                </div>
              ))
            }
          </div>

          {/* 블로그 서명 */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={s.subTitle}>블로그 서명</span>
              <button style={{ ...s.iconBtn(false), fontSize: '0.75rem' }}
                onClick={() => { setEditSig(null); setSigModal(true) }}>+ 추가</button>
            </div>
            {sigs.length === 0
              ? <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '8px 0' }}>없음</div>
              : sigs.map(sig => (
                <div key={sig.id} style={{ ...s.subCard, marginTop: '6px' }}>
                  <span style={{ fontWeight: 500 }}>{sig.name}</span>
                  <div style={s.iconBtnRow}>
                    <button style={s.iconBtn(false)} onClick={() => { setEditSig(sig); setSigModal(true) }}>수정</button>
                    <button style={s.iconBtn(true)} onClick={() => handleDeleteSig(sig.id)}>삭제</button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {hashModal && (
        <HashtagGroupModal
          profileId={profile.id}
          group={editHash}
          onClose={() => setHashModal(false)}
          onSaved={g => {
            setGroups(prev => editHash
              ? prev.map(x => x.id === g.id ? g : x)
              : [...prev, g])
          }}
        />
      )}
      {sigModal && (
        <SignatureModal
          profileId={profile.id}
          signature={editSig}
          onClose={() => setSigModal(false)}
          onSaved={sig => {
            setSigs(prev => editSig
              ? prev.map(x => x.id === sig.id ? sig : x)
              : [...prev, sig])
          }}
        />
      )}
    </div>
  )
}

// ─── 메인 설정 페이지 ─────────────────────────────────
export default function Settings() {
  const [styles, setStyles] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [styleModal, setStyleModal] = useState(false)
  const [profileModal, setProfileModal] = useState(false)

  useEffect(() => {
    Promise.all([getStyles(), getProfiles()])
      .then(([{ styles: st }, { profiles: pr }]) => {
        setStyles(st); setProfiles(pr)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleDeleteStyle(id) {
    await deleteStyle(id)
    setStyles(prev => prev.filter(s => s.id !== id))
  }

  async function handleDeleteProfile(id) {
    await deleteProfile(id)
    setProfiles(prev => prev.filter(p => p.id !== id))
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>불러오는 중...</div>
  )

  return (
    <div style={s.page}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 600, marginBottom: '32px', color: 'var(--text-primary)' }}>
        설정
      </h2>

      {/* 글쓰기 스타일 섹션 */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <span style={s.sectionTitle}>✦ 글쓰기 스타일</span>
          {styles.length < 4
            ? <button style={s.addBtn} onClick={() => setStyleModal(true)}>+ 스타일 추가</button>
            : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>최대 4개</span>
          }
        </div>
        <div style={s.sectionBody}>
          {styles.length === 0
            ? <div style={s.emptyMsg}>저장된 스타일이 없습니다</div>
            : styles.map(st => (
              <div key={st.id} style={s.card}>
                <div style={s.cardRow}>
                  <div>
                    <div style={s.cardName}>{st.name}</div>
                    <div style={s.cardDesc}>{st.description}</div>
                  </div>
                  <button style={s.iconBtn(true)} onClick={() => handleDeleteStyle(st.id)}>삭제</button>
                </div>
              </div>
            ))
          }
        </div>
      </div>

      {/* 프로필 섹션 */}
      <div style={s.section}>
        <div style={s.sectionHead}>
          <span style={s.sectionTitle}>📋 프로필 설정</span>
          <button style={s.addBtn} onClick={() => setProfileModal(true)}>+ 프로필 추가</button>
        </div>
        <div style={s.sectionBody}>
          {profiles.length === 0
            ? <div style={s.emptyMsg}>저장된 프로필이 없습니다</div>
            : profiles.map(p => (
              <ProfileCard key={p.id} profile={p}
                onDeleted={handleDeleteProfile}
                onUpdated={updated => setProfiles(prev => prev.map(x => x.id === updated.id ? updated : x))}
              />
            ))
          }
        </div>
      </div>

      {styleModal && (
        <StyleModal
          onClose={() => setStyleModal(false)}
          onSaved={style => setStyles(prev => [...prev, style])}
        />
      )}
      {profileModal && (
        <ProfileModal
          onClose={() => setProfileModal(false)}
          onSaved={profile => setProfiles(prev => [...prev, profile])}
        />
      )}
    </div>
  )
}
