import { redirect } from 'next/navigation'

/**
 * Esta página mostraba estadísticas INVENTADAS: 124 servicios, 450 horas y un
 * ranking con nombres que no corresponden a nadie del servicio («Juan Pérez
 * B-13», «Maria Garcia B-15», «Carlos Ruiz B-01»). Estaba marcada en el propio
 * código como «Mock data for now» y nunca se llegó a conectar con datos reales.
 *
 * No estaba enlazada en el menú, pero se alcanzaba escribiendo la dirección, con
 * el riesgo de que alguien tomara esos números por buenos.
 *
 * Se redirige al módulo de estadísticas, que sí consulta la base de datos.
 */
export default function EstadisticasPartesPage() {
    redirect('/estadisticas')
}
