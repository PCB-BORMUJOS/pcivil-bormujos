import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Portada del aula (Fase 2A). El listado real de cursos y el reproductor de
// contenido llegan en la Fase 2B, sobre la API /api/formacion/aula.
export default async function AulaHome() {
    const session = await getServerSession(authOptions)
    const u = (session?.user as any) || {}
    const esFormador = u.rol === 'formador_externo' || u.rol === 'formador'
    const nombre = (u.nombre as string) || 'voluntario/a'

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Hola, {nombre}</h1>
                <p className="text-gray-500 mt-1">
                    {esFormador
                        ? 'Desde aquí impartirás y evaluarás tus acciones formativas.'
                        : 'Desde aquí realizarás tus cursos de formación: contenidos, evaluaciones y prácticas.'}
                </p>
            </div>

            <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center text-gray-400">
                <p className="font-medium text-gray-500">
                    {esFormador ? 'Tus cursos a impartir aparecerán aquí.' : 'Tus cursos activos aparecerán aquí.'}
                </p>
                <p className="text-sm mt-1">Estamos preparando el aula. Próximamente podrás acceder al contenido formativo.</p>
            </div>
        </div>
    )
}
