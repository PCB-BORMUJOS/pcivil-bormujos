'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PasLista } from '@/components/partes/pas-lista'
import { Loader2 } from 'lucide-react'

function PasRouter() {
    const params = useSearchParams()
    // Con ?id= o ?nuevo=1 se abrirá el formulario; sin ellos, el listado.
    const esFormulario = params.has('id') || params.has('nuevo')
    if (esFormulario) {
        return (
            <div className="p-6 max-w-3xl mx-auto text-sm text-gray-500">
                El formulario del parte PAS está en construcción.
            </div>
        )
    }
    return <PasLista />
}

export default function PasPartePage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="animate-spin w-8 h-8 text-orange-500" />
            </div>
        }>
            <PasRouter />
        </Suspense>
    )
}
