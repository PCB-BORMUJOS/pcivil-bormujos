'use client'

import { Suspense } from 'react'
import { PrfForm } from '@/components/partes/prf-form'
import { Loader2 } from 'lucide-react'

export default function PrfPartePage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>}>
            <PrfForm />
        </Suspense>
    )
}
