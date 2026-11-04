'use client'

import { signOut } from 'next-auth/react'
import { GraduationCap, LogOut } from 'lucide-react'

export default function AulaHeader({ nombre, rol }: { nombre: string; rol?: string }) {
    const esFormador = rol === 'formador_externo' || rol === 'formador'
    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-green-100 text-green-700"><GraduationCap className="w-5 h-5" /></div>
                    <div>
                        <div className="font-bold text-gray-900 leading-none">Aula de Formación</div>
                        <div className="text-xs text-gray-500">Protección Civil Bormujos</div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <div className="text-sm text-gray-700 leading-none">{nombre}</div>
                        <div className="text-xs text-gray-400">{esFormador ? 'Formador' : 'Alumno'}</div>
                    </div>
                    <button
                        onClick={() => signOut({ callbackUrl: '/login' })}
                        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600 border border-gray-200 rounded-lg px-3 py-1.5"
                    >
                        <LogOut className="w-4 h-4" /> Salir
                    </button>
                </div>
            </div>
        </header>
    )
}
