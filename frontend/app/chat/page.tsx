'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Send } from 'lucide-react'
import { sendChatMessage } from '@/lib/api'
import { ChickenIcon, WheatIcon } from '@/components/FarmArt'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

type Language = 'en' | 'ms' | 'bilingual'

const WELCOME: Record<Language, Message> = {
  en: { role: 'assistant', content: '🐔 Hi! I am TernakAI. Ask me anything about flock health, disease, medication, or prevention in English.' },
  ms: { role: 'assistant', content: '🐔 Hai! Saya TernakAI. Tanya apa sahaja tentang kesihatan ayam, penyakit, ubat atau pencegahan dalam Bahasa Melayu.' },
  bilingual: { role: 'assistant', content: '🐔 Welcome / Selamat datang! I am TernakAI. Ask in Malay or English.' },
}

const SUGGESTED: Record<Language, string[]> = {
  en: [
    'What are early signs of Newcastle disease?',
    'My chickens are eating less, what should I do?',
    'How do I reduce heat stress in broilers?',
  ],
  ms: [
    'Apakah tanda awal penyakit Newcastle?',
    'Ayam saya kurang makan, apa patut saya buat?',
    'Bagaimana nak kurangkan tekanan haba pada ayam?',
  ],
  bilingual: [
    'What are early signs of Newcastle disease?',
    'Ayam saya kurang makan, apa patut saya buat?',
    'How do I reduce heat stress in broilers?',
  ],
}

const LANG_OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ms', label: 'Bahasa Melayu' },
  { value: 'bilingual', label: 'Both' },
]

export default function ChatPage() {
  const [language, setLanguage] = useState<Language>('bilingual')
  const [messages, setMessages] = useState<Message[]>([WELCOME.bilingual])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prefillDoneRef = useRef(false)

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [input, resizeTextarea])

  function changeLanguage(next: Language) {
    setLanguage(next)
    setMessages([WELCOME[next]])
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (prefillDoneRef.current) return
    prefillDoneRef.current = true
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) setInput(q)
  }, [])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      const reply = await sendChatMessage(msg, 'flock_2026_batch3', language)
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
    <div className="flex flex-col flex-1 min-h-0 md:h-full">
      <div
        className="px-6 md:px-10 py-5 flex-shrink-0 flex items-start justify-between gap-4"
        style={{ backgroundColor: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <ChickenIcon size={40} className="peck flex-shrink-0" />
          <div>
            <h1 className="font-display text-xl md:text-2xl font-semibold" style={{ color: 'var(--ink)' }}>
              Ask AI
            </h1>
            <p className="text-sm mt-0.5 flex items-center gap-1" style={{ color: 'var(--ink-3)' }}>
              <WheatIcon size={12} /> Flock health assistant
            </p>
          </div>
        </div>
        <div
          className="flex p-1 rounded-lg flex-shrink-0"
          style={{ border: '1px solid var(--border)', backgroundColor: 'var(--bg)' }}
          role="radiogroup"
          aria-label="Response language"
        >
          {LANG_OPTIONS.map((opt) => {
            const active = language === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => changeLanguage(opt.value)}
                className="px-3 py-1.5 text-xs rounded-md transition-colors"
                style={{
                  backgroundColor: active ? 'var(--ink)' : 'transparent',
                  color: active ? '#f8fafc' : 'var(--ink-3)',
                  fontWeight: active ? 600 : 500,
                }}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 md:px-10 py-5 space-y-4"
        style={{ backgroundColor: '#f1f5f9' }}
      >
        {messages.map((message, i) => (
          <div key={i} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'assistant' && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center mr-2.5 flex-shrink-0 mt-0.5"
                style={{ backgroundColor: 'var(--earth-barn)' }}
              >
                <ChickenIcon size={22} />
              </div>
            )}
            <div
              className="max-w-[78%] md:max-w-[60%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words"
              style={
                message.role === 'user'
                  ? {
                      backgroundColor: '#0f172a',
                      color: '#f8fafc',
                      borderRadius: '16px 16px 4px 16px',
                      boxShadow: 'var(--shadow-sm)',
                      overflowWrap: 'anywhere',
                    }
                  : {
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px 16px 16px 4px',
                      boxShadow: 'var(--shadow-sm)',
                      overflowWrap: 'anywhere',
                    }
              }
            >
              {message.content}
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
            {SUGGESTED[language].map((question) => (
              <button
                key={question}
                onClick={() => send(question)}
                className="text-left px-4 py-3 rounded-xl text-sm transition-opacity hover:opacity-75"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: '#334155',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                {question}
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

      <div
        className="flex items-end gap-3 px-4 md:px-10 py-4 flex-shrink-0"
        style={{
          backgroundColor: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          boxShadow: '0 -1px 4px rgba(0,0,0,0.05)',
        }}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={input}
          onChange={(e) => { setInput(e.target.value); resizeTextarea() }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          placeholder={language === 'ms' ? 'Tanya tentang ayam anda…' : language === 'en' ? 'Ask about your flock…' : 'Ask / Tanya…'}
          disabled={loading}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm focus:outline-none resize-none"
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            lineHeight: '1.5',
            overflow: 'auto',
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
