# Laboratorio Keycloak UOIT

Laboratorio incremental de identidad y acceso para el Sistema Integral de
Gestión de la UOIT.

## Estado actual

Actualmente están disponibles:

- Keycloak 26.7.0.
- PostgreSQL como almacenamiento persistente de Keycloak.
- React, TypeScript y Vite.
- Integración del frontend mediante `keycloak-js`.
- El realm `uoit`, almacenado en la base de datos local.
- El cliente público `sig-uoit-frontend`.
- Authorization Code Flow con PKCE S256 obligatorio.
- Renovación del access token, lectura de claims y cierre de sesión.

Todavía no están implementados:

- Los clientes `sig-uoit-api` y `sig-uoit-agent`.
- FastAPI y su base de datos funcional.
- La autorización funcional mediante roles.
- Una exportación saneada del realm dentro de `realm-import/`.

La integración compila y pasa ESLint. La prueba interactiva de login, renovación
y logout debe completarse desde el navegador.

## Manual del laboratorio

El procedimiento completo, las explicaciones y la guía para continuar en otra
computadora están en:

- [Manual del laboratorio hasta la integración del frontend](docs/MANUAL-KEYCLOAK-UOIT.md)

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

Completar la prueba interactiva de login, renovación y logout. Después se
podrán crear roles de laboratorio y comprobar su aparición en los claims.
