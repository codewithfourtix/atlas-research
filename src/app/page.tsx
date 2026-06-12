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
  planning: 'PLAN',
  searching: 'SEARCH',
  synthesizing: 'SYNTH',
  writing: 'WRITE',
  done: 'DONE',
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

      // poll for updates every 2s
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

  // Helper to format timestamps for log feed
  const formatLogTime = (isoString?: string) => {
    if (!isoString) return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navigation Bar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 32px',
        borderBottom: '1px solid var(--surface-border)',
        backdropFilter: 'blur(10px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(3, 3, 3, 0.7)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '14px',
            fontWeight: 800,
            letterSpacing: '1.5px',
            color: 'var(--text)',
            fontFamily: "'Geist Mono', monospace"
          }}>
            KERNEL <span style={{ color: 'var(--accent)' }}>//</span> ATLAS
          </span>
          <span style={{
            fontSize: '10px',
            background: 'var(--surface-border)',
            padding: '2px 6px',
            borderRadius: '4px',
            color: 'var(--muted)',
            fontFamily: "'Geist Mono', monospace"
          }}>
            v1.2.0
          </span>
        </div>

        {/* Live Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: status === 'running' ? 'var(--accent)' : status === 'failed' ? '#ff4444' : 'var(--muted)',
            boxShadow: status === 'running' ? '0 0 8px var(--accent)' : 'none',
            display: 'inline-block'
          }} />
          <span style={{ color: 'var(--muted)', fontFamily: "'Geist Mono', monospace" }}>
            {status === 'running' ? 'AGENT_BUSY' : status === 'completed' ? 'AGENT_IDLE' : 'AGENT_OFFLINE'}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        maxWidth: '920px',
        width: '100%',
        margin: '0 auto',
        padding: '60px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px'
      }}>

        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <h1 style={{ 
            fontSize: '42px', 
            fontWeight: 700, 
            letterSpacing: '-1.5px',
            backgroundImage: 'linear-gradient(180deg, #ffffff 0%, var(--muted) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.15
          }}>
            Autonomous Knowledge Retrieval
          </h1>
          <p style={{ 
            color: 'var(--muted)', 
            fontSize: '15px', 
            marginTop: '12px',
            maxWidth: '520px',
            margin: '12px auto 0',
            lineHeight: 1.5
          }}>
            Stateful research agent utilizing deep planning, sequential web search synthesis, and cited intelligence reports.
          </p>
        </div>

        {/* Query Input Card */}
        <div className="glow-card glass-panel" style={{
          borderRadius: '12px',
          padding: '20px',
          transition: 'all 0.3s ease-in-out',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
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
            placeholder="Type your research prompt... (e.g. Current status of AI in drug discovery)"
            rows={3}
            disabled={status === 'running'}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text)',
              fontSize: '15px',
              fontFamily: 'inherit',
              resize: 'none',
              lineHeight: 1.6,
            }}
          />

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            paddingTop: '16px'
          }}>
            <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <kbd style={{
                  background: 'rgba(255,255,255,0.06)',
                  padding: '2px 5px',
                  borderRadius: '3px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>Enter</kbd> to run
              </span>
              <span>·</span>
              <span>Searches multiple sources</span>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!query.trim() || status === 'running'}
              style={{
                background: status === 'running' ? 'transparent' : 'var(--text)',
                color: status === 'running' ? 'var(--muted)' : '#030303',
                border: status === 'running' ? '1px solid var(--surface-border)' : 'none',
                borderRadius: '6px',
                padding: '8px 24px',
                fontSize: '12px',
                fontFamily: "'Geist Mono', monospace",
                fontWeight: 700,
                cursor: status === 'running' ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: status === 'running' ? 'none' : '0 4px 12px rgba(255,255,255,0.1)'
              }}
            >
              {status === 'running' ? 'STREAMING...' : 'RUN AGENT'}
            </button>
          </div>
        </div>

        {/* Live Logs Terminal Feed */}
        {steps.length > 0 && (
          <div className="fade-in-item" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '0 4px'
            }}>
              <span style={{ 
                color: 'var(--muted)', 
                fontSize: '11px', 
                fontFamily: "'Geist Mono', monospace",
                letterSpacing: '1px'
              }}>
                STREAM OUTPUT &mdash; EXECUTION FEED
              </span>
              {status === 'running' && (
                <span style={{
                  fontSize: '11px',
                  color: 'var(--accent)',
                  fontFamily: "'Geist Mono', monospace"
                }}>
                  ACTIVE POLLING
                </span>
              )}
            </div>

            {/* MacOS-style Terminal */}
            <div className="glass-panel" style={{
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            }}>
              {/* Window Controls */}
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56', display: 'inline-block' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e', display: 'inline-block' }} />
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f', display: 'inline-block' }} />
                </div>
                <span style={{ 
                  fontSize: '11px', 
                  color: 'var(--muted)', 
                  fontFamily: "'Geist Mono', monospace"
                }}>
                  agent_harness.sh
                </span>
                <span style={{ width: '40px' }} />
              </div>

              {/* Terminal Logs Body */}
              <div style={{
                padding: '20px',
                fontFamily: "'Geist Mono', monospace",
                fontSize: '13px',
                lineHeight: 1.7,
                color: 'rgba(255,255,255,0.85)',
                maxHeight: '400px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {steps.map((step) => (
                  <div key={step.id} className="fade-in-item" style={{ 
                    display: 'flex', 
                    gap: '12px', 
                    alignItems: 'flex-start'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.25)', userSelect: 'none' }}>
                      [{formatLogTime(step.created_at)}]
                    </span>
                    <span style={{
                      color: TYPE_COLORS[step.step_type] || 'var(--muted)',
                      fontWeight: 700,
                      minWidth: '70px',
                      display: 'inline-block'
                    }}>
                      {TYPE_LABELS[step.step_type] || step.step_type.toUpperCase()}
                    </span>
                    <span style={{ flex: 1, color: '#e4e4e7' }}>
                      {step.content}
                    </span>
                  </div>
                ))}

                {status === 'running' && (
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    marginTop: '8px'
                  }}>
                    <span style={{ 
                      color: 'var(--accent)', 
                      animation: 'terminal-blink 1s infinite',
                      fontWeight: 800
                    }}>
                      ▋
                    </span>
                    <span style={{ color: 'var(--muted)', fontSize: '12px' }}>agent waiting for response...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Final Synthesized Report */}
        {status === 'completed' && report && (
          <div className="fade-in-item" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ 
              color: 'var(--muted)', 
              fontSize: '11px', 
              fontFamily: "'Geist Mono', monospace",
              letterSpacing: '1px'
            }}>
              RESEARCH ANALYSIS OUTPUT &mdash; SYNTHESIZED REPORT
            </div>

            <div className="glass-panel" style={{
              borderRadius: '12px',
              padding: '32px',
              lineHeight: 1.8,
              fontSize: '15px',
              color: '#e4e4e7',
              boxShadow: '0 12px 50px rgba(0,0,0,0.6)',
              position: 'relative'
            }}>
              {/* Report Markdown Container */}
              <div style={{ 
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit'
              }}>
                {report}
              </div>

              {/* Action Buttons */}
              <div style={{ 
                marginTop: '32px', 
                display: 'flex', 
                gap: '12px', 
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: '24px'
              }}>
                <button
                  onClick={() => navigator.clipboard.writeText(report)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--surface-border)',
                    color: 'var(--text)',
                    borderRadius: '6px',
                    padding: '8px 18px',
                    fontSize: '12px',
                    fontFamily: "'Geist Mono', monospace",
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                >
                  COPY RAW MARKDOWN
                </button>
                <button
                  onClick={() => { setStatus('idle'); setSteps([]); setReport(''); setQuery('') }}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--muted)',
                    borderRadius: '6px',
                    padding: '8px 18px',
                    fontSize: '12px',
                    fontFamily: "'Geist Mono', monospace",
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                >
                  NEW SESSION
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Failed State */}
        {status === 'failed' && (
          <div className="fade-in-item" style={{
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'rgba(239, 68, 68, 0.08)',
            borderRadius: '8px',
            padding: '20px',
            color: '#fca5a5',
            fontSize: '14px',
            boxShadow: '0 8px 30px rgba(239, 68, 68, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <span>✗</span> Execution failed. Check server and browser logs for details.
            </div>
            <button
              onClick={() => setStatus('idle')}
              style={{
                alignSelf: 'flex-start',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#e4e4e7',
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: "'Geist Mono', monospace",
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
            >
              RETRY SESSION &rarr;
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '24px',
        fontSize: '12px',
        color: 'var(--muted)',
        borderTop: '1px solid var(--surface-border)',
        fontFamily: "'Geist Mono', monospace",
        background: 'rgba(3, 3, 3, 0.4)'
      }}>
        ATLAS RESEARCH TERMINAL &bull; POWERED BY DEEPAGENTS + TAVILY
      </footer>
    </div>
  )
}