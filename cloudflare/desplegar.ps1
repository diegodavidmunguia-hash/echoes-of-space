# Echoes of Space · despliegue en Cloudflare (Windows PowerShell)
# Uso: abre PowerShell en la carpeta del proyecto y ejecuta:
#   powershell -ExecutionPolicy Bypass -File .\cloudflare\desplegar.ps1
# La primera vez crea la base de datos (D1), el almacen de archivos (KV) y la clave de sesion.
# Las siguientes veces solo compila y vuelve a publicar.

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$toml = 'wrangler.toml'
$wrangler = 'npx --yes wrangler@4'

function Run($command) {
  Write-Host "> $command" -ForegroundColor DarkGray
  $output = cmd /c "$command 2>&1"
  $output | ForEach-Object { Write-Host $_ }
  if ($LASTEXITCODE -ne 0) { throw "Fallo: $command" }
  return ($output -join "`n")
}

Write-Host "`n1/6 Revisando Node.js..." -ForegroundColor Cyan
try { node -v | Out-Null } catch { throw 'Instala Node.js (version LTS) desde https://nodejs.org y vuelve a ejecutar este script.' }

Write-Host "`n2/6 Iniciando sesion en Cloudflare (se abre el navegador)..." -ForegroundColor Cyan
$who = cmd /c "$wrangler whoami 2>&1"
if (($who -join "`n") -notmatch 'associated with the email') {
  Write-Host 'Se abrira tu navegador: inicia sesion en Cloudflare y pulsa Allow.' -ForegroundColor Yellow
  cmd /c "$wrangler login"
  if ($LASTEXITCODE -ne 0) { throw 'No se completo el inicio de sesion en Cloudflare.' }
}

$config = Get-Content $toml -Raw
if ($config -match 'PEGA_AQUI_EL_ID_DE_D1') {
  Write-Host "`n3/6 Creando la base de datos D1..." -ForegroundColor Cyan
  $out = Run "$wrangler d1 create echoes-of-space"
  if ($out -notmatch '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') { throw 'No encontre el ID de D1 en la salida de arriba. Copialo a wrangler.toml manualmente.' }
  $config = $config.Replace('PEGA_AQUI_EL_ID_DE_D1', $Matches[1])
  Set-Content $toml $config -NoNewline
} else { Write-Host "`n3/6 D1 ya configurada." -ForegroundColor Cyan }

if ($config -match 'PEGA_AQUI_EL_ID_DE_KV') {
  Write-Host "`n4/6 Creando el almacen de archivos KV..." -ForegroundColor Cyan
  $out = Run "$wrangler kv namespace create FILES"
  if ($out -notmatch '([0-9a-f]{32})') { throw 'No encontre el ID de KV en la salida de arriba. Copialo a wrangler.toml manualmente.' }
  $config = $config.Replace('PEGA_AQUI_EL_ID_DE_KV', $Matches[1])
  Set-Content $toml $config -NoNewline
} else { Write-Host "`n4/6 KV ya configurado." -ForegroundColor Cyan }

if ($config -match 'PEGA_AQUI_TU_CORREO') {
  $mail = Read-Host 'Correo de la cuenta moderadora (el que usaras para iniciar sesion)'
  $config = $config.Replace('PEGA_AQUI_TU_CORREO', $mail.Trim())
  Set-Content $toml $config -NoNewline
}

Write-Host "`n5/6 Compilando y preparando la base de datos..." -ForegroundColor Cyan
Run 'node build.mjs' | Out-Null
Run "echo y| $wrangler d1 migrations apply echoes-of-space --remote" | Out-Null

$secrets = cmd /c "$wrangler secret list 2>&1"
if (($secrets -join "`n") -notmatch 'SESSION_SECRET') {
  $bytes = New-Object byte[] 32
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $secret = [Convert]::ToBase64String($bytes)
  $secret | cmd /c "$wrangler secret put SESSION_SECRET 2>&1" | Out-Null
  Write-Host 'Clave de sesion creada.'
}

Write-Host "`n6/6 Publicando..." -ForegroundColor Cyan
Write-Host "Si Cloudflare pregunta por un subdominio workers.dev, escribe un nombre corto (por ejemplo tu nombre) y Enter." -ForegroundColor Yellow
cmd /c "$wrangler deploy"
if ($LASTEXITCODE -ne 0) { throw 'No se pudo publicar. Manda una captura de esta ventana.' }
Write-Host "`nListo. Tu sitio es la direccion https://...workers.dev que aparece arriba." -ForegroundColor Green
Write-Host "Para activar el inicio de sesion sigue el paso 2 de cloudflare\DESPLIEGUE.md." -ForegroundColor Green
