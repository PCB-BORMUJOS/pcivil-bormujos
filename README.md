# 🛡️ Protección Civil Bormujos

Sistema de gestión integral para la agrupación de Protección Civil de Bormujos.

## 📋 Características

- **Dashboard** - Vista general del estado de la agrupación
- **Inventario** - Gestión de material por categorías (Incendios, Socorrismo, Logística, etc.)
- **Vehículos** - Control de flota y asignaciones
- **Cuadrantes** - Planificación de guardias y turnos
- **Personal** - Gestión de voluntarios y roles
- **Incidencias** - Registro y seguimiento de intervenciones
- **Configuración** - Ajustes del sistema

## 🚀 Tecnologías

- **Framework**: Next.js 14 (App Router)
- **Base de datos**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Autenticación**: NextAuth.js
- **Estilos**: Tailwind CSS
- **Despliegue**: Vercel

## 📦 Requisitos previos

- Node.js 18+ 
- npm o pnpm
- Cuenta en [Neon](https://neon.tech) (base de datos)
- Cuenta en [Vercel](https://vercel.com) (despliegue)
- Cuenta en [GitHub](https://github.com) (código)

## 🛠️ Instalación local

### 1. Clonar el repositorio

```bash
git clone https://github.com/TU_USUARIO/proteccion-civil-bormujos.git
cd proteccion-civil-bormujos
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Edita `.env.local` con tus valores:

```env
DATABASE_URL="postgresql://..."  # URL de Neon
NEXTAUTH_SECRET="..."            # Genera con: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Inicializar la base de datos

```bash
# Generar cliente de Prisma
npm run db:generate

# Crear tablas en la base de datos
npm run db:push

# Cargar datos iniciales
npm run db:seed
```

### 5. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 🔐 Credenciales por defecto

Después de ejecutar el seed:

- **Email**: admin@proteccioncivil-bormujos.es
- **Contraseña**: admin123

⚠️ **IMPORTANTE**: Cambia estas credenciales en producción.

## 📁 Estructura del proyecto

```
proteccion-civil-bormujos/
├── prisma/
│   ├── schema.prisma      # Esquema de base de datos
│   └── seed.ts            # Datos iniciales
├── public/                # Archivos estáticos
├── src/
│   ├── app/              # Páginas (Next.js App Router)
│   │   ├── (app)/        # Páginas con layout de la app
│   │   │   ├── dashboard/
│   │   │   ├── inventario/
│   │   │   ├── vehiculos/
│   │   │   └── ...
│   │   ├── api/          # API Routes
│   │   ├── layout.tsx    # Layout raíz
│   │   └── globals.css   # Estilos globales
│   ├── components/
│   │   ├── layout/       # Sidebar, Header, etc.
│   │   ├── ui/           # Componentes reutilizables
│   │   └── modules/      # Componentes específicos
│   ├── lib/
│   │   ├── db/           # Cliente de Prisma
│   │   ├── auth/         # Configuración de auth
│   │   └── utils/        # Utilidades
│   └── types/            # Tipos TypeScript
├── .env.example          # Variables de entorno ejemplo
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## 🚢 Despliegue

### Vercel (Recomendado)

1. Conecta tu repositorio de GitHub con Vercel
2. Configura las variables de entorno en Vercel
3. Vercel desplegará automáticamente con cada push

### Variables de entorno en Vercel

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://tu-dominio.vercel.app
```

## 📊 Comandos útiles

```bash
# Desarrollo
npm run dev          # Iniciar servidor de desarrollo

# Base de datos
npm run db:generate  # Regenerar cliente Prisma
npm run db:push      # Aplicar cambios al esquema
npm run db:migrate   # Crear migración
npm run db:studio    # Abrir Prisma Studio (GUI)
npm run db:seed      # Cargar datos iniciales

# Producción
npm run build        # Construir para producción
npm run start        # Iniciar servidor de producción

# Calidad
npm run lint         # Ejecutar linter
```

## 🔄 Migración futura a servidor propio

Este proyecto está diseñado para poder migrarse a tu propio servidor:

1. **Base de datos**: Instala PostgreSQL y migra los datos desde Neon
2. **Aplicación**: Despliega con Docker, PM2, o directamente con Node.js
3. **Variables**: Actualiza las URLs en el archivo `.env`

Ver documentación detallada en `/docs/migracion-servidor.md` (próximamente).

## 🤝 Contribución

1. Fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit de tus cambios (`git commit -m 'Añadir nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Proyecto privado - Protección Civil Bormujos

---

Desarrollado con ❤️ para los voluntarios de Protección Civil de Bormujos
