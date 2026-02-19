'use client';

import { useState, useEffect } from 'react';
import {
    History, Search, Filter, Download, ChevronLeft, ChevronRight,
    Calendar, User, FileText, Activity, RefreshCw, ChevronDown
} from 'lucide-react';

interface AuditLog {
    id: string;
    accion: string;
    entidad: string;
    entidadId: string | null;
    datosAnteriores: any;
    datosNuevos: any;
    usuarioId: string | null;
    usuarioEmail: string | null;
    usuarioNombre: string | null;
    ip: string | null;
    userAgent: string | null;
    descripcion: string | null;
    modulo: string | null;
    createdAt: string;
}

interface Filtros {
    acciones: { accion: string; cantidad: number }[];
    entidades: { entidad: string; cantidad: number }[];
    modulos: { modulo: string; cantidad: number }[];
}

export default function TrazabilidadPanel() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState<Filtros>({ acciones: [], entidades: [], modulos: [] });
    const [opciones, setOpciones] = useState<{ acciones: string[]; entidades: string[]; modulos: string[] }>({
        acciones: [],
        entidades: [],
        modulos: []
    });

    // Estados de filtros
    const [filtroAccion, setFiltroAccion] = useState('');
    const [filtroEntidad, setFiltroEntidad] = useState('');
    const [filtroModulo, setFiltroModulo] = useState('');
    const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
    const [filtroFechaFin, setFiltroFechaFin] = useState('');
    const [busqueda, setBusqueda] = useState('');

    // Paginación
    const [pagina, setPagina] = useState(1);
    const [totalPaginas, setTotalPaginas] = useState(1);
    const [total, setTotal] = useState(0);

    // Expandir detalle
    const [logExpandido, setLogExpandido] = useState<string | null>(null);

    const cargarLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('pagina', pagina.toString());
            params.set('limite', '25');

            if (filtroAccion) params.set('accion', filtroAccion);
            if (filtroEntidad) params.set('entidad', filtroEntidad);
            if (filtroModulo) params.set('modulo', filtroModulo);
            if (filtroFechaInicio) params.set('fechaInicio', filtroFechaInicio);
            if (filtroFechaFin) params.set('fechaFin', filtroFechaFin);
            if (busqueda) params.set('busqueda', busqueda);

            const res = await fetch(`/api/admin/audit?${params.toString()}`);
            const data = await res.json();

            if (data.logs) {
                setLogs(data.logs);
                setFiltros(data.filtros);
                setOpciones(data.opciones);
                setTotal(data.paginacion?.total || 0);
                setTotalPaginas(data.paginacion?.totalPaginas || 1);
            }
        } catch (error) {
            console.error('Error cargando logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarLogs();
    }, [pagina, filtroAccion, filtroEntidad, filtroModulo, filtroFechaInicio, filtroFechaFin, busqueda]);

    const limpiarFiltros = () => {
        setFiltroAccion('');
        setFiltroEntidad('');
        setFiltroModulo('');
        setFiltroFechaInicio('');
        setFiltroFechaFin('');
        setBusqueda('');
        setPagina(1);
    };

    const getColorAccion = (accion: string) => {
        const colores: Record<string, string> = {
            CREATE: 'bg-green-100 text-green-700 border-green-200',
            UPDATE: 'bg-blue-100 text-blue-700 border-blue-200',
            DELETE: 'bg-red-100 text-red-700 border-red-200',
            LOGIN: 'bg-purple-100 text-purple-700 border-purple-200',
            LOGOUT: 'bg-gray-100 text-gray-700 border-gray-200',
            EXPORT: 'bg-orange-100 text-orange-700 border-orange-200',
            IMPORT: 'bg-cyan-100 text-cyan-700 border-cyan-200',
            VIEW: 'bg-slate-100 text-slate-700 border-slate-200',
            APPROVE: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            REJECT: 'bg-rose-100 text-rose-700 border-rose-200',
            ASSIGN: 'bg-indigo-100 text-indigo-700 border-indigo-200',
            ACTIVATE: 'bg-green-100 text-green-700 border-green-200',
            DEACTIVATE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            UPLOAD: 'bg-teal-100 text-teal-700 border-teal-200',
            DOWNLOAD: 'bg-lime-100 text-lime-700 border-lime-200',
        };
        return colores[accion] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const formatFecha = (fecha: string) => {
        const d = new Date(fecha);
        return d.toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <History className="text-orange-600" />
                        Trazabilidad del Sistema
                    </h3>
                    <p className="text-sm text-slate-500">
                        Registro de todas las acciones realizadas en el sistema
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">
                        {total} registros
                    </span>
                    <button
                        onClick={cargarLogs}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Actualizar"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Filter size={18} className="text-slate-400" />
                    <span className="font-medium text-slate-700">Filtros</span>
                    {(filtroAccion || filtroEntidad || filtroModulo || filtroFechaInicio || filtroFechaFin || busqueda) && (
                        <button
                            onClick={limpiarFiltros}
                            className="ml-auto text-xs text-orange-600 hover:text-orange-700"
                        >
                            Limpiar filtros
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                    {/* Búsqueda */}
                    <div className="lg:col-span-2 relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar en registros..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                    </div>

                    {/* Acción */}
                    <select
                        value={filtroAccion}
                        onChange={(e) => setFiltroAccion(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="">Todas las acciones</option>
                        {opciones.acciones.map(a => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>

                    {/* Entidad */}
                    <select
                        value={filtroEntidad}
                        onChange={(e) => setFiltroEntidad(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                    >
                        <option value="">Todas las entidades</option>
                        {opciones.entidades.map(e => (
                            <option key={e} value={e}>{e}</option>
                        ))}
                    </select>

                    {/* Fecha inicio */}
                    <input
                        type="date"
                        value={filtroFechaInicio}
                        onChange={(e) => setFiltroFechaInicio(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                        placeholder="Desde"
                    />

                    {/* Fecha fin */}
                    <input
                        type="date"
                        value={filtroFechaFin}
                        onChange={(e) => setFiltroFechaFin(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500"
                        placeholder="Hasta"
                    />
                </div>

                {/* Estadísticas rápidas */}
                <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                    <div className="text-xs">
                        <span className="text-slate-400">Por acción: </span>
                        {filtros.acciones.slice(0, 5).map((f, i) => (
                            <span key={f.accion} className="mr-2">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${getColorAccion(f.accion)}`}>
                                    {f.accion}: {f.cantidad}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabla de logs */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-12 text-center">
                        <RefreshCw size={32} className="mx-auto animate-spin text-orange-600" />
                        <p className="text-sm text-slate-500 mt-4">Cargando registros...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center">
                        <History size={48} className="mx-auto text-slate-200 mb-4" />
                        <p className="text-slate-500">No se encontraron registros</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 border-b">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase w-12"></th>
                                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Fecha/Hora</th>
                                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Acción</th>
                                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Entidad</th>
                                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Usuario</th>
                                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">Descripción</th>
                                        <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase">IP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {logs.map((log) => (
                                        <>
                                            <tr key={log.id} className="hover:bg-slate-50">
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={() => setLogExpandido(logExpandido === log.id ? null : log.id)}
                                                        className="p-1 hover:bg-slate-100 rounded"
                                                    >
                                                        <ChevronDown
                                                            size={18}
                                                            className={`text-slate-400 transition-transform ${logExpandido === log.id ? 'rotate-180' : ''}`}
                                                        />
                                                    </button>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                                                    {formatFecha(log.createdAt)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getColorAccion(log.accion)}`}>
                                                        {log.accion}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div>
                                                        <span className="font-medium text-slate-700 text-sm">{log.entidad}</span>
                                                        {log.entidadId && (
                                                            <span className="text-xs text-slate-400 ml-1">#{log.entidadId.slice(0, 8)}</span>
                                                        )}
                                                    </div>
                                                    {log.modulo && (
                                                        <span className="text-xs text-slate-400">{log.modulo}</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4">
                                                    {log.usuarioNombre ? (
                                                        <div>
                                                            <span className="text-sm font-medium text-slate-700">{log.usuarioNombre}</span>
                                                            <span className="text-xs text-slate-400 block">{log.usuarioEmail}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-slate-400">Sistema</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-slate-600 max-w-xs truncate">
                                                    {log.descripcion || '-'}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-slate-400 font-mono">
                                                    {log.ip || '-'}
                                                </td>
                                            </tr>
                                            {logExpandido === log.id && (
                                                <tr key={`${log.id}-detail`}>
                                                    <td colSpan={7} className="bg-slate-50 p-4">
                                                        <div className="grid grid-cols-2 gap-6">
                                                            {/* Datos anteriores */}
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                                                    <ChevronLeft size={14} /> Datos anteriores
                                                                </h4>
                                                                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto max-h-40">
                                                                    {log.datosAnteriores
                                                                        ? JSON.stringify(log.datosAnteriores, null, 2)
                                                                        : <span className="text-slate-400">Sin datos anteriores</span>}
                                                                </pre>
                                                            </div>

                                                            {/* Datos nuevos */}
                                                            <div>
                                                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                                                                    <ChevronRight size={14} /> Datos nuevos
                                                                </h4>
                                                                <pre className="text-xs bg-white p-3 rounded border overflow-x-auto max-h-40">
                                                                    {log.datosNuevos
                                                                        ? JSON.stringify(log.datosNuevos, null, 2)
                                                                        : <span className="text-slate-400">Sin datos nuevos</span>}
                                                                </pre>
                                                            </div>
                                                        </div>

                                                        {/* Metadata adicional */}
                                                        <div className="mt-4 flex gap-4 text-xs text-slate-400">
                                                            <span>ID: <code className="bg-slate-100 px-1 rounded">{log.id}</code></span>
                                                            {log.userAgent && (
                                                                <span className="truncate max-w-md">User-Agent: <code className="bg-slate-100 px-1 rounded">{log.userAgent}</code></span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Paginación */}
                        <div className="p-4 border-t flex items-center justify-between">
                            <div className="text-sm text-slate-500">
                                Página {pagina} de {totalPaginas}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                                    disabled={pagina === 1}
                                    className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-sm text-slate-600 px-2">
                                    {pagina} / {totalPaginas}
                                </span>
                                <button
                                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                                    disabled={pagina === totalPaginas}
                                    className="p-2 border rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
