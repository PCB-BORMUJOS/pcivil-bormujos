'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Mail, Lock, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react'

// Azul corporativo del servicio (#283666), el mismo de partes e informes.
const AZUL = '#283666'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', { email, password, redirect: false })
      if (result?.error) {
        setError(result.error)
        setLoading(false)
        return
      }
      window.location.href = '/dashboard'
    } catch {
      setError('Error al iniciar sesión')
      setLoading(false)
    }
  }

  // Trama fina en marca de agua que da textura al fondo.
  const trama = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Cpath d='M48 0H0v48' fill='none' stroke='%23ffffff' stroke-width='0.6' opacity='0.5'/%3E%3C/svg%3E")`

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{ background: `linear-gradient(160deg, #31406f 0%, ${AZUL} 45%, #1b2545 100%)` }}
    >
      {/* Trama geométrica */}
      <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: trama, backgroundSize: '48px 48px' }} />

      {/* Marca de agua del logotipo */}
      <div aria-hidden className="absolute inset-0 flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo-pc-blanco.png"
          alt=""
          className="w-[1100px] max-w-none opacity-[0.035] select-none -rotate-6"
        />
      </div>

      {/* Volumen: luz superior, viñeta inferior y destello cálido */}
      <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(70% 55% at 50% -5%, rgba(255,255,255,0.16), transparent 65%)' }} />
      <div aria-hidden className="absolute inset-0" style={{ background: 'radial-gradient(45% 40% at 85% 105%, rgba(255,122,0,0.13), transparent 70%)' }} />
      <div aria-hidden className="absolute inset-0" style={{ boxShadow: 'inset 0 0 220px rgba(0,0,0,0.55)' }} />

      <div className="relative w-full max-w-[420px]">
        {/* Identidad */}
        <div className="text-center mb-9">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo-pc-blanco.png"
            alt="Protección Civil Bormujos"
            className="h-[58px] w-auto mx-auto drop-shadow-[0_4px_16px_rgba(0,0,0,0.45)]"
          />
          <div className="mt-5 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-white/25" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/65">
              Sistema de Gestión
            </p>
            <span className="h-px w-8 bg-white/25" />
          </div>
        </div>

        {/* Tarjeta de acceso */}
        <div className="rounded-2xl bg-white shadow-[0_35px_70px_-20px_rgba(0,0,0,0.65)] ring-1 ring-black/5 overflow-hidden">
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #ff7a00, #ffa04d)' }} />
          <div className="p-8">
            <h1 className="text-[19px] font-bold text-slate-900 text-center">Acceso al sistema</h1>
            <p className="text-[13px] text-slate-500 text-center mt-1.5">
              Introduce tus credenciales para continuar
            </p>

            {error && (
              <div className="mt-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                <AlertCircle size={17} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 text-[15px] bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                    placeholder="nombre@ejemplo.com"
                    autoComplete="email"
                    required
                    suppressHydrationWarning
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                  <input
                    id="password"
                    type={verPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 text-[15px] bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all focus:bg-white focus:border-slate-400 focus:ring-4 focus:ring-slate-900/5"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    suppressHydrationWarning
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword(v => !v)}
                    aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {verPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-bold text-[15px] py-3.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(180deg, #ff8a1a, #ef6c00)' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={19} />
                    Accediendo…
                  </>
                ) : (
                  'Acceder'
                )}
              </button>
            </form>

            <div className="mt-7 pt-5 border-t border-slate-100 text-center">
              <p className="text-[13px] text-slate-500">
                ¿Problemas para acceder? Contacta con tu coordinador.
              </p>
            </div>
          </div>
        </div>

        {/* Pie */}
        <div className="mt-7 text-center">
          <p className="text-[12px] text-white/45">
            © {new Date().getFullYear()} Emilio Simón Gómez
          </p>
        </div>
      </div>
    </div>
  )
}
