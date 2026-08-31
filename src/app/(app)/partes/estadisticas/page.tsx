'use client'

/**
 * Estadísticas de los partes PSI.
 *
 * Sustituye a la versión anterior, que mostraba cifras inventadas y un ranking
 * con nombres que no correspondían a nadie. El contenido lo pinta el mismo
 * componente que la pestaña «Partes» del módulo de Estadísticas, de modo que
 * aquí y allí se ve exactamente lo mismo.
 */

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import EstadisticasPartes from '@/components/estadisticas/EstadisticasPartes'

export default function EstadisticasPsiPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/partes" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700" title="Volver a los partes PSI">
                    <ChevronLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Estadísticas de partes PSI</h1>
                    <p className="text-slate-500 mt-1">Partes de servicio e intervención</p>
                </div>
            </div>
            <EstadisticasPartes tipos={['PSI']} />
        </div>
    )
}
