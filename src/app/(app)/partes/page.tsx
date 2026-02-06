'use client'
import { FileText } from 'lucide-react'

export default function PartesPage() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-indigo-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Partes de Servicio</h1>
          <p className="text-gray-600">Registro y gestión de partes de intervención</p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Módulo en desarrollo</h2>
        <p className="text-gray-600">Esta funcionalidad estará disponible próximamente</p>
      </div>
    </div>
  )
}
