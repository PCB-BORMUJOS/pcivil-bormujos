'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PrfForm } from '@/components/partes/prf-form'
import { PrfLista } from '@/components/partes/prf-lista'
import { Loader2 } from 'lucide-react'

function PrfRouter() {
    const params = useSearchParams()
    // Con ?id= o ?nuevo=1 se abre el formulario; sin ellos, el listado de partes.
    const esFormulario = params.has('id') || params.has('nuevo')
    return esFormulario ? <PrfForm /> : <PrfLista />
}

export default function PrfPartePage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>}>
            <PrfRouter />
        </Suspense>
    )
}
