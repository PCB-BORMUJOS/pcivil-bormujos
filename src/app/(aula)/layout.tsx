import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import AulaHeader from './AulaHeader'

export const metadata: Metadata = {
    title: 'Aula de Formación — Protección Civil Bormujos',
    description: 'Plataforma de formación del voluntariado de Protección Civil de Bormujos',
}

// Grupo de rutas INDEPENDIENTE del panel operativo (app). Shell propio, sin el
// menú de la aplicación. Accesible a alumnos y formadores (internos y externos).
export default async function AulaLayout({ children }: { children: React.ReactNode }) {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
        redirect('/login?callbackUrl=/aula')
    }
    const u = session.user as any
    const nombre = `${u.nombre ?? ''} ${u.apellidos ?? ''}`.trim() || u.email || 'Usuario'

    return (
        <div className="min-h-screen bg-slate-50">
            <AulaHeader nombre={nombre} rol={u.rol} />
            <main className="max-w-5xl mx-auto p-4 md:p-6">{children}</main>
        </div>
    )
}
