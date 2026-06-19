import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { uploadToGoogleDrive } from '@/lib/google-drive'

const CAMPOS_LABEL: Record<string, string> = {
  indicativo:       'Indicativo',
  nombre:           'Nombre',
  apellidos:        'Apellidos',
  dniNie:           'DNI/NIE',
  fechaNacimiento:  'F. Nacimiento',
  email:            'Email',
  telefono:         'Teléfono',
  telefonoFijo:     'Teléfono Fijo',
  rol:              'Rol',
  areaAsignada:     'Área Asignada',
  categoria:        'Categoría',
  fechaAlta:        'Fecha Alta',
  estado:           'Estado',
  direccion:        'Dirección',
  localidad:        'Localidad',
  provincia:        'Provincia',
  codigoPostal:     'Código Postal',
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const rol = (session.user as any)?.rol ?? 'voluntario'
  const nivel = ({ superadmin: 5, coordinador: 4, admin: 4, jefe_area: 3 } as Record<string,number>)[rol] ?? 0
  if (nivel < 4) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  try {
    const { campos, formato } = await request.json() as { campos: string[]; formato: 'sheets' | 'csv' }
    if (!campos?.length) return NextResponse.json({ error: 'Selecciona al menos un campo' }, { status: 400 })

    const voluntarios = await prisma.usuario.findMany({
      where: { activo: true },
      include: {
        rol: { select: { nombre: true } },
        fichaVoluntario: {
          select: {
            indicativo2: true, dniNie: true, fechaNacimiento: true, telefonoFijo: true,
            areaAsignada: true, categoria: true, fechaAlta: true,
            domicilio: true, numero: true, localidad: true, provincia: true, codigoPostal: true,
          }
        }
      },
      orderBy: [{ apellidos: 'asc' }, { nombre: 'asc' }]
    })

    const getValue = (v: any, campo: string): string => {
      const f = v.fichaVoluntario
      switch (campo) {
        case 'indicativo':      return v.numeroVoluntario || ''
        case 'nombre':          return v.nombre || ''
        case 'apellidos':       return v.apellidos || ''
        case 'dniNie':          return f?.dniNie || ''
        case 'fechaNacimiento': return f?.fechaNacimiento ? new Date(f.fechaNacimiento).toLocaleDateString('es-ES') : ''
        case 'email':           return v.email || ''
        case 'telefono':        return v.telefono || ''
        case 'telefonoFijo':    return f?.telefonoFijo || ''
        case 'rol':             return v.rol?.nombre || ''
        case 'areaAsignada':    return f?.areaAsignada || ''
        case 'categoria':       return f?.categoria || ''
        case 'fechaAlta':       return f?.fechaAlta ? new Date(f.fechaAlta).toLocaleDateString('es-ES') : ''
        case 'estado':          return v.activo ? 'Activo' : 'Baja'
        case 'direccion':       return f ? [f.domicilio, f.numero].filter(Boolean).join(' ') : ''
        case 'localidad':       return f?.localidad || ''
        case 'provincia':       return f?.provincia || ''
        case 'codigoPostal':    return f?.codigoPostal || ''
        default:                return ''
      }
    }

    // Cabecera CSV
    const header = campos.map(c => CAMPOS_LABEL[c] || c).join(',')
    const rows = voluntarios.map(v =>
      campos.map(c => {
        const val = getValue(v, c)
        return val.includes(',') || val.includes('"') || val.includes('\n')
          ? `"${val.replace(/"/g, '""')}"` : val
      }).join(',')
    )
    const csv = [header, ...rows].join('\n')

    if (formato === 'csv') {
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="personal-${new Date().toISOString().split('T')[0]}.csv"`,
        }
      })
    }

    // Google Sheets: subir CSV que Drive convierte automáticamente a Spreadsheet
    const buffer = Buffer.from('﻿' + csv, 'utf-8') // BOM para UTF-8
    const fecha = new Date().toLocaleDateString('es-ES').replace(/\//g, '-')
    const result = await uploadToGoogleDrive(
      buffer,
      `Personal PCB ${fecha}`,
      'text/csv',
    )

    return NextResponse.json({ success: true, url: result.url, fileId: result.fileId })
  } catch (error: any) {
    console.error('Error exportar personal:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
