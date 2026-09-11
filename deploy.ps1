# deploy.ps1 - Build, upload, and redeploy the Faiha app to the Hostinger VPS.
# Usage (from PowerShell, in the project folder):  .\deploy.ps1
$ErrorActionPreference = "Stop"

$VPS     = "root@200.97.161.12"
$KEY     = "$env:USERPROFILE\.ssh\faiha_vps"
$PROJ    = "D:\FaihaWebsite\Emergent\Chabir2406"
$TARBALL = "D:\FaihaWebsite\Emergent\faiha-ecom.tar.gz"

Write-Host "==> [1/3] Building clean archive..." -ForegroundColor Cyan
Push-Location $PROJ
tar -czf $TARBALL `
  --exclude="frontend/node_modules" `
  --exclude="backend/.venv" `
  --exclude=".git" `
  --exclude="frontend/build" `
  --exclude="frontend/android" `
  --exclude="frontend/ios" `
  --exclude="*/__pycache__" `
  --exclude="*.pack" `
  --exclude="*.zip" `
  .
Pop-Location
Write-Host ("    archive: {0:N0} KB" -f ((Get-Item $TARBALL).Length/1KB)) -ForegroundColor DarkGray

Write-Host "==> [2/3] Uploading to VPS..." -ForegroundColor Cyan
scp -i $KEY $TARBALL "${VPS}:/root/"

Write-Host "==> [3/3] Extracting + rebuilding containers (this can take a few minutes)..." -ForegroundColor Cyan
ssh -i $KEY $VPS "cd /root && tar -xzf faiha-ecom.tar.gz -C faiha-ecom && cd faiha-ecom && docker compose up -d --build && docker compose ps"

Write-Host "==> Done. Live at http://200.97.161.12" -ForegroundColor Green
