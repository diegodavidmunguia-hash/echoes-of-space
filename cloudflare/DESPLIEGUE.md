# Echoes of Space · Publicar en Cloudflare

El sitio corre igual que en ChatGPT Sites: el mismo código, la misma base de datos (D1) y las mismas migraciones. Lo único que cambia es el inicio de sesión, que ahora usa **Google** o **GitHub** en lugar de ChatGPT. Leer y descargar relatos sigue abierto sin cuenta.

Todo cabe en el plan gratuito de Cloudflare. No necesitas tarjeta, porque los archivos se guardan en Workers KV y no en R2.

## 1. Publicar (unos 10 minutos)

1. Crea una cuenta gratis en https://dash.cloudflare.com/sign-up.
2. Instala Node.js LTS desde https://nodejs.org si `node -v` no responde en PowerShell.
3. Abre PowerShell en la carpeta del proyecto y ejecuta:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\cloudflare\desplegar.ps1
   ```

   El script hace lo siguiente:
   - Te pide iniciar sesión en Cloudflare (se abre el navegador)
   - Crea la base de datos y el almacén de archivos
   - Te pide el correo de moderación
   - Aplica las migraciones y genera la clave de sesión
   - Publica el sitio

   Al terminar muestra la URL, del tipo `https://echoes-of-space.TU-SUBDOMINIO.workers.dev`.

El sitio ya funciona para leer. Para publicar relatos falta activar el inicio de sesión (paso 2).

Cuando cambies el código, vuelve a ejecutar el mismo script: solo compila y publica.

## 2. Inicio de sesión

**Usuario y contraseña** funciona sin configurar nada: en la pantalla de inicio de sesión aparece "Crea una aquí". Las contraseñas se guardan cifradas con PBKDF2-SHA256 y sal, nunca en texto. No hay recuperación de contraseña porque no se pide correo. Las cuentas de usuario y contraseña nunca pueden ser moderadoras: la moderación solo se da por GitHub o Google con el correo de `ATLAS_MODERATOR_EMAIL`.

Además puedes activar GitHub o Google:

Configura uno o los dos proveedores. Los que tengan sus claves aparecen como botones en la página de inicio de sesión.

### Opción A · GitHub (la más rápida, 2 minutos)
1. Ve a https://github.com/settings/developers, luego **OAuth Apps** y **New OAuth App**.
2. Llena los campos:
   - **Homepage URL:** tu URL de workers.dev
   - **Authorization callback URL:** `https://TU-URL.workers.dev/auth/github/callback`
3. Crea la app, copia el **Client ID** y genera un **Client secret**.
4. En PowerShell, dentro de la carpeta del proyecto, ejecuta:
   ```powershell
   npx wrangler@4 secret put GITHUB_CLIENT_ID
   npx wrangler@4 secret put GITHUB_CLIENT_SECRET
   ```
   Pega cada valor cuando te lo pida.

### Opción B · Google (la más universal para la comunidad)
1. Entra a https://console.cloud.google.com/ y crea un proyecto.
2. Ve a **APIs y servicios → Pantalla de consentimiento de OAuth**. Elige tipo **Externo**, pon el nombre "Echoes of Space" y tu correo. En **Público**, pulsa **Publicar app**: si la dejas en modo de prueba, solo podrán entrar los correos que agregues a mano.
3. Ve a **Credenciales → Crear credenciales → ID de cliente de OAuth** y elige **Aplicación web**.
   - **URI de redireccionamiento autorizado:** `https://TU-URL.workers.dev/auth/google/callback`
4. Copia el ID y el secreto, y ejecuta:
   ```powershell
   npx wrangler@4 secret put GOOGLE_CLIENT_ID
   npx wrangler@4 secret put GOOGLE_CLIENT_SECRET
   ```

Los secretos se aplican al momento, sin volver a publicar.

## 3. Moderación

El correo que diste en el script (`ATLAS_MODERATOR_EMAIL` en `wrangler.toml`) es el de la cuenta administradora. Inicia sesión con ese correo de Google o GitHub y verás **Mi cuenta → Moderación**. Para cambiarlo, edita `wrangler.toml` y vuelve a ejecutar el script.

## Notas
- **Seguridad:** `cloudflare/entry.js` elimina cualquier encabezado de identidad que llegue de fuera. Solo pone la identidad a partir de una cookie de sesión firmada con `SESSION_SECRET`, así que nadie puede hacerse pasar por otro usuario.
- **Relatos anteriores:** los de la URL de ChatGPT Sites no se migran. El catálogo estaba vacío, así que no se pierde nada.
- **Límites del plan gratuito de KV:** 1,000 escrituras de archivos al día y 1 GB de almacenamiento. Sobra para la competencia.
- **Prueba local:**
  1. Crea un archivo `.dev.vars` con `SESSION_SECRET="cualquier-texto-largo"` y `ALLOW_DEV_LOGIN="1"`.
  2. Ejecuta `npx wrangler@4 d1 migrations apply echoes-of-space --local`.
  3. Ejecuta `npx wrangler@4 dev`.

  El botón "Dev login" solo existe en localhost.
