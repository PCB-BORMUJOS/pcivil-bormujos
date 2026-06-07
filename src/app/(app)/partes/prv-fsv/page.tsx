'use client'

import React, { Suspense } from 'react'
import { PrvFsvForm } from '@/components/partes/prv-fsv-form'
import { Loader2 } from 'lucide-react'

export default function PrvFsvPartePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="animate-spin w-8 h-8 text-blue-600" />
          <span className="ml-2 text-gray-600 font-medium">Cargando formulario...</span>
        </div>
      }
    >
      <PrvFsvForm />
    </Suspense>
  )
}
