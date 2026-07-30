# Laboratorio Keycloak UOIT

Laboratorio incremental de identidad y acceso para el Sistema Integral de
Gestión de la UOIT.

## Estado actual

Actualmente están disponibles:

- Keycloak 26.x.
- PostgreSQL como almacenamiento persistente de Keycloak.
- React, TypeScript y Vite.
- La dependencia `keycloak-js`, todavía sin integrar.
- El realm `uoit`, almacenado en la base de datos local.

Todavía no están implementados:

- El cliente público `sig-uoit-frontend`.
- Los clientes `sig-uoit-api` y `sig-uoit-agent`.
- La inicialización OIDC del frontend.
- FastAPI y su base de datos funcional.

## Arquitectura prevista

```text
Navegador
  → React + TypeScript + Vite
  → OpenID Connect: Authorization Code + PKCE S256
  → Keycloak
  → PostgreSQL de Keycloak

React
  → Authorization: Bearer <access_token>
  → FastAPI
  → Base de datos funcional
```

Keycloak administra identidades, sesiones, MFA y roles generales. FastAPI
validará los access tokens y aplicará permisos finos y reglas de negocio. La
base de datos interna de Keycloak no debe utilizarse como base funcional.

## Estructura

```text
.
├── .env.example          # Plantilla de infraestructura
├── docker-compose.yml    # Keycloak, PostgreSQL, red y volumen
├── realm-import/         # Exportaciones reproducibles de realms
├── backups/              # Respaldos locales no versionados
└── frontend/
    ├── .env.example      # Configuración pública esperada por Vite
    ├── package.json
    └── src/
```

El archivo `.env` contiene credenciales locales y nunca debe confirmarse en
Git. Las variables con prefijo `VITE_` se incorporan al código entregado al
navegador y, por tanto, tampoco pueden contener secretos.

## Requisitos

- Docker Engine.
- Docker Compose.
- Node.js y npm compatibles con las versiones declaradas por el frontend.

## Preparación local

Crear los archivos locales a partir de las plantillas:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```

Antes de iniciar los servicios, sustituir en `.env` las contraseñas de ejemplo
por valores largos, aleatorios y exclusivos de este laboratorio.

No es necesario colocar un `client_secret` en `frontend/.env.local`: una
aplicación React es un cliente público y no puede custodiar secretos.

## Infraestructura

Validar y levantar los servicios:

```bash
docker compose config --quiet
docker compose up -d
docker compose ps
```

Revisar los logs:

```bash
docker compose logs --tail=100 keycloak
docker compose logs --tail=100 postgres
```

Comprobar Keycloak y el realm:

```bash
curl -I http://localhost:8080/
curl http://localhost:8080/realms/uoit/.well-known/openid-configuration
```

PostgreSQL no publica su puerto en el host. Keycloak se publica únicamente en
`127.0.0.1:8080` para el laboratorio local.

## Frontend

Instalar dependencias y comprobar el proyecto:

```bash
cd frontend
npm ci
npm run lint
npm run build
npm run dev
```

Mientras `vite.config.ts` no indique otro puerto, el servidor de desarrollo
utilizará normalmente `http://localhost:5173`.

## Persistencia y operaciones destructivas

El volumen `keycloak_uoit_postgres_data` conserva la configuración de Keycloak
después de:

```bash
docker compose down
```

En cambio, el siguiente comando elimina también el volumen y puede destruir
realms, clientes, usuarios, roles y sesiones:

```text
docker compose down -v
```

No debe ejecutarse sin un respaldo verificado.

## Próxima fase

Crear y verificar el cliente público `sig-uoit-frontend` dentro del realm
`uoit`, antes de modificar el código React.
