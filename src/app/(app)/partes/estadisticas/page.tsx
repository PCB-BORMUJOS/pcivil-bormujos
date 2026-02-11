'use client'
import { useState, useEffect } from 'react'

export default function EstadisticasPage() {
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Mock data for now or fetch from API if we implement one
        setLoading(true)
        setTimeout(() => {
            setStats({
                totalServicios: 124,
                horasTotales: 450,
                serviciosPorTipo: [
                    { tipo: 'Soporte Vital', cantidad: 45 },
                    { tipo: 'Incendios', cantidad: 12 },
                    { tipo: 'Preventivos', cantidad: 30 },
                    { tipo: 'Otros', cantidad: 37 }
                ],
                topVoluntarios: [
                    { nombre: 'Juan Pérez (B-13)', servicios: 40 },
                    { nombre: 'Maria Garcia (B-15)', servicios: 32 },
                    { nombre: 'Carlos Ruiz (B-01)', servicios: 28 }
                ]
            })
            setLoading(false)
        }, 1000)
    }, [])

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando estadísticas...</div>

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Estadísticas del Servicio</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Total Servicios" value={stats.totalServicios} color="bg-blue-500" />
                <StatCard title="Horas Totales" value={`${stats.horasTotales}h`} color="bg-green-500" />
                <StatCard title="Promedio Diario" value="2.4" color="bg-orange-500" />
                <StatCard title="Vehículos Activos" value="4" color="bg-purple-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow border">
                    <h3 className="text-lg font-bold mb-4 text-gray-700">Servicios por Tipología</h3>
                    <div className="space-y-3">
                        {stats.serviciosPorTipo.map((item: any) => (
                            <div key={item.tipo}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>{item.tipo}</span>
                                    <span className="font-semibold">{item.cantidad}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(item.cantidad / stats.totalServicios) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow border">
                    <h3 className="text-lg font-bold mb-4 text-gray-700">Top Voluntarios</h3>
                    <div className="space-y-4">
                        {stats.topVoluntarios.map((vol: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between border-b pb-2 last:border-0">
                                <div className="flex items-center gap-3">
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-700' : 'bg-orange-50 text-orange-700'}`}>
                                        {idx + 1}
                                    </span>
                                    <span className="font-medium text-gray-700">{vol.nombre}</span>
                                </div>
                                <span className="font-bold text-gray-900">{vol.servicios} <span className="text-xs font-normal text-gray-500">servicios</span></span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, color }: any) {
    return (
        <div className="bg-white p-6 rounded-xl shadow border flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500 font-medium uppercase">{title}</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-lg ${color} opacity-20`}></div>
        </div>
    )
}
