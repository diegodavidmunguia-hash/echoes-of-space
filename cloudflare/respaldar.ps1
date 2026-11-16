# Echoes of Space - respaldo de la base de datos y de los archivos (Windows PowerShell)
# Uso: doble clic en RESPALDAR.bat, en la carpeta del proyecto.
# Crea respaldos\AAAA-MM-DD_HHMM con:
#   base-de-datos.sql  relatos, cuentas, comentarios, ecos, biblioteca, reportes
#   archivos\          archivo de cada relato (stories__ID) y cada portada (covers__ID)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$wrangler = 'npx --yes wrangler@4'
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$folder = Join-Path 'respaldos' $stamp
$files = Join-Path $folder 'archivos'
New-Item -ItemType Directory -Force -Path $files | Out-Null

Write-Host "`n1/3 Revisando la sesion de Cloudflare..." -ForegroundColor Cyan
try { node -v | Out-Null } catch { throw 'Instala Node.js (version LTS) desde https://nodejs.org y vuelve a ejecutar este archivo.' }
$who = cmd /c "$wrangler whoami 2>&1"
if (($who -join "`n") -notmatch 'associated with the email') {
  Write-Host 'Se abrira tu navegador: inicia sesion en Cloudflare y pulsa Allow.' -ForegroundColor Yellow
  cmd /c "$wrangler login"
  if ($LASTEXITCODE -ne 0) { throw 'No se completo el inicio de sesion en Cloudflare.' }
}

Write-Host "`n2/3 Copiando la base de datos..." -ForegroundColor Cyan
cmd /c "$wrangler d1 export echoes-of-space --remote --output `"$folder\base-de-datos.sql`""
if ($LASTEXITCODE -ne 0) { throw 'No se pudo copiar la base de datos. Manda una captura de esta ventana.' }

Write-Host "`n3/3 Copiando los archivos de relatos y portadas..." -ForegroundColor Cyan
$list = cmd /c "$wrangler kv key list --binding FILES --remote 2>nul"
if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer la lista de archivos. Manda una captura de esta ventana.' }
$parsed = ($list -join "`n") | ConvertFrom-Json
$keys = @($parsed | ForEach-Object { $_ })
$missing = 0
for ($index = 0; $index -lt $keys.Count; $index++) {
  $key = $keys[$index].name
  $target = Join-Path $files ($key -replace '/', '__')
  Write-Host ("  {0} / {1}  {2}" -f ($index + 1), $keys.Count, $key)
  cmd /c "$wrangler kv key get `"$key`" --binding FILES --remote > `"$target`" 2>nul"
  if ($LASTEXITCODE -ne 0) { $missing++; Write-Host "  No se pudo copiar $key" -ForegroundColor Yellow }
}

Write-Host "`nListo. El respaldo quedo en $folder" -ForegroundColor Green
if ($missing) { Write-Host "$missing archivo(s) no se copiaron; vuelve a ejecutar RESPALDAR.bat." -ForegroundColor Yellow }
