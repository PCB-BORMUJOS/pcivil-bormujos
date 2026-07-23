'use client'

// Panel flotante del agente especializado. Detecta el área por la ruta actual
// y conversa con el agente correspondiente.

import { useState, useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Bot, X, Send, Sparkles, RefreshCw, ChevronDown } from 'lucide-react'
import { perfilPorRuta } from '@/lib/agentes/perfiles'

interface MensajeChat { rol: 'user' | 'assistant'; contenido: string }

export default function AgentePanel() {
  const pathname = usePathname() || ''
  const { data: session } = useSession()
  const perfil = perfilPorRuta(pathname)

  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<MensajeChat[]>([])
  const [entrada, setEntrada] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [conversacionId, setConversacionId] = useState<string | null>(null)
  const [verCompetencias, setVerCompetencias] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)

  // Al cambiar de área se arranca una conversación nueva con ese agente.
  useEffect(() => {
    setMensajes([])
    setConversacionId(null)
    setVerCompetencias(false)
  }, [perfil.slug])

  useEffect(() => {
    if (abierto) finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, abierto, enviando])

  const enviar = useCallback(async (texto: string) => {
    const limpio = texto.trim()
    if (!limpio || enviando) return
    setEntrada('')
    setMensajes(m => [...m, { rol: 'user', contenido: limpio }])
    setEnviando(true)
    try {
      const r = await fetch('/api/agentes?tipo=chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: perfil.slug, mensaje: limpio, conversacionId }),
      })
      const d = await r.json()
      if (r.ok) {
        setConversacionId(d.conversacionId)
        setMensajes(m => [...m, { rol: 'assistant', contenido: d.respuesta }])
      } else {
        setMensajes(m => [...m, { rol: 'assistant', contenido: `⚠️ ${d.error || 'No he podido responder.'}` }])
      }
    } catch {
      setMensajes(m => [...m, { rol: 'assistant', contenido: '⚠️ Error de conexión con el asistente.' }])
    } finally {
      setEnviando(false)
    }
  }, [perfil.slug, conversacionId, enviando])

  if (!session) return null

  return (
    <>
      {/* Lanzador */}
      {!abierto && (
        <button
          onClick={() => setAbierto(true)}
          title={`${perfil.nombre} — ${perfil.puesto}`}
          className={`fixed bottom-6 right-6 z-[1200] flex items-center gap-2 pl-4 pr-5 py-3 rounded-full text-white shadow-lg hover:shadow-xl transition-all bg-gradient-to-r ${perfil.color}`}
        >
          <Bot className="w-5 h-5" />
          <span className="text-sm font-semibold hidden sm:inline">{perfil.nombre}</span>
        </button>
      )}

      {/* Panel */}
      {abierto && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-[1200] sm:w-[420px] sm:h-[640px] sm:max-h-[85vh] bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
          {/* Cabecera */}
          <div className={`bg-gradient-to-r ${perfil.color} text-white p-4 flex items-start justify-between gap-3 shrink-0`}>
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 bg-white/20 rounded-xl shrink-0"><Bot className="w-5 h-5" /></div>
              <div className="min-w-0">
                <h3 className="font-bold leading-tight">{perfil.nombre}</h3>
                <p className="text-xs text-white/80 leading-snug">{perfil.puesto}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {mensajes.length > 0 && (
                <button onClick={() => { setMensajes([]); setConversacionId(null) }} title="Nueva conversación" className="p-1.5 hover:bg-white/20 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
              )}
              <button onClick={() => setAbierto(false)} className="p-1.5 hover:bg-white/20 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Conversación */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {mensajes.length === 0 && (
              <div className="space-y-3">
                <div className="bg-white border border-slate-200 rounded-2xl p-4">
                  <p className="text-sm text-slate-700">
                    Hola. Soy tu apoyo en el área de <strong>{perfil.area}</strong>. Pregúntame lo que necesites: conozco los datos actuales del servicio en esta área.
                  </p>
                </div>
                <button onClick={() => setVerCompetencias(v => !v)} className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700">
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${verCompetencias ? '' : '-rotate-90'}`} />
                  En qué te puedo ayudar
                </button>
                {verCompetencias && (
                  <ul className="space-y-1.5">
                    {perfil.competencias.map(c => (
                      <li key={c}>
                        <button onClick={() => enviar(c)} className="w-full text-left text-xs px-3 py-2 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 text-slate-600">
                          <Sparkles className={`w-3 h-3 inline mr-1.5 ${perfil.acento}`} />{c}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {mensajes.map((m, i) => (
              <div key={i} className={`flex ${m.rol === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                  m.rol === 'user'
                    ? 'bg-slate-800 text-white rounded-br-sm'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm'
                }`}>{m.contenido}</div>
              </div>
            ))}

            {enviando && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={finRef} />
          </div>

          {/* Entrada */}
          <form
            onSubmit={e => { e.preventDefault(); enviar(entrada) }}
            className="p-3 border-t border-slate-200 bg-white flex items-end gap-2 shrink-0"
          >
            <textarea
              value={entrada}
              onChange={e => setEntrada(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(entrada) } }}
              rows={1}
              placeholder={`Pregunta a tu ${perfil.nombre.toLowerCase()}...`}
              className="flex-1 resize-none px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 max-h-32"
            />
            <button
              type="submit"
              disabled={enviando || !entrada.trim()}
              className={`p-2.5 rounded-xl text-white disabled:opacity-40 bg-gradient-to-r ${perfil.color}`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="px-4 pb-2 text-[10px] text-slate-400 bg-white">
            Asistencia orientativa. No sustituye al mando operativo ni al criterio profesional.
          </p>
        </div>
      )}
    </>
  )
}
