# Manual del laboratorio Keycloak UOIT

## Alcance

Este manual documenta el laboratorio hasta la integración de un frontend React
con Keycloak mediante OpenID Connect, Authorization Code Flow y PKCE S256.

Estado documentado: 31 de julio de 2026.

Incluye:

1. Organización y seguridad básica del repositorio.
2. Keycloak y PostgreSQL mediante Docker Compose.
3. Realm `uoit` y cliente público `sig-uoit-frontend`.
4. Integración de React, Vite, TypeScript y `keycloak-js`.
5. Pruebas realizadas y prueba interactiva pendiente.
6. Procedimientos para continuar en otra computadora.

No incluye todavía:

- FastAPI.
- Base de datos funcional.
- Cliente `sig-uoit-api`.
- Cliente `sig-uoit-agent`.
- Autorización funcional mediante roles propios.
- MFA, TLS o proxy inverso.

## 1. Arquitectura

```text
Usuario
  │
  │ http://localhost:5173
  ▼
React + TypeScript + Vite
  │
  │ OpenID Connect
  │ Authorization Code + PKCE S256
  ▼
Keycloak 26.7.0
  │
  │ JDBC por la red interna de Docker
  ▼
PostgreSQL 17
```

Arquitectura futura:

```text
React
  │ Authorization: Bearer <access_token>
  ▼
FastAPI
  │ valida firma, issuer, audience y expiración
  │ comprueba roles y reglas de negocio
  ▼
Base de datos funcional
```

### Responsabilidades

Keycloak:

- Autentica usuarios.
- Administra identidades y sesiones.
- Puede aplicar MFA.
- Emite access tokens, ID tokens y refresh tokens.
- Entrega roles generales.

FastAPI, cuando se implemente:

- Validará criptográficamente el access token.
- Verificará `iss`, `aud` y `exp`.
- Aplicará HTTP `401` y `403`.
- Ejecutará permisos finos y reglas de negocio.
- Registrará auditoría funcional.

La base de datos interna de Keycloak no debe utilizarse como base de datos
funcional del SIG-UOIT.

## 2. Componentes implementados

| Componente | Estado |
|---|---|
| Docker Compose | Configuración válida |
| Keycloak | 26.7.0, saludable |
| PostgreSQL | 17 Alpine, saludable |
| Persistencia | Volumen `keycloak_uoit_postgres_data` |
| Realm | `uoit` |
| Frontend OIDC | `sig-uoit-frontend` |
| Tipo de cliente | Público, sin client secret |
| Flujo | Authorization Code |
| PKCE | S256 obligatorio |
| React | Integrado con `keycloak-js` |
| Renovación | `updateToken(60)` |
| Logout | Implementado |
| FastAPI | Pendiente |

## 3. Estructura del repositorio

```text
.
├── .env.example
├── .gitignore
├── README.md
├── docker-compose.yml
├── docs/
│   └── MANUAL-KEYCLOAK-UOIT.md
├── backups/
│   └── README.md
├── realm-import/
│   └── README.md
└── frontend/
    ├── .env.example
    ├── .env.local
    ├── package.json
    ├── package-lock.json
    └── src/
        ├── App.tsx
        ├── keycloak.ts
        └── main.tsx
```

Archivos locales excluidos de Git:

```text
.env
frontend/.env.local
backups/*
```

El repositorio contiene plantillas, no credenciales reales:

```text
.env.example
frontend/.env.example
```

## 4. Preparación de una instalación local

### 4.1 Requisitos

- Linux con Docker Engine.
- Docker Compose.
- Node.js y npm compatibles con `frontend/package.json`.
- Git.
- Puertos locales `8080` y `5173` disponibles.

Comprobar:

```bash
docker --version
docker compose version
node --version
npm --version
git --version
```

### 4.2 Crear los archivos locales

Desde la raíz del proyecto:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```

Editar `.env` y reemplazar las contraseñas de ejemplo por valores largos,
aleatorios y exclusivos.

No colocar secretos en variables `VITE_`. Vite incorpora esas variables al
JavaScript que recibe el navegador.

### 4.3 Variables de infraestructura

La plantilla raíz define:

```text
KEYCLOAK_VERSION
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASSWORD
KEYCLOAK_ADMIN
KEYCLOAK_ADMIN_PASSWORD
KEYCLOAK_BIND_ADDRESS
KEYCLOAK_PORT
KEYCLOAK_HOSTNAME
KEYCLOAK_LOG_LEVEL
```

### 4.4 Variables públicas del frontend

```text
VITE_API_URL=http://localhost:8000
VITE_KEYCLOAK_URL=http://localhost:8080
VITE_KEYCLOAK_REALM=uoit
VITE_KEYCLOAK_CLIENT_ID=sig-uoit-frontend
```

`VITE_API_URL` está reservado para FastAPI y todavía no se utiliza.

## 5. Infraestructura Docker

### 5.1 PostgreSQL

El servicio:

- Usa `postgres:17-alpine`.
- No publica `5432` en el host.
- Almacena los datos en `keycloak_uoit_postgres_data`.
- Tiene un health check mediante `pg_isready`.
- Sólo es accesible desde la red Docker `keycloak_uoit_net`.

### 5.2 Keycloak

El servicio:

- Usa `quay.io/keycloak/keycloak:26.7.0`.
- Ejecuta `start --import-realm`.
- Usa PostgreSQL mediante JDBC.
- Publica `8080` solamente en `127.0.0.1`.
- Mantiene la interfaz de gestión `9000` dentro del contenedor.
- Espera a que PostgreSQL esté saludable.
- Monta `realm-import/` en `/opt/keycloak/data/import`.

Se usa `start`, no `start-dev`. HTTP es aceptable únicamente para este
laboratorio limitado a `localhost`.

### 5.3 Iniciar y validar

```bash
docker compose config --quiet
docker compose up -d
docker compose ps
```

Los servicios esperados:

```text
postgres  healthy
keycloak  healthy
```

Revisar logs:

```bash
docker compose logs --tail=100 postgres
docker compose logs --tail=100 keycloak
```

Comprobar HTTP y OIDC Discovery:

```bash
curl -I http://localhost:8080/
curl http://localhost:8080/realms/uoit/.well-known/openid-configuration
```

El issuer esperado es:

```text
http://localhost:8080/realms/uoit
```

### 5.4 Persistencia

Este comando detiene y elimina contenedores, pero conserva el volumen:

```bash
docker compose down
```

Este otro comando también elimina el volumen y puede destruir realms,
clientes, usuarios, roles y sesiones:

```text
docker compose down -v
```

No ejecutar `down -v`, `docker volume rm` ni `docker system prune` sin un
respaldo verificado.

## 6. Realm `uoit`

Un realm es una frontera independiente de:

- Usuarios.
- Clientes.
- Roles.
- Grupos.
- Sesiones.
- Políticas de autenticación.

El realm funcional del laboratorio es `uoit`. El realm `master` se reserva para
la administración del servidor.

OIDC Discovery confirmó:

```text
issuer:
http://localhost:8080/realms/uoit

authorization endpoint:
http://localhost:8080/realms/uoit/protocol/openid-connect/auth

token endpoint:
http://localhost:8080/realms/uoit/protocol/openid-connect/token

JWKS:
http://localhost:8080/realms/uoit/protocol/openid-connect/certs
```

## 7. Cliente `sig-uoit-frontend`

Configuración comprobada:

| Opción | Valor |
|---|---|
| Realm | `uoit` |
| Client ID | `sig-uoit-frontend` |
| Protocolo | OpenID Connect |
| Enabled | On |
| Client authentication | Off |
| Authorization | Off |
| Standard Flow | On |
| Direct Access Grants | Off |
| Implicit Flow | Off |
| Service Accounts | Off |
| Device Authorization Grant | Off |
| CIBA | Off |
| Require PKCE | On |
| PKCE almacenado | `S256` |
| Require DPoP | Off |

URLs:

```text
Root URL:
http://localhost:5173

Home URL:
http://localhost:5173/

Valid redirect URIs:
http://localhost:5173/*

Valid post logout redirect URIs:
http://localhost:5173/*

Web origins:
http://localhost:5173

Admin URL:
vacío
```

`localhost`, `127.0.0.1`, una IP y un nombre DNS son orígenes diferentes. No
deben mezclarse en el navegador y la configuración del cliente.

## 8. OpenID Connect y PKCE

### Autenticación frente a autorización

Autenticación responde:

```text
¿Quién es el usuario?
```

Autorización responde:

```text
¿Qué puede hacer ese usuario?
```

La fase actual implementa autenticación. La autorización funcional todavía
está pendiente.

### OAuth 2.0 frente a OpenID Connect

OAuth 2.0 permite delegar acceso. OpenID Connect añade una capa de identidad
sobre OAuth 2.0.

### Authorization Code con PKCE

```text
1. React genera un code_verifier aleatorio.
2. React calcula code_challenge = SHA-256(code_verifier).
3. El navegador solicita autenticación con el code_challenge.
4. Keycloak autentica al usuario.
5. Keycloak devuelve un authorization code temporal.
6. keycloak-js presenta el code y el code_verifier.
7. Keycloak entrega los tokens.
```

PKCE evita que un código interceptado pueda canjearse sin el `code_verifier`.

## 9. Integración del frontend

### 9.1 Instalar dependencias

Desde `frontend/`:

```bash
npm ci
```

`keycloak-js` ya está declarado como dependencia.

### 9.2 `src/keycloak.ts`

Responsabilidades:

- Leer `VITE_KEYCLOAK_URL`.
- Leer `VITE_KEYCLOAK_REALM`.
- Leer `VITE_KEYCLOAK_CLIENT_ID`.
- Fallar explícitamente si falta una variable.
- Crear una única instancia de `Keycloak`.

Configuración esencial:

```ts
const keycloak = new Keycloak({
  url: VITE_KEYCLOAK_URL,
  realm: VITE_KEYCLOAK_REALM,
  clientId: VITE_KEYCLOAK_CLIENT_ID,
})
```

La instancia mantiene los tokens solamente en memoria. No se utiliza
`localStorage` ni `sessionStorage`.

### 9.3 `src/main.tsx`

Keycloak se inicializa antes de renderizar React:

```ts
await keycloak.init({
  onLoad: 'login-required',
  flow: 'standard',
  pkceMethod: 'S256',
  checkLoginIframe: false,
  redirectUri: `${window.location.origin}/`,
})
```

Opciones:

- `login-required`: obliga a iniciar sesión.
- `standard`: usa Authorization Code Flow.
- `S256`: activa PKCE con SHA-256.
- `checkLoginIframe: false`: evita depender del iframe y de cookies de
  terceros durante el laboratorio.
- `redirectUri`: regresa al origen actual del frontend.

Sólo después se ejecuta:

```tsx
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### 9.4 `src/App.tsx`

La pantalla:

- Lee claims seleccionados desde `keycloak.tokenParsed`.
- No imprime el JWT completo.
- Muestra `preferred_username`, `email`, `iss`, `aud`, `iat` y `exp`.
- Lee realm roles desde `realm_access.roles`.
- Lee client roles desde `resource_access`.
- Comprueba la renovación cada 30 segundos.
- Solicita renovación cuando quedan menos de 60 segundos.
- Permite renovación manual.
- Ejecuta logout con una URI permitida.

Renovación:

```ts
const refreshed = await keycloak.updateToken(60)
```

Resultado:

- `true`: Keycloak emitió un access token nuevo.
- `false`: el access token actual todavía era suficientemente válido.
- Excepción: la sesión o el refresh token ya no sirven; se solicita login.

Logout:

```ts
await keycloak.logout({
  redirectUri: `${window.location.origin}/`,
})
```

### 9.5 Access token, ID token y refresh token

Access token:

- Está destinado a una API.
- Contiene información de acceso.
- Más adelante FastAPI validará su firma y claims.

ID token:

- Describe la autenticación e identidad del usuario.
- Está destinado al cliente que inició el login.
- No debe enviarse como credencial a FastAPI.

Refresh token:

- Permite obtener nuevos access tokens.
- Es administrado en memoria por `keycloak-js`.
- No se envía a la API funcional.
- No se guarda en almacenamiento persistente.

Decodificar un token en React no valida su firma. Los claims en React sirven
para presentación; la seguridad real debe aplicarse en FastAPI.

## 10. Comprobaciones realizadas

```bash
cd frontend
npm run lint
npm run build
```

Resultado:

```text
ESLint: sin errores ni advertencias
TypeScript: correcto
Build de Vite: correcto
```

También se comprobó:

- Vite responde en `http://localhost:5173`.
- `.env.local` está ignorado.
- No existen `client_secret` en React.
- No se usa `localStorage`.
- No se usa `sessionStorage`.
- No se imprimen tokens completos.
- Existe un usuario humano habilitado en `uoit`.

## 11. Prueba interactiva pendiente

Iniciar:

```bash
cd frontend
npm run dev
```

Abrir exactamente:

```text
http://localhost:5173/
```

Resultado esperado:

```text
React
→ Keycloak
→ formulario de login del realm uoit
→ autenticación
→ regreso a React
→ pantalla de sesión autenticada
```

En el navegador:

```text
F12 → Network
```

Buscar la solicitud terminada en:

```text
/protocol/openid-connect/auth
```

Comprobar:

```text
client_id=sig-uoit-frontend
response_type=code
code_challenge_method=S256
redirect_uri=http://localhost:5173/
```

Después del login debe aparecer un `POST` a:

```text
/realms/uoit/protocol/openid-connect/token
```

No copiar ni publicar la respuesta completa del token endpoint.

Probar:

1. Visualización de claims.
2. Botón `Renovar token`.
3. Esperar una renovación automática.
4. Botón `Cerrar sesión`.
5. Confirmar que Keycloak solicita login nuevamente.

## 12. Continuar en otra computadora

Hay dos situaciones diferentes.

### Situación A: ejecutar todo localmente en la nueva computadora

El navegador, React y Keycloak se ejecutarán en la misma computadora nueva.
En este caso pueden conservarse:

```text
http://localhost:5173
http://localhost:8080
```

### Situación B: acceder desde otra computadora a un servidor remoto

En este caso `localhost` apunta a la computadora del navegador, no al servidor.
Será necesario usar un nombre DNS y HTTPS, actualizar `KC_HOSTNAME`, las
variables Vite, las redirect URIs y Web Origins.

No se recomienda publicar este laboratorio HTTP directamente en Internet.
Primero debe incorporarse TLS mediante un proxy inverso.

## 13. Qué viaja mediante Git

Sí debe viajar:

- Código React.
- `docker-compose.yml`.
- `.env.example`.
- `frontend/.env.example`.
- Documentación.
- Una exportación del realm sólo si fue revisada y saneada.

No debe viajar:

- `.env`.
- `frontend/.env.local`.
- Contraseñas.
- Tokens.
- Cookies.
- Dumps de PostgreSQL.
- Backups sin cifrar.
- Exportaciones con usuarios o secretos.

El volumen Docker no viaja mediante Git. Actualmente el realm `uoit` y su
cliente están almacenados en `keycloak_uoit_postgres_data`. Además,
`realm-import/` todavía no contiene `uoit-realm.json`.

Por tanto, clonar el repositorio hoy recupera el código, pero no reconstruye
automáticamente el estado actual de Keycloak.

## 14. Preparar el repositorio antes de trasladarlo

Revisar:

```bash
git status
git diff
git diff --cached
```

Confirmar que no existen secretos rastreados:

```bash
git ls-files .env frontend/.env.local
```

Ambos comandos deben producir una salida vacía.

Guardar los cambios de código y documentación:

```bash
git add README.md docs frontend/src frontend/.env.example
git commit -m "frontend: integrate Keycloak with PKCE"
git push
```

Antes de compartir el repositorio, rotar las credenciales que aparecieron en
versiones antiguas de Git.

## 15. Alternativa 1: exportar la configuración del realm

Esta alternativa es adecuada para reproducir el realm sin trasladar usuarios,
sesiones ni toda la base de datos.

La documentación oficial exige detener Keycloak para conseguir una exportación
consistente. PostgreSQL debe continuar activo.

Crear un directorio local ignorado:

```bash
mkdir -p backups/keycloak-export
```

Detener únicamente Keycloak:

```bash
docker compose stop keycloak
```

Exportar `uoit` sin usuarios:

```bash
docker compose run --rm --no-deps \
  -v ./backups/keycloak-export:/opt/keycloak/data/export \
  keycloak export \
  --dir /opt/keycloak/data/export \
  --realm uoit \
  --users skip
```

Volver a iniciar Keycloak:

```bash
docker compose up -d keycloak
docker compose ps
```

El archivo esperado es:

```text
backups/keycloak-export/uoit-realm.json
```

Antes de copiarlo a `realm-import/` o confirmarlo en Git:

1. Revisar que no incluya usuarios reales.
2. Revisar secretos de clientes.
3. Revisar proveedores de identidad, SMTP y claves.
4. Sustituir cualquier valor sensible por configuración externa o eliminarlo.

Una vez saneado:

```text
realm-import/uoit-realm.json
```

Keycloak importa archivos de `/opt/keycloak/data/import` al arrancar con
`--import-realm`. Si el realm ya existe, la importación de inicio se omite para
evitar sobrescribir datos.

La exportación parcial desde la consola administrativa no debe usarse para
backup o traslado entre servidores. Keycloak indica que sólo la exportación CLI
es adecuada para ese propósito.

## 16. Alternativa 2: trasladar el estado completo

Esta alternativa conserva realms, clientes, usuarios, credenciales y roles.
No conserva necesariamente todas las sesiones o eventos como una herramienta
de backup especializada.

Un dump contiene información sensible. Debe almacenarse dentro de `backups/`,
cifrarse y transferirse por un canal seguro, nunca mediante Git.

Crear el dump:

```bash
docker compose exec -T postgres sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > backups/keycloak.dump
```

Comprobar que existe y no está vacío:

```bash
test -s backups/keycloak.dump
```

Para mayor consistencia, no realizar cambios administrativos ni logins durante
el dump.

## 17. Instalar en la nueva computadora

### 17.1 Recuperar el código

```bash
git clone URL_DEL_REPOSITORIO
cd keycloak-uoit
```

### 17.2 Crear configuración local

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```

Asignar contraseñas nuevas. No copiar el `.env` antiguo por correo, chat o Git.

### 17.3 Si se usa una exportación saneada del realm

Confirmar que existe:

```text
realm-import/uoit-realm.json
```

Con una base nueva:

```bash
docker compose up -d
docker compose ps
```

Keycloak importará `uoit` sólo si todavía no existe.

Los usuarios no fueron exportados con `--users skip`. Crear un usuario de
laboratorio desde la consola administrativa.

### 17.4 Si se usa el dump completo de PostgreSQL

Transferir `keycloak.dump` mediante un canal cifrado y colocarlo temporalmente
en `backups/`.

Iniciar solamente PostgreSQL:

```bash
docker compose up -d postgres
docker compose ps postgres
```

Restaurar mientras Keycloak permanece detenido:

```bash
docker compose exec -T postgres sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists --no-owner' \
  < backups/keycloak.dump
```

Iniciar Keycloak:

```bash
docker compose up -d keycloak
docker compose ps
docker compose logs --tail=100 keycloak
```

El usuario administrador restaurado conserva su contraseña almacenada en la
base. `KEYCLOAK_ADMIN_PASSWORD` sólo sirve para crear el administrador de
arranque cuando aún no existe.

Antes de restaurar sobre una instalación con información importante, crear y
verificar un respaldo independiente.

### 17.5 Preparar el frontend

```bash
cd frontend
npm ci
npm run lint
npm run build
npm run dev
```

Abrir:

```text
http://localhost:5173/
```

## 18. Acceso desde otra ubicación o red

Para una instalación accesible desde otras computadoras no usar comodines ni
considerar equivalentes `localhost`, IP y DNS.

Ejemplo conceptual:

```text
Frontend:
https://sig-lab.example.edu

Keycloak:
https://auth-lab.example.edu
```

Será necesario:

1. Configurar DNS.
2. Instalar TLS válido.
3. Colocar Keycloak detrás de un proxy inverso.
4. Ajustar `KC_HOSTNAME`.
5. Configurar correctamente los headers de proxy.
6. Cambiar `VITE_KEYCLOAK_URL`.
7. Cambiar Root URL y Home URL.
8. Cambiar Valid redirect URIs.
9. Cambiar Valid post logout redirect URIs.
10. Cambiar Web Origins.
11. Mantener PostgreSQL sin publicar.
12. Restringir la consola administrativa.

Ejemplo de cliente:

```text
Root URL:
https://sig-lab.example.edu

Valid redirect URIs:
https://sig-lab.example.edu/*

Valid post logout redirect URIs:
https://sig-lab.example.edu/*

Web origins:
https://sig-lab.example.edu
```

No usar:

```text
*
http://*
https://*
```

La publicación remota corresponde a una fase posterior de seguridad y no debe
improvisarse con el servidor HTTP local actual.

## 19. Problemas frecuentes

### `Invalid parameter: redirect_uri`

Comprobar que el navegador usa exactamente:

```text
http://localhost:5173/
```

y que Keycloak permite:

```text
http://localhost:5173/*
```

### Bucle continuo hacia el login

Revisar:

- Realm `uoit`.
- Client ID `sig-uoit-frontend`.
- Cookies del navegador.
- Hora del sistema.
- Logs de Keycloak.
- Que el usuario esté habilitado.

### Error de CORS

Comprobar:

```text
Web origins = http://localhost:5173
```

No resolverlo con `*`.

### La pantalla no muestra email

El claim puede faltar si el usuario no tiene email o si el client scope/mappers
no lo incorporan al token. No significa necesariamente que el login falló.

### No aparecen client roles

El usuario debe tener roles del cliente y dichos roles deben estar dentro del
scope permitido. Los realm roles y client roles se guardan en claims distintos.

### Keycloak no importa el JSON

Comprobar:

- Nombre `uoit-realm.json`.
- Extensión `.json`.
- Ubicación `realm-import/`.
- Que el realm no exista ya.
- Logs de arranque.

## 20. Próximas fases

Orden recomendado:

1. Completar login, renovación y logout en el navegador.
2. Crear realm roles y client roles de laboratorio.
3. Asignar roles al usuario.
4. Comprobar `realm_access` y `resource_access`.
5. Crear `sig-uoit-api`.
6. Implementar FastAPI y validación JWT.
7. Diferenciar respuestas HTTP `401` y `403`.
8. Crear `sig-uoit-agent`.
9. Probar Client Credentials Flow.
10. Incorporar MFA, eventos, backups, TLS y proxy inverso.

No avanzar a FastAPI hasta confirmar correctamente el flujo del navegador.

## 21. Referencias oficiales

- [Importación y exportación de realms](https://www.keycloak.org/server/importExport)
- [Keycloak en contenedores](https://www.keycloak.org/server/containers)
- [Adaptador JavaScript de Keycloak](https://www.keycloak.org/securing-apps/javascript-adapter)
- [Guía de administración](https://www.keycloak.org/docs/latest/server_admin/)
