'use client'

import { useState } from 'react'

type Step = {
  id: string
  step_type: string
  content: string
  created_at: string
}

type Status = 'idle' | 'running' | 'completed' | 'failed'

const TYPE_LABELS: Record<string, string> = {
  planning: '[ PLAN ]',
  searching: '[ SEARCH ]',
  synthesizing: '[ SYNTH ]',
  writing: '[ WRITE ]',
  done: '[ DONE ]',
}

const TYPE_COLORS: Record<string, string> = {
  planning: '#61afef',
  searching: '#e5c07b',
  synthesizing: '#c678dd',
  writing: '#98c379',
  done: '#00ff88',
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [steps, setSteps] = useState<Step[]>([])
  const [report, setReport] = useState('')
  const [sessionId, setSessionId] = useState('')

  async function handleSubmit() {
    if (!query.trim() || status === 'running') return

    setStatus('running')
    setSteps([])
    setReport('')

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSessionId(data.sessionId)

      // poll for updates every 2s (realtime subscription comes later)
      const interval = setInterval(async () => {
        const poll = await fetch(`/api/research/${data.sessionId}`)
        const result = await poll.json()

        setSteps(result.steps || [])

        if (result.session?.status === 'completed') {
          setReport(result.session.report || '')
          setStatus('completed')
          clearInterval(interval)
        } else if (result.session?.status === 'failed') {
          setStatus('failed')
          clearInterval(interval)
        }
      }, 2000)

    } catch (err) {
      console.error(err)
      setStatus('failed')
    }
  }

  return (
    <main style={{
      maxWidth: '780px',
      margin: '0 auto',
      padding: '60px 24px',
    }}>

      {/* header */}
      <div style={{ marginBottom: '48px' }}>
        <div style={{ color: 'var(--accent)', fontSize: '11px', letterSpacing: '4px', marginBottom: '12px' }}>
          ATLAS RESEARCH
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 400, color: 'var(--text)', lineHeight: 1.3 }}>
          Deep Research Agent
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '8px' }}>
          powered by deepagents + tavily
        </p>
      </div>

      {/* input */}
      <div style={{ marginBottom: '40px' }}>
        <div style={{
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          borderRadius: '6px',
          padding: '16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-end',
        }}>
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="What do you want to research?"
            rows={3}
            disabled={status === 'running'}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'none',
              lineHeight: 1.6,
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!query.trim() || status === 'running'}
            style={{
              background: status === 'running' ? 'transparent' : 'var(--accent)',
              color: status === 'running' ? 'var(--accent)' : '#0a0a0a',
              border: status === 'running' ? '1px solid var(--accent)' : 'none',
              borderRadius: '4px',
              padding: '8px 20px',
              fontSize: '12px',
              fontFamily: 'inherit',
              fontWeight: 600,
              cursor: status === 'running' ? 'not-allowed' : 'pointer',
              letterSpacing: '1px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
          >
            {status === 'running' ? 'RUNNING...' : 'RUN →'}
          </button>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '11px', marginTop: '8px', paddingLeft: '4px' }}>
          shift+enter for newline · enter to run
        </p>
      </div>

      {/* steps feed */}
      {steps.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '2px', marginBottom: '16px' }}>
            AGENT LOG
          </div>
          <div style={{
            border: '1px solid var(--border)',
            borderRadius: '6px',
            overflow: 'hidden',
          }}>
            {steps.map((step, i) => (
              <div key={step.id} style={{
                padding: '12px 16px',
                borderBottom: i < steps.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}>
                <span style={{
                  color: TYPE_COLORS[step.step_type] || 'var(--muted)',
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  whiteSpace: 'nowrap',
                  marginTop: '2px',
                  minWidth: '80px',
                }}>
                  {TYPE_LABELS[step.step_type] || `[ ${step.step_type.toUpperCase()} ]`}
                </span>
                <span style={{ color: 'var(--text)', fontSize: '13px', lineHeight: 1.6 }}>
                  {step.content}
                </span>
              </div>
            ))}
            {status === 'running' && (
              <div style={{
                padding: '12px 16px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}>
                <span style={{ color: 'var(--accent)', fontSize: '13px', animation: 'pulse 1.5s infinite' }}>
                  ▋
                </span>
                <span style={{ color: 'var(--muted)', fontSize: '12px' }}>agent working...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* final report */}
      {status === 'completed' && report && (
        <div>
          <div style={{ color: 'var(--muted)', fontSize: '11px', letterSpacing: '2px', marginBottom: '16px' }}>
            FINAL REPORT
          </div>
          <div style={{
            border: '1px solid var(--accent)',
            borderRadius: '6px',
            padding: '24px',
            background: 'var(--accent-dim)',
            fontSize: '14px',
            lineHeight: 1.8,
            color: 'var(--text)',
            whiteSpace: 'pre-wrap',
          }}>
            {report}
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigator.clipboard.writeText(report)}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                borderRadius: '4px',
                padding: '6px 14px',
                fontSize: '11px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                letterSpacing: '1px',
              }}
            >
              COPY REPORT
            </button>
            <button
              onClick={() => { setStatus('idle'); setSteps([]); setReport(''); setQuery('') }}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                borderRadius: '4px',
                padding: '6px 14px',
                fontSize: '11px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                letterSpacing: '1px',
              }}
            >
              NEW RESEARCH
            </button>
          </div>
        </div>
      )}

      {/* failed state */}
      {status === 'failed' && (
        <div style={{
          border: '1px solid #ff4444',
          borderRadius: '6px',
          padding: '16px',
          color: '#ff4444',
          fontSize: '13px',
        }}>
          ✗ research failed — check console for details
          <button
            onClick={() => setStatus('idle')}
            style={{
              display: 'block',
              marginTop: '8px',
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '12px',
              fontFamily: 'inherit',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            try again →
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        textarea::placeholder { color: var(--muted); }
        textarea:disabled { opacity: 0.5; }
      `}</style>
    </main>
  )
}