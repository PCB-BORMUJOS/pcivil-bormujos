import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function setPassword() {
  const email = process.argv[2]
  const password = process.argv[3]

  if (!email || !password) {
    console.error('❌ Uso: npx tsx prisma/set-password.ts EMAIL CONTRASEÑA')
    process.exit(1)
  }

  const hashedPassword = bcrypt.hashSync(password, 10)

  const usuario = await prisma.usuario.update({
    where: { email },
    data: { password: hashedPassword }
  })

  console.log(`✅ Contraseña actualizada para: ${usuario.nombre} ${usuario.apellidos}`)
  console.log(`📧 Email: ${email}`)
  console.log(`🔑 Contraseña: ${password}`)
}

setPassword()
  .catch(console.error)
  .finally(() => prisma.$disconnect())