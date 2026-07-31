import { useCallback, useEffect, useState } from 'react'
import type { KeycloakTokenParsed } from 'keycloak-js'
import keycloak from './keycloak.ts'
import './App.css'

// keycloak-js conoce los claims estándar, pero extendemos el tipo para describir
// los claims que Keycloak añade por defecto para usuarios y roles.
type TokenDetails = KeycloakTokenParsed & {
  preferred_username?: string
  email?: string
  realm_access?: {
    roles?: string[]
  }
  resource_access?: Record<string, { roles?: string[] }>
}

// iat y exp son NumericDate: segundos desde 1970, no milisegundos de JavaScript.
const formatTime = (seconds?: number) => {
  if (!seconds) return 'No disponible'
  return new Date(seconds * 1000).toLocaleString()
}

function App() {
  const [lastTokenCheck, setLastTokenCheck] = useState(() => new Date())
  const [refreshMessage, setRefreshMessage] = useState(
    'La renovación automática está activa.',
  )

  // tokenParsed es la representación decodificada del access token. Se usa
  // para mostrar claims concretos, pero nunca se imprime el JWT completo.
  const token = keycloak.tokenParsed as TokenDetails | undefined

  // Los realm roles son generales dentro de "uoit". Los client roles están
  // aislados bajo el Client ID que los define.
  const realmRoles = token?.realm_access?.roles ?? []
  const clientRoles =
    token?.resource_access?.[import.meta.env.VITE_KEYCLOAK_CLIENT_ID]?.roles ?? []

  // El estándar permite que aud sea un texto o una lista de audiencias.
  const audience = Array.isArray(token?.aud)
    ? token.aud.join(', ')
    : (token?.aud ?? 'No disponible')

  const refreshAccessToken = useCallback(async (manual = false) => {
    try {
      // Renueva únicamente cuando al access token le quedan menos de 60
      // segundos. El método devuelve true si realmente obtuvo uno nuevo.
      const refreshed = await keycloak.updateToken(60)

      // Cambiar estado obliga a React a leer nuevamente tokenParsed, que puede
      // haber sido sustituido por keycloak-js durante la renovación.
      setLastTokenCheck(new Date())
      setRefreshMessage(
        refreshed
          ? `Token renovado: ${new Date().toLocaleTimeString()}`
          : manual
            ? 'El token todavía era válido; no fue necesario renovarlo.'
            : 'La sesión continúa vigente.',
      )
    } catch (error) {
      // Si el refresh token o la sesión SSO ya no sirven, se solicita una nueva
      // autenticación en vez de seguir trabajando con un access token vencido.
      console.error('No se pudo renovar el access token', error)
      setRefreshMessage('La sesión expiró. Redirigiendo al inicio de sesión…')
      await keycloak.login()
    }
  }, [])

  useEffect(() => {
    // Comprobación preventiva: cada 30 segundos pregunta si el token está cerca
    // de expirar. updateToken(60) evita renovaciones innecesarias.
    const intervalId = window.setInterval(() => {
      void refreshAccessToken()
    }, 30_000)

    // Respaldo reactivo: si se alcanza exp antes de la siguiente comprobación,
    // keycloak-js dispara este evento.
    keycloak.onTokenExpired = () => {
      void refreshAccessToken()
    }

    // React ejecuta la limpieza al desmontar el componente. Esto evita
    // intervalos duplicados y callbacks que sobrevivan a la pantalla.
    return () => {
      window.clearInterval(intervalId)
      keycloak.onTokenExpired = undefined
    }
  }, [refreshAccessToken])

  const logout = async () => {
    // Keycloak invalida/cierra la sesión y sólo permite regresar a una URI
    // registrada en "Valid post logout redirect URIs".
    await keycloak.logout({
      redirectUri: `${window.location.origin}/`,
    })
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <span className="eyebrow">Laboratorio IAM · UOIT</span>
          <h1>Sesión autenticada con Keycloak</h1>
          <p>
            React inició únicamente después de completar OpenID Connect con
            Authorization Code y PKCE S256.
          </p>
        </div>
        <span className="status">Autenticado</span>
      </header>

      <section className="card">
        <div className="section-heading">
          <div>
            <h2>Identidad</h2>
            <p>Claims seleccionados del token; nunca mostramos el JWT completo.</p>
          </div>
          <button className="secondary" onClick={() => void refreshAccessToken(true)}>
            Renovar token
          </button>
        </div>

        <dl className="claims">
          <div>
            <dt>Usuario</dt>
            <dd>{token?.preferred_username ?? 'No disponible'}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{token?.email ?? 'No disponible'}</dd>
          </div>
          <div>
            <dt>Issuer</dt>
            <dd>{token?.iss ?? 'No disponible'}</dd>
          </div>
          <div>
            <dt>Audience</dt>
            <dd>{audience}</dd>
          </div>
          <div>
            <dt>Emitido</dt>
            <dd>{formatTime(token?.iat)}</dd>
          </div>
          <div>
            <dt>Expira</dt>
            <dd>{formatTime(token?.exp)}</dd>
          </div>
        </dl>

        <p className="refresh-status">
          {refreshMessage} Última comprobación:{' '}
          {lastTokenCheck.toLocaleTimeString()}.
        </p>
      </section>

      <section className="role-grid">
        <article className="card">
          <h2>Realm roles</h2>
          <p>Roles generales del realm almacenados en `realm_access.roles`.</p>
          <div className="tags">
            {realmRoles.length > 0 ? (
              realmRoles.map((role) => <span key={role}>{role}</span>)
            ) : (
              <span className="empty">Sin roles</span>
            )}
          </div>
        </article>

        <article className="card">
          <h2>Client roles</h2>
          <p>
            Roles propios de `sig-uoit-frontend` almacenados en
            `resource_access`.
          </p>
          <div className="tags">
            {clientRoles.length > 0 ? (
              clientRoles.map((role) => <span key={role}>{role}</span>)
            ) : (
              <span className="empty">Sin roles</span>
            )}
          </div>
        </article>
      </section>

      <section className="card security-note">
        <div>
          <h2>Decisiones de seguridad</h2>
          <p>
            Cliente público, sin client secret, PKCE S256 y tokens mantenidos
            solamente en memoria.
          </p>
        </div>
        <button className="danger" onClick={() => void logout()}>
          Cerrar sesión
        </button>
      </section>
    </main>
  )
}

export default App
