'use client'
import { useEffect, useRef, useState } from 'react'
import { signOut, useSession } from 'next-auth/react'

const INACTIVITY_MS = 5 * 60 * 1000
const WARNING_MS = 4 * 60 * 1000

export default function InactivityGuard() {
  const { data: session } = useSession()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const warningRef = useRef<NodeJS.Timeout | null>(null)
  const warningActiveRef = useRef(false)
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(60)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  const clearAllTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)
  }

  const doSignOut = () => {
    clearAllTimers()
    setShowWarning(false)
    signOut({ callbackUrl: '/login' })
  }

  const continueSession = () => {
    warningActiveRef.current = false
    setShowWarning(false)
    setCountdown(60)
    clearAllTimers()
    startTimers()
  }

  const startTimers = () => {
    warningRef.current = setTimeout(() => {
      warningActiveRef.current = true
      setShowWarning(true)
      setCountdown(60)
      // Countdown visual
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!)
            doSignOut()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, WARNING_MS)

    timerRef.current = setTimeout(() => {
      doSignOut()
    }, INACTIVITY_MS)
  }

  const resetTimer = () => {
    if (!session) return
    if (warningActiveRef.current) return // No resetear si el aviso está activo
    clearAllTimers()
    startTimers()
  }

  useEffect(() => {
    if (!session) return
    const eventos = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    eventos.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    startTimers()
    return () => {
      eventos.forEach(e => window.removeEventListener(e, resetTimer))
      clearAllTimers()
    }
  }, [session])

  if (!showWarning) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Sesión inactiva</h2>
        <p className="text-slate-500 text-sm mb-2">
          Tu sesión se cerrará automáticamente por inactividad.
        </p>
        <div className="text-4xl font-bold text-orange-500 mb-6">{countdown}s</div>
        <div className="flex gap-3">
          <button
            onClick={doSignOut}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50"
          >
            Cerrar sesión
          </button>
          <button
            onClick={continueSession}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 rounded-xl"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}
