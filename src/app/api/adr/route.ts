import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import ADR_DATA from '@/data/adr-data'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const onu = searchParams.get('onu')?.trim()
  const q = searchParams.get('q')?.trim().toLowerCase()

  if (onu) {
    const sustancia = ADR_DATA.find(s => s.onu === onu.padStart(4, '0'))
    if (!sustancia) return NextResponse.json({ error: 'Número ONU no encontrado' }, { status: 404 })
    return NextResponse.json({ sustancia })
  }

  if (q) {
    const resultados = ADR_DATA.filter(s =>
      s.onu.includes(q) ||
      s.nombre.toLowerCase().includes(q)
    ).slice(0, 20)
    return NextResponse.json({ resultados })
  }

  return NextResponse.json({ error: 'Proporciona onu= o q=' }, { status: 400 })
}
