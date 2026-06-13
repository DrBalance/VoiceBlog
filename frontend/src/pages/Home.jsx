import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import AudioInput from '../components/AudioInput'
import OptionPanel from '../components/OptionPanel'
import BlogPreview from '../components/BlogPreview'
import { transcribeAudio, generateBlog, generateImages, getProfiles } from '../services/api'

const STEPS = ['음성 입력', '옵션 설정', '생성 중', '결과 확인']

const styles = {
  page: { maxWidth: '800px', margin: '0 auto', padding: '48px 24px' },
  header: { marginBottom: '48px' },
  title: {
    fontFamily: 'var(--font-serif)', fontSize: '2.8rem',
    fontWeight: 400, color: 'var(--text-primary)', marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  titleAccent: { color: 'var(--accent)', fontStyle: 'italic' },
  subtitle: { color: 'var(--text-secondary)', fontSize: '1rem' },
  stepper: { display: 'flex', gap: '0', marginBottom: '40px' },
  stepItem: (active, done) => ({
    flex: 1, padding: '10px 4px', textAlign: 'center', fontSize: '0.8rem',
    fontWeight: active ? 600 : 400,
    color: done ? 'var(--accent)' : active ? 'var(--text-primary)' : 'var(--text-muted)',
    borderBottom: `2px solid ${done || active ? 'var(--accent)' : 'var(--border)'}`,
    transition: 'all 0.3s',
  }),
  card: {
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: '16px', padding: '28px', marginBottom: '20px',
  },
  cardTitle: { fontSize: '1rem', fontWeight: 600, marginBottom: '20px', color: 'var(--text-primary)' },
  generateBtn: {
    width: '100%', padding: '16px', borderRadius: '12px', fontSize: '1rem',
    fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
    background: 'var(--accent)', color: '#0e0e0e', border: 'none',
    marginTop: '8px',
  },
  progress: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', gap: '16px' },
  progressLabel: { color: 'var(--text-secondary)', fontSize: '0.95rem' },
  error: {
    padding: '14px 16px', borderRadius: '8px', marginBottom: '16px',
    background: 'rgba(224,92,92,0.1)', border: '1px solid var(--error)',
    color: 'var(--error)', fontSize: '0.9rem',
  },
  transcript: {
    padding: '16px', borderRadius: '8px', background: 'var(--bg-hover)',
    border: '1px solid var(--border)', fontSize: '0.9rem',
    color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: '12px',
    maxHeight: '120px', overflowY: 'auto',
  },
}

const Spinner = () => (
  <div style={{
    width: '40px', height: '40px', borderRadius: '50%',
    border: '3px solid var(--border)', borderTopColor: 'var(--accent)',
    animation: 'spin 0.8s linear infinite',
  }} />
)

export default function Home() {
  const [step, setStep] = useState(0) // 0:입력 1:옵션 2:생성중 3:결과
  const [audioFile, setAudioFile] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [options, setOptions] = useState({ imageCount: 3, imageSource: 'dalle', tone: 'informative', contentLength: 'normal', useWebSearch: false })
  const [progressMsg, setProgressMsg] = useState('')
  const [markdown, setMarkdown] = useState('')
  const [images, setImages] = useState([])
  const [hashtags, setHashtags] = useState({ naver: [], instagram: [] })
  const [error, setError] = useState('')

  // 프로필 관련
  const [profiles, setProfiles] = useState([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [selectedGroupIds, setSelectedGroupIds] = useState([])
  const [selectedSigId, setSelectedSigId] = useState('')

  const location = useLocation()

  useEffect(() => {
    getProfiles().then(({ profiles: p }) => setProfiles(p)).catch(() => {})
  }, [])

  // 이력에서 불러오기
  useEffect(() => {
    const restore = location.state?.restore
    if (restore) {
      setMarkdown(restore.markdown || '')
      setImages(restore.images || [])
      setHashtags(restore.hashtags || { naver: [], instagram: [] })
      setStep(3)
      window.history.replaceState({}, '') // state 초기화
    }
  }, [location.state])

  async function handleGenerate() {
    if (!audioFile && !transcript) return
    setError('')
    setStep(2)

    try {
      let text = transcript

      // STT
      if (audioFile) {
        setProgressMsg('🎙 음성을 텍스트로 변환하는 중...')
        const { transcript: t } = await transcribeAudio(audioFile)
        text = t
        setTranscript(t)
      }

      // 블로그 생성
      setProgressMsg('✍️ 블로그 글을 작성하는 중...')
      const isCustomTone = !['informative', 'friendly', 'expert', 'storytelling'].includes(options.tone)
      const blogOptions = {
        ...options,
        customStyleId: isCustomTone ? options.tone : undefined,
        tone: isCustomTone ? 'informative' : options.tone,
      }
      const { generationId, markdown: md, hashtags: tags } = await generateBlog(text, blogOptions)
      setMarkdown(md)
      setHashtags(tags || { naver: [], instagram: [] })

      // 이미지 생성 (imageCount > 0일 때만)
      if (options.imageCount > 0) {
        setProgressMsg('🎨 이미지를 생성하는 중...')
        const { images: imgs } = await generateImages(generationId, md, options)
        setImages(imgs)
      } else {
        setImages([])
      }

      setStep(3)
    } catch (err) {
      setError(err.message || '오류가 발생했습니다.')
      setStep(1)
    }
  }

  function reset() {
    setStep(0)
    setAudioFile(null)
    setTranscript('')
    setMarkdown('')
    setImages([])
    setError('')
    setSelectedProfileId('')
    setSelectedGroupIds([])
    setSelectedSigId('')
  }

  return (
    <div style={styles.page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      <header style={styles.header}>
        <h1 style={styles.title}>
          Voice<span style={styles.titleAccent}>Blog</span>
        </h1>
        <p style={styles.subtitle}>음성을 녹음하거나 파일을 업로드하면 블로그 포스트를 자동으로 작성해드립니다</p>
      </header>

      {/* 스텝 인디케이터 */}
      <div style={styles.stepper}>
        {['음성 입력', '옵션 설정', '생성 중', '결과 확인'].map((s, i) => (
          <div key={i} style={styles.stepItem(step === i, step > i)}>{s}</div>
        ))}
      </div>

      {error && <div style={styles.error}>⚠ {error}</div>}

      {/* Step 0: 음성 입력 */}
      {step === 0 && (
        <>
          <div style={styles.card}>
            <div style={styles.cardTitle}>음성 입력</div>
            <AudioInput onFileReady={(f) => { setAudioFile(f); setStep(1) }} />
          </div>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', margin: '8px 0' }}>또는</div>
          <div style={styles.card}>
            <div style={styles.cardTitle}>텍스트 직접 입력</div>
            <textarea
              placeholder="글감을 직접 입력하세요..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              style={{
                width: '100%', minHeight: '120px', background: 'var(--bg-hover)',
                border: '1px solid var(--border)', borderRadius: '8px', padding: '12px',
                color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.7, resize: 'vertical',
              }}
            />
            {transcript.length > 10 && (
              <button style={{ ...styles.generateBtn, marginTop: '16px' }} onClick={() => setStep(1)}>
                다음 단계 →
              </button>
            )}
          </div>
        </>
      )}

      {/* Step 1: 옵션 설정 */}
      {step === 1 && (
        <>
          {transcript && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>변환된 텍스트</div>
              <div style={styles.transcript}>{transcript}</div>
            </div>
          )}
          {audioFile && !transcript && (
            <div style={styles.card}>
              <div style={styles.cardTitle}>업로드된 파일</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>🎵 {audioFile.name}</div>
            </div>
          )}
          <div style={styles.card}>
            <div style={styles.cardTitle}>생성 옵션</div>
            <OptionPanel options={options} onChange={setOptions} transcriptLength={transcript.length} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ ...styles.generateBtn, flex: '0 0 auto', width: 'auto', padding: '16px 24px', background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              onClick={reset}>← 처음으로</button>
            <button style={styles.generateBtn} onClick={handleGenerate}>
              🚀 블로그 포스트 생성
            </button>
          </div>
        </>
      )}

      {/* Step 2: 생성 중 */}
      {step === 2 && (
        <div style={styles.card}>
          <div style={styles.progress}>
            <Spinner />
            <div style={styles.progressLabel}>{progressMsg}</div>
          </div>
        </div>
      )}

      {/* Step 3: 결과 */}
      {step === 3 && (() => {
        const selectedProfile = profiles.find(p => p.id === selectedProfileId)
        const selectedGroups = selectedProfile?.hashtag_groups?.filter(g => selectedGroupIds.includes(g.id)) || []
        const selectedSig = selectedProfile?.blog_signatures?.find(s => s.id === selectedSigId) || null

        // 선택한 해시태그 그룹을 AI 해시태그에 병합
        const mergedHashtags = {
          naver: [
            ...hashtags.naver,
            ...selectedGroups.flatMap(g => g.naver_tags || []),
          ],
          instagram: [
            ...hashtags.instagram,
            ...selectedGroups.flatMap(g => g.instagram_tags || []),
          ],
        }

        return (
          <>
            {/* 프로필 선택 패널 */}
            {profiles.length > 0 && (
              <div style={styles.card}>
                <div style={styles.cardTitle}>📋 프로필 선택</div>

                {/* 프로필 드롭다운 */}
                <select
                  value={selectedProfileId}
                  onChange={e => {
                    setSelectedProfileId(e.target.value)
                    setSelectedGroupIds([])
                    setSelectedSigId('')
                  }}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    fontSize: '0.88rem', background: 'var(--bg-hover)',
                    border: '1px solid var(--border)', color: 'var(--text-primary)',
                    marginBottom: '16px', cursor: 'pointer',
                  }}
                >
                  <option value=''>— 프로필 선택 안 함 —</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                {/* 해시태그 그룹 */}
                {selectedProfile?.hashtag_groups?.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      해시태그 그룹
                    </div>
                    {selectedProfile.hashtag_groups.map(g => (
                      <label key={g.id} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                        background: selectedGroupIds.includes(g.id) ? 'var(--accent-dim)' : 'var(--bg-hover)',
                        border: `1px solid ${selectedGroupIds.includes(g.id) ? 'var(--accent)' : 'var(--border)'}`,
                        marginBottom: '6px', fontSize: '0.88rem',
                      }}>
                        <input type='checkbox' checked={selectedGroupIds.includes(g.id)}
                          onChange={e => {
                            setSelectedGroupIds(prev =>
                              e.target.checked ? [...prev, g.id] : prev.filter(id => id !== g.id)
                            )
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 500 }}>{g.name}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            네이버 {g.naver_tags?.length || 0}개 · 인스타 {g.instagram_tags?.length || 0}개
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* 블로그 서명 */}
                {selectedProfile?.blog_signatures?.length > 0 && (
                  <div>
                    <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      블로그 서명
                    </div>
                    {selectedProfile.blog_signatures.map(sig => (
                      <label key={sig.id} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                        background: selectedSigId === sig.id ? 'var(--accent-dim)' : 'var(--bg-hover)',
                        border: `1px solid ${selectedSigId === sig.id ? 'var(--accent)' : 'var(--border)'}`,
                        marginBottom: '6px', fontSize: '0.88rem',
                      }}>
                        <input type='radio' name='signature'
                          checked={selectedSigId === sig.id}
                          onChange={() => setSelectedSigId(sig.id === selectedSigId ? '' : sig.id)}
                        />
                        <span style={{ fontWeight: 500 }}>{sig.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={styles.card}>
              <BlogPreview
                markdown={markdown}
                images={images}
                hashtags={mergedHashtags}
                signature={selectedSig}
              />
            </div>
            <button style={{ ...styles.generateBtn, background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              onClick={reset}>
              + 새 포스트 만들기
            </button>
          </>
        )
      })()}
    </div>
  )
}
