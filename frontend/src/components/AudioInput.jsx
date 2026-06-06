import { useState, useRef } from 'react'

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '16px' },
  tabs: { display: 'flex', gap: '8px' },
  tab: (active) => ({
    flex: 1, padding: '10px', borderRadius: '8px', fontSize: '0.9rem',
    fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
    background: active ? 'var(--accent)' : 'var(--bg-hover)',
    color: active ? '#0e0e0e' : 'var(--text-secondary)',
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
  }),
  dropzone: (drag) => ({
    border: `2px dashed ${drag ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: '12px', padding: '40px 24px', textAlign: 'center',
    background: drag ? 'var(--accent-dim)' : 'transparent',
    transition: 'all 0.2s', cursor: 'pointer',
  }),
  recordBtn: (recording) => ({
    width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '2rem', cursor: 'pointer', transition: 'all 0.2s',
    background: recording ? '#e05c5c' : 'var(--accent)',
    color: recording ? '#fff' : '#0e0e0e',
    border: 'none', boxShadow: recording ? '0 0 0 8px rgba(224,92,92,0.2)' : 'none',
  }),
  fileInfo: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '12px 16px', borderRadius: '8px',
    background: 'var(--bg-hover)', border: '1px solid var(--border)',
  },
  label: { fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' },
}

export default function AudioInput({ onFileReady }) {
  const [mode, setMode] = useState('upload') // 'upload' | 'record'
  const [drag, setDrag] = useState(false)
  const [file, setFile] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const inputRef = useRef(null)

  function handleFile(f) {
    setFile(f)
    onFileReady(f)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = (e) => chunksRef.current.push(e.data)
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const f = new File([blob], `recording_${Date.now()}.webm`, { type: 'audio/webm' })
        handleFile(f)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      setRecording(true)
      setRecordTime(0)
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch {
      alert('마이크 접근 권한이 필요합니다.')
    }
  }

  function stopRecording() {
    mediaRef.current?.stop()
    clearInterval(timerRef.current)
    setRecording(false)
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div style={styles.wrap}>
      <div style={styles.tabs}>
        <button style={styles.tab(mode === 'upload')} onClick={() => setMode('upload')}>📁 파일 업로드</button>
        <button style={styles.tab(mode === 'record')} onClick={() => setMode('record')}>🎙 직접 녹음</button>
      </div>

      {mode === 'upload' ? (
        <div
          style={styles.dropzone(drag)}
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept="audio/*" style={{ display: 'none' }}
            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
          {file ? (
            <div style={styles.fileInfo}>
              <span>🎵</span>
              <div>
                <div style={{ fontWeight: 500 }}>{file.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🎵</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                음성 파일을 드래그하거나 클릭해서 선택하세요
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                mp3, m4a, wav, webm 지원 · 최대 25MB
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <button style={styles.recordBtn(recording)}
            onClick={recording ? stopRecording : startRecording}>
            {recording ? '⏹' : '🎙'}
          </button>
          <div style={{ marginTop: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {recording ? (
              <span style={{ color: '#e05c5c', fontWeight: 500 }}>녹음 중 {fmt(recordTime)}</span>
            ) : file ? (
              <span style={{ color: 'var(--success)' }}>✓ 녹음 완료 ({fmt(recordTime)})</span>
            ) : '버튼을 눌러 녹음 시작'}
          </div>
        </div>
      )}
    </div>
  )
}
