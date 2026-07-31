import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import keycloak from './keycloak.ts'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('No se encontró el elemento #root')
}

const root = createRoot(rootElement)

try {
  // La autenticación termina antes de renderizar <App />. De esta manera el
  // contenido protegido nunca se muestra sin haber comprobado la sesión.
  await keycloak.init({
    // Si no existe una sesión, redirige al formulario de login de Keycloak.
    onLoad: 'login-required',

    // "standard" representa Authorization Code Flow. Keycloak entrega primero
    // un código temporal; keycloak-js lo intercambia después por los tokens.
    flow: 'standard',

    // PKCE vincula el código temporal con una prueba creada por este navegador.
    // El servidor ya está configurado para exigir el método seguro S256.
    pkceMethod: 'S256',

    // Desactivado para simplificar el laboratorio y evitar restricciones de
    // cookies de terceros. La renovación se controla desde App.tsx.
    checkLoginIframe: false,

    // Debe coincidir con las redirect URIs registradas en Keycloak.
    redirectUri: `${window.location.origin}/`,
  })

  // StrictMode ayuda a detectar efectos secundarios inseguros en desarrollo;
  // no provoca una segunda inicialización porque init() está fuera de React.
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  // No se imprimen tokens ni credenciales. El detalle técnico queda disponible
  // en la consola y la interfaz muestra un mensaje seguro y comprensible.
  console.error('No se pudo inicializar Keycloak', error)

  root.render(
    <main className="startup-error">
      <h1>No se pudo iniciar la autenticación</h1>
      <p>Comprueba que Keycloak esté disponible y revisa la consola.</p>
    </main>,
  )
}
