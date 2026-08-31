'use client'

/**
 * Estadísticas de los partes PAS (soporte vital básico).
 *
 * El contenido lo pinta el mismo componente que la pestaña «Partes» del módulo
 * de Estadísticas, de modo que aquí y allí se ve exactamente lo mismo.
 */

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import EstadisticasPartes from '@/components/estadisticas/EstadisticasPartes'

export default function EstadisticasPasPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/partes/pas" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700" title="Volver a los partes PAS">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Estadísticas de partes PAS SVB</h1>
                    <p className="text-slate-500 mt-1">Asistencias de soporte vital básico</p>
                </div>
            </div>
            <EstadisticasPartes tipos={['PAS']} />
        </div>
    )
}
