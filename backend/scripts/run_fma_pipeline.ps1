# Ultraviolet FMA pipeline - wait for download, extract, CLAP-embed all tracks.
$ErrorActionPreference = "Stop"
$zip = "D:\ultraviolet-data\fma\fma_small.zip"
$backend = "D:\projects\ultraviolet\backend"
$targetGb = 6.5

Write-Host '[fma-pipeline] Waiting for fma_small.zip download...'

while ($true) {
    if (-not (Test-Path $zip)) { Start-Sleep -Seconds 10; continue }
    $s1 = (Get-Item $zip).Length
    Start-Sleep -Seconds 15
    $s2 = (Get-Item $zip).Length
    $gb = $s2 / 1GB
    Write-Host "[fma-pipeline] $([math]::Round($gb, 2)) GB"
    if ($gb -ge $targetGb -and $s1 -eq $s2) { break }
    if ($gb -ge 7.0) { break }
}

Write-Host '[fma-pipeline] Download complete. Extracting...'
Set-Location $backend
$env:PYTHONPATH = '.'
& .\.venv\Scripts\python.exe scripts/build_fma_catalog.py --extract-only

Write-Host '[fma-pipeline] Starting CLAP embeddings...'
& .\.venv\Scripts\python.exe scripts/build_fma_catalog.py

Write-Host '[fma-pipeline] DONE.'
