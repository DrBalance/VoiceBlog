import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import AudioInput from '../components/AudioInput'
import OptionPanel from '../components/OptionPanel'
import BlogPreview from '../components/BlogPreview'
import { transcribeAudio, generateBlog, generateImages, getProfiles } from '../services/api'

const STEPS = ['음성 입력', '옵션 설정', '생성 중', '결과 확인']

// 예상 시간 계산 (초)
function calcExpectedTime(options, phase) {
  if (phase === 'blog') {
    const base = { short: 20, normal: 30, long: 50, very_long: 80 }[options.contentLength] || 30
    return base + (options.useWebSearch ? 20 : 0)
  }
  if (phase === 'image') {
    return Math.max(options.imageCount, 1) * 20
  }
  return 30
}

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
  stepItem: (active, done, clickable) => ({
    flex: 1, padding: '10px 4px', textAlign: 'center', fontSize: '0.8rem',
    fontWeight: active ? 600 : 400,
    color: done ? 'var(--accent)' : active ? 'var(--text-primary)' : 'var(--text-muted)',
    borderBottom: `2px solid ${done || active ? 'var(--accent)' : 'var(--border)'}`,
    transition: 'all 0.3s',
    cursor: clickable ? 'pointer' : 'default',
    userSelect: 'none',
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
  // 프로그레스
  progressWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '48px 32px', gap: '20px',
  },
  progressLabel: { color: 'var(--text-primary)', fontSize: '1rem', fontWeight: 500 },
  progressSub: { color: 'var(--text-muted)', fontSize: '0.85rem' },
  progressBarWrap: {
    width: '100%', height: '6px', borderRadius: '3px',
    background: 'var(--border)', overflow: 'hidden',
  },
  progressBarFill: (pct) => ({
    height: '100%', borderRadius: '3px',
    background: 'var(--accent)',
    width: `${Math.min(pct, 100)}%`,
    transition: 'width 0.5s linear',
  }),
}

// 프로그레스바 컴포넌트
function ProgressBar({ label, expectedSec, phase }) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())
  const [retryCount, setRetryCount] = useState(0)

  // phase가 바뀌면 타이머 리셋
  useEffect(() => {
    startRef.current = Date.now()
    setElapsed(0)
    setRetryCount(0)
  }, [phase])

  useEffect(() => {
    startRef.current = Date.now()
    setElapsed(0)
  }, [retryCount])

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    }, 500)
    return () => clearInterval(timer)
  }, [retryCount, phase])

  // 예상시간 초과 시 자동 재시작
  useEffect(() => {
    if (elapsed < expectedSec) return
    const timer = setTimeout(() => setRetryCount(c => c + 1), 500)
    return () => clearTimeout(timer)
  }, [elapsed, expectedSec])

  const pct = (elapsed / expectedSec) * 100
  const isOverdue = elapsed >= expectedSec

  return (
    <div style={styles.progressWrap}>
      <div style={styles.progressLabel}>{label}</div>
      <div style={{ width: '100%' }}>
        <div style={styles.progressBarWrap}>
          <div style={styles.progressBarFill(pct)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
          <span style={styles.progressSub}>
            {isOverdue
              ? '⏳ 예상보다 오래 걸리고 있습니다...'
              : `${elapsed}초 경과`}
          </span>
          <span style={styles.progressSub}>예상 {expectedSec}초</span>
        </div>
      </div>
      {isOverdue && (
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          서버 상태에 따라 더 걸릴 수 있습니다. 잠시만 기다려주세요.
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [step, setStep] = useState(0)
  const [audioFile, setAudioFile] = useState(null)
  const [transcript, setTranscript] = useState('')
  const [options, setOptions] = useState({
    imageCount: 3, imageSource: 'dalle', tone: 'informative',
    contentLength: 'normal', useWebSearch: false,
  })
  const [progressPhase, setProgressPhase] = useState('blog')
  const [markdown, setMarkdown] = useState('')
  const [images, setImages] = useState([])
  const [hashtags, setHashtags] = useState({ naver: [], instagram: [] })
  const [error, setError] = useState('')
  const [reuseImages, setReuseImages] = useState(false)

  // 프로필 관련
  const [profiles, setProfiles] = useState([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [selectedGroupIds, setSelectedGroupIds] = useState([])
  const [selectedSigId, setSelectedSigId] = useState('')

  const location = useLocation()

  useEffect(() => {
    getProfiles().then(({ profiles: p }) => setProfiles(p)).catch(() => {})
  }, [])

  useEffect(() => {
    const restore = location.state?.restore
    if (restore) {
      setMarkdown(restore.markdown || '')
      setImages(restore.images || [])
      setHashtags(restore.hashtags || { naver: [], instagram: [] })
      setStep(3)
      window.history.replaceState({}, '')
    }
  }, [location.state])

  // 프로그레스바 예상 시간 (재시도 시 리셋)
  const expectedSec = calcExpectedTime(options, progressPhase)

  async function handleGenerate(prevMarkdown = '') {
    if (!audioFile && !transcript) return
    setError('')
    setStep(2)
    setProgressPhase('blog')

    try {
      let text = transcript

      if (audioFile && !transcript) {
        setProgressPhase('stt')
        const { transcript: t } = await transcribeAudio(audioFile)
        text = t
        setTranscript(t)
      }

      setProgressPhase('blog')
      const isCustomTone = !['informative', 'friendly', 'expert', 'storytelling'].includes(options.tone)
      const blogOptions = {
        ...options,
        customStyleId: isCustomTone ? options.tone : undefined,
        tone: isCustomTone ? 'informative' : options.tone,
        prevMarkdown: prevMarkdown || undefined,
      }
      const { generationId, markdown: md, hashtags: tags } = await generateBlog(text, blogOptions)
      setMarkdown(md)
      setHashtags(tags || { naver: [], instagram: [] })

      if (options.imageCount > 0 && !reuseImages) {
        setProgressPhase('image')
        const { images: imgs } = await generateImages(generationId, md, options)
        setImages(imgs)
      } else if (reuseImages) {
        // 이전 이미지 그대로 유지
      } else {
        setImages([])
      }

      setStep(3)
    } catch (err) {
      setError(err.message || '오류가 발생했습니다.')
      setStep(1)
    }
  }

  // 탭 클릭 핸들러
  function handleStepClick(i) {
    if (step === 2) return // 생성 중엔 이동 불가
    if (i >= step && i !== 3) return // 아직 안 간 단계는 클릭 불가 (결과 제외)
    if (i === 3 && !markdown) return // 결과 없으면 결과 탭 불가
    setStep(i)
  }

  function reset() {
    setStep(0)
    setAudioFile(null)
    setTranscript('')
    setMarkdown('')
    setImages([])
    setHashtags({ naver: [], instagram: [] })
    setError('')
    setSelectedProfileId('')
    setSelectedGroupIds([])
    setSelectedSigId('')
  }

  const progressLabel = {
    stt: '🎙 음성을 텍스트로 변환하는 중...',
    blog: '✍️ 블로그 글을 작성하는 중...',
    image: '🎨 이미지를 생성하는 중...',
  }[progressPhase] || '처리 중...'

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>
          Voice<span style={styles.titleAccent}>Blog</span>
        </h1>
        <p style={styles.subtitle}>음성을 녹음하거나 파일을 업로드하면 블로그 포스트를 자동으로 작성해드립니다</p>
      </header>

      {/* 스텝 인디케이터 — 클릭 가능 */}
      <div style={styles.stepper}>
        {STEPS.map((s, i) => {
          const clickable = step !== 2 && (i < step || (i === 3 && markdown))
          return (
            <div key={i}
              style={styles.stepItem(step === i, step > i, clickable)}
              onClick={() => handleStepClick(i)}
              title={clickable ? `${s}으로 돌아가기` : ''}
            >
              {s}
            </div>
          )
        })}
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
                boxSizing: 'border-box',
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

          {/* 이전 생성 글이 있으면 참고글 안내 */}
          {markdown && (
            <div style={{
              padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
              background: 'var(--accent-dim)', border: '1px solid var(--accent)',
              fontSize: '0.85rem', color: 'var(--text-secondary)',
            }}>
              ✦ 이전에 생성된 글을 참고해서 새 버전을 작성합니다. 옵션을 변경하고 재생성하세요.
            </div>
          )}

          {/* 이전 이미지 재사용 */}
          {images.length > 0 && (
            <div style={{
              padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
              background: 'var(--bg-hover)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <input type='checkbox' id='reuseImages' checked={reuseImages}
                onChange={e => setReuseImages(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              <label htmlFor='reuseImages' style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                이전에 생성된 이미지 {images.length}장 재사용 (새로 생성하지 않음)
              </label>
            </div>
          )}

          <div style={styles.card}>
            <div style={styles.cardTitle}>생성 옵션</div>
            <OptionPanel options={options} onChange={setOptions} transcriptLength={transcript.length} />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ ...styles.generateBtn, flex: '0 0 auto', width: 'auto', padding: '16px 24px', background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}
              onClick={reset}>← 처음으로</button>
            <button style={styles.generateBtn} onClick={() => handleGenerate(markdown)}>
              🚀 {markdown ? '다시 생성' : '블로그 포스트 생성'}
            </button>
          </div>
        </>
      )}

      {/* Step 2: 생성 중 */}
      {step === 2 && (
        <div style={styles.card}>
          <ProgressBar
            label={progressLabel}
            expectedSec={progressPhase === 'stt' ? 15 : expectedSec}
            phase={progressPhase}
          />
        </div>
      )}

      {/* Step 3: 결과 */}
      {step === 3 && (() => {
        const selectedProfile = profiles.find(p => p.id === selectedProfileId)
        const selectedGroups = selectedProfile?.hashtag_groups?.filter(g => selectedGroupIds.includes(g.id)) || []
        const selectedSig = selectedProfile?.blog_signatures?.find(s => s.id === selectedSigId) || null

        const mergedHashtags = {
          naver: [...hashtags.naver, ...selectedGroups.flatMap(g => g.naver_tags || [])],
          instagram: [...hashtags.instagram, ...selectedGroups.flatMap(g => g.instagram_tags || [])],
        }

        return (
          <>
            {/* 결과 화면 액션 버튼 */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button style={{ ...styles.generateBtn, flex: 1, marginTop: 0, background: 'var(--bg-hover)', color: 'var(--text-secondary)', fontSize: '0.88rem', padding: '12px' }}
                onClick={() => setStep(1)}>
                ⚙ 옵션 재설정
              </button>
              <button style={{ ...styles.generateBtn, flex: 1, marginTop: 0, fontSize: '0.88rem', padding: '12px' }}
                onClick={reset}>
                + 새 포스트 만들기
              </button>
            </div>

            <div style={styles.card}>
              <BlogPreview
                markdown={markdown}
                images={images}
                hashtags={mergedHashtags}
                signature={selectedSig}
              />

              {/* 프로필 선택 — 해시태그 섹션 아래 */}
              {profiles.length > 0 && (
                <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    📋 프로필에서 해시태그 / 서명 추가
                  </div>

                  {/* 프로필 카드 목록 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {profiles.map(p => (
                      <div key={p.id}>
                        {/* 프로필 클릭 토글 */}
                        <div
                          onClick={() => setSelectedProfileId(prev => prev === p.id ? '' : p.id)}
                          style={{
                            padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                            background: selectedProfileId === p.id ? 'var(--accent-dim)' : 'var(--bg-hover)',
                            border: `1px solid ${selectedProfileId === p.id ? 'var(--accent)' : 'var(--border)'}`,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)',
                          }}
                        >
                          <span>{p.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            {selectedProfileId === p.id ? '▲' : '▼'}
                          </span>
                        </div>

                        {/* 펼쳐지면 해시태그 그룹 + 서명 */}
                        {selectedProfileId === p.id && (
                          <div style={{ paddingLeft: '12px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {/* 해시태그 그룹 */}
                            {p.hashtag_groups?.map(g => (
                              <label key={g.id} style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                                background: selectedGroupIds.includes(g.id) ? 'var(--accent-dim)' : 'var(--bg-card)',
                                border: `1px solid ${selectedGroupIds.includes(g.id) ? 'var(--accent)' : 'var(--border)'}`,
                                fontSize: '0.85rem',
                              }}>
                                <input type='checkbox' checked={selectedGroupIds.includes(g.id)}
                                  onChange={e => setSelectedGroupIds(prev =>
                                    e.target.checked ? [...prev, g.id] : prev.filter(id => id !== g.id)
                                  )} />
                                <div>
                                  <div style={{ fontWeight: 500 }}>🏷 {g.name}</div>
                                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                    네이버 {g.naver_tags?.length || 0}개 · 인스타 {g.instagram_tags?.length || 0}개
                                  </div>
                                </div>
                              </label>
                            ))}

                            {/* 블로그 서명 */}
                            {p.blog_signatures?.map(sig => (
                              <label key={sig.id} style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                                background: selectedSigId === sig.id ? 'var(--accent-dim)' : 'var(--bg-card)',
                                border: `1px solid ${selectedSigId === sig.id ? 'var(--accent)' : 'var(--border)'}`,
                                fontSize: '0.85rem',
                              }}>
                                <input type='radio' name='signature'
                                  checked={selectedSigId === sig.id}
                                  onChange={() => setSelectedSigId(prev => prev === sig.id ? '' : sig.id)} />
                                <span style={{ fontWeight: 500 }}>✍ {sig.name}</span>
                              </label>
                            ))}

                            {(!p.hashtag_groups?.length && !p.blog_signatures?.length) && (
                              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '8px 12px' }}>
                                해시태그 그룹 또는 서명을 설정 페이지에서 추가해주세요
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )
      })()}
    </div>
  )
}
