# LASFIFIJAS

LASFIFIJAS es una aplicación web de análisis deportivo, pronósticos y membresías Premium. Incluye una landing pública, autenticación para clientes y administradores, dashboard de cliente, administración de pronósticos y gestión de membresías.

## Stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS y styled-components.
- Backend: NestJS 11, Passport JWT, class-validator y TypeScript.
- Base de datos: PostgreSQL/Supabase mediante Prisma 7.
- Monorepo: npm workspaces.

## Estructura

```text
apps/
  web/   Frontend Next.js
  api/   API NestJS y Prisma
packages/  Reservado para paquetes compartidos
```

## Requisitos

- Node.js 22 o una versión compatible con las dependencias declaradas.
- npm 11.6.1.
- Una base PostgreSQL/Supabase de desarrollo.

## Instalación

```bash
npm ci
```

No mezcles npm con pnpm o yarn. El lockfile oficial es `package-lock.json`.

## Variables de entorno

Usa los archivos de ejemplo como referencia y crea archivos locales que nunca deben versionarse:

```bash
apps/api/.env.example
apps/web/.env.example
```

El backend requiere `DATABASE_URL` y `JWT_SECRET`. También admite `FRONTEND_URL` y `PORT`. El frontend admite `NEXT_PUBLIC_API_URL`; la llave pública de Culqi es opcional hasta configurar su entorno de pruebas.

Nunca copies credenciales reales en los archivos `.env.example` ni publiques archivos `.env`.

## Desarrollo

Frontend y backend simultáneamente:

```bash
npm run dev
```

Por separado:

```bash
npm run dev:web
npm run dev:api
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Validación

```bash
npm exec --workspace=web -- tsc --noEmit
npm run lint --workspace=web
npm run build --workspace=web

npm exec --workspace=api -- tsc --noEmit
npm exec --workspace=api -- eslint "{src,apps,libs,test}/**/*.ts"
npm test --workspace=api -- --runInBand
npm run test:e2e --workspace=api -- --runInBand
npm run build --workspace=api
```

## Pagos y membresías de prueba

La pasarela actual es una simulación: no procesa ni genera cobros reales. Al completar correctamente el flujo, la aplicación llama al endpoint autenticado `/memberships/purchase` y activa una membresía de prueba persistida para el usuario.

No introduzcas datos reales de tarjeta ni credenciales comerciales. La integración futura con Culqi Checkout Custom requerirá tokenización, confirmación segura en backend, webhooks e idempotencia antes de habilitar pagos reales.

## Estado

El proyecto está en desarrollo y utiliza datos, membresías y pagos de prueba. No está habilitado para procesar transacciones comerciales reales.

