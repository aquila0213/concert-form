$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backupFile = Join-Path $repoRoot 'backups/2026-08-10-current-state/index.html'
$targetFile = Join-Path $repoRoot 'index.html'

if (-not (Test-Path $backupFile)) {
    Write-Error "バックアップファイルが見つかりません: $backupFile"
    exit 1
}

Copy-Item $backupFile $targetFile -Force
Write-Host "復元しました: $targetFile"
Write-Host "元の状態: $backupFile"
