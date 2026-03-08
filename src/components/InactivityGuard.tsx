'use client'

import { useEffect, useRef } from 'react'
import { signOut, useSession } from 'next-auth/react'

const INACTIVITY_MS = 5 * 60 * 1000 // 5 minutos
const WARNING_MS = 4 * 60 * 1000    // aviso al minuto 4

export default function InactivityGuard() {
  const { data: session } = useSession()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const warningRef = useRef<NodeJS.Timeout | null>(null)
  const warningShownRef = useRef(false)

  const resetTimer = () => {
    if (!session) return

    if (timerRef.current) clearTimeout(timerRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    warningShownRef.current = false

    warningRef.current = setTimeout(() => {
      if (warningShownRef.current) return
      warningShownRef.current = true
      alert('Tu sesión se cerrará en 1 minuto por inactividad.')
    }, WARNING_MS)

    timerRef.current = setTimeout(() => {
      signOut({ callbackUrl: '/login' })
    }, INACTIVITY_MS)
  }

  useEffect(() => {
    if (!session) return

    const eventos = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    eventos.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()

    return () => {
      eventos.forEach(e => window.removeEventListener(e, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
      if (warningRef.current) clearTimeout(warningRef.current)
    }
  }, [session])

  return null
}
