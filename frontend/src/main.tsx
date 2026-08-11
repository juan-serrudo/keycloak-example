// StrictMode activa comprobaciones adicionales de React durante el desarrollo.
// No genera HTML propio ni modifica el comportamiento de producción.
import { StrictMode } from 'react'

// createRoot crea la raíz administrada por React dentro del DOM existente.
import { createRoot } from 'react-dom/client'

// Hoja de estilos global: normalización, variables y estilos compartidos.
import './index.css'

// Componente principal que representa la interfaz una vez autenticada la sesión.
import App from './App.tsx'

// Instancia única de keycloak-js configurada en keycloak.ts. Compartir esta
// instancia permite conservar en memoria el estado y los tokens de la sesión.
import keycloak from './keycloak.ts'

// index.html declara <div id="root"></div>. Aquí recuperamos ese contenedor
// para entregárselo a React. getElementById puede devolver null si el HTML fue
// modificado o la aplicación se carga usando una plantilla incorrecta.
const rootElement = document.getElementById('root')

// "Fail fast": detener el arranque con un mensaje preciso es más seguro que
// continuar y provocar después un error ambiguo dentro de React.
if (!rootElement) {
  throw new Error('No se encontró el elemento #root')
}

// Desde este momento React puede renderizar dentro de #root. La raíz se crea
// antes de inicializar Keycloak para poder mostrar también una pantalla de error
// si el proveedor de identidad no está disponible.
const root = createRoot(rootElement)

try {
  // Este archivo se carga como un módulo ES desde index.html, por eso puede usar
  // await en el nivel superior sin envolver el arranque en otra función.
  //
  // init() comprueba si existe una sesión, procesa el callback de OpenID Connect
  // cuando Keycloak devuelve al usuario y prepara los tokens en memoria. El
  // await impide renderizar <App /> hasta que esa operación haya terminado; así
  // el contenido protegido no aparece antes de verificar la autenticación.
  await keycloak.init({
    // Si no existe una sesión autenticada, el navegador se redirige al formulario
    // de acceso de Keycloak. La alternativa "check-sso" permitiría continuar
    // como usuario anónimo, algo que esta aplicación protegida no necesita.
    onLoad: 'login-required',

    // "standard" selecciona Authorization Code Flow. Keycloak devuelve primero
    // un código de autorización temporal y keycloak-js lo intercambia por tokens;
    // evita exponer los tokens directamente en la URL de redirección.
    flow: 'standard',

    // PKCE crea un verificador secreto temporal dentro del navegador y envía
    // primero sólo su desafío criptográfico. Al intercambiar el código se prueba
    // la posesión del verificador, reduciendo el riesgo de robo del código.
    // S256 indica que el desafío se deriva mediante SHA-256.
    pkceMethod: 'S256',

    // Desactiva el iframe oculto con el que keycloak-js comprueba periódicamente
    // el estado de la sesión SSO. Esto evita depender de cookies de terceros,
    // bloqueadas con frecuencia por navegadores modernos. App.tsx se encarga de
    // renovar el access token y reaccionar cuando vence.
    checkLoginIframe: false,

    // URL a la que Keycloak devuelve el navegador después del login. Se construye
    // con el protocolo, host y puerto actuales para funcionar en localhost y en
    // otros despliegues. El resultado debe estar autorizado exactamente dentro
    // de "Valid redirect URIs" del cliente configurado en Keycloak.
    redirectUri: `${window.location.origin}/`,
  })

  // La inicialización ya terminó: React puede construir la interfaz protegida.
  // StrictMode puede repetir ciertos ciclos y efectos de componentes solamente
  // en desarrollo para detectar problemas. No vuelve a ejecutar init(), porque
  // esa llamada está fuera del árbol de componentes.
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  // El bloque captura errores de inicialización: servidor inaccesible, realm o
  // cliente incorrectos, redirect URI no permitida y respuestas OIDC inválidas,
  // entre otros. No se imprimen tokens ni credenciales; el objeto de error queda
  // disponible en la consola para diagnóstico técnico.
  console.error('No se pudo inicializar Keycloak', error)

  // Aunque la autenticación falle, reutilizamos la raíz ya creada para mostrar
  // un mensaje seguro. No se renderiza <App />, de modo que la interfaz protegida
  // continúa inaccesible.
  root.render(
    <main className="startup-error">
      <h1>No se pudo iniciar la autenticación</h1>
      <p>Comprueba que Keycloak esté disponible y revisa la consola.</p>
    </main>,
  )
}
