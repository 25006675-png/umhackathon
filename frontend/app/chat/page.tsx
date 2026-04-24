'use client'

import { useState, useRef, useEffect } from 'react'
import { sendChatMessage } from '@/lib/api'
import { Send } from 'lucide-react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const WELCOME: Message = {
  role: 'assistant',
  content:
    'Welcome! I am TernakAI. Ask me anything about flock health, disease signs, medication, or prevention — in Malay or English.',
}

const SUGGESTED = [
  'What are early signs of Newcastle disease?',
  'My chickens are eating less — what should I do?',
  'How do I reduce heat stress in broilers?',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const reply = await sendChatMessage(msg, 'flock_2026_batch3')
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, an error occurred. Please try again.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const showSuggested = messages.length === 1

  return (
    <div className="flex flex-col h-[calc(100dvh-108px)] md:h-screen">
      {/* Page header */}
      <div
        className="px-6 md:px-10 py-5 flex-shrink-0"
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <h1 className="font-display text-xl md:text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
          Ask AI
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--ink-3)' }}>
          Flock health assistant · Malay &amp; English
        </p>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto px-4 md:px-10 py-5 space-y-4"
        style={{ backgroundColor: '#f1f5f9' }}
      >
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs mr-2.5 flex-shrink-0 mt-0.5 font-display font-bold"
                style={{ backgroundColor: '#ea580c', color: '#ffffff' }}
              >
                T
              </div>
            )}
            <div
              className="max-w-[78%] md:max-w-[60%] px-4 py-3 text-sm leading-relaxed"
              style={
                m.role === 'user'
                  ? {
                      backgroundColor: '#0f172a',
                      color: '#f8fafc',
                      borderRadius: '16px 16px 4px 16px',
                      boxShadow: 'var(--shadow-sm)',
                    }
                  : {
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px 16px 16px 4px',
                      boxShadow: 'var(--shadow-sm)',
                    }
              }
            >
              {m.content}
            </div>
          </div>
        ))}

        {showSuggested && (
          <div className="flex flex-col gap-2 pt-1">
            <p
              className="text-xs font-semibold tracking-widest uppercase px-1"
              style={{ color: '#94a3b8' }}
            >
              Suggested Questions
            </p>
            {SUGGESTED.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="text-left px-4 py-3 rounded-xl text-sm transition-opacity hover:opacity-75"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: '#334155',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs mr-2.5 flex-shrink-0 font-display font-bold"
              style={{ backgroundColor: '#ea580c', color: '#ffffff' }}
            >
              T
            </div>
            <div
              className="px-4 py-3.5"
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px 16px 16px 4px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div className="flex gap-1.5 items-center">
                {[0, 150, 300].map((delay) => (
                  <span
                    key={delay}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: '#94a3b8', animationDelay: `${delay}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="flex gap-3 px-4 md:px-10 py-4 flex-shrink-0"
        style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          boxShadow: '0 -1px 4px rgba(0,0,0,0.05)',
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about your flock…"
          disabled={loading}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm focus:outline-none"
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
          }}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="w-10 h-10 rounded-lg flex items-center justify-center transition-opacity active:opacity-70 disabled:opacity-35 flex-shrink-0"
          style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
