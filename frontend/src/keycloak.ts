import Keycloak from 'keycloak-js'

// Vite sustituye estas variables durante el desarrollo o la compilación.
// Todo valor VITE_* llega al navegador: aquí sólo debe existir configuración
// pública y nunca contraseñas, tokens o un client_secret.
const {
  VITE_KEYCLOAK_URL,
  VITE_KEYCLOAK_REALM,
  VITE_KEYCLOAK_CLIENT_ID,
} = import.meta.env

// Fallamos al iniciar si la configuración está incompleta. Es preferible un
// error explícito a enviar al usuario hacia un realm o cliente incorrecto.
if (
  !VITE_KEYCLOAK_URL ||
  !VITE_KEYCLOAK_REALM ||
  !VITE_KEYCLOAK_CLIENT_ID
) {
  throw new Error(
    'Faltan VITE_KEYCLOAK_URL, VITE_KEYCLOAK_REALM o VITE_KEYCLOAK_CLIENT_ID',
  )
}

// Esta instancia es única para toda la aplicación. keycloak-js mantiene aquí,
// sólo en memoria, el estado de autenticación y los tokens de la sesión.
const keycloak = new Keycloak({
  url: VITE_KEYCLOAK_URL,
  realm: VITE_KEYCLOAK_REALM,
  clientId: VITE_KEYCLOAK_CLIENT_ID,
})

export default keycloak
