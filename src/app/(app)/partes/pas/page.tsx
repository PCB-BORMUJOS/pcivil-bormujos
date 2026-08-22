'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PasLista } from '@/components/partes/pas-lista'
import { PasForm } from '@/components/partes/pas-form'
import { Loader2 } from 'lucide-react'

function PasRouter() {
    const params = useSearchParams()
    // Con ?id= o ?nuevo=1 se abrirá el formulario; sin ellos, el listado.
    const esFormulario = params.has('id') || params.has('nuevo')
    return esFormulario ? <PasForm /> : <PasLista />
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
