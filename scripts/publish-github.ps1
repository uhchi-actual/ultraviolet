# One-shot publish: create repo (if needed), push main, trigger GitHub Pages.
# Requires: gh auth login (once)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

$repo = "uhchi-actual/ultraviolet"

Write-Host "Checking gh auth..."
gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Run: gh auth login"
  exit 1
}

$repoExists = $false
gh repo view $repo 2>$null
if ($LASTEXITCODE -eq 0) { $repoExists = $true }

if (-not $repoExists) {
  Write-Host "Creating $repo on GitHub..."
  if (git remote get-url origin 2>$null) {
    gh repo create $repo --public --description "Multi-agent music recommendation engine with explainable Tree"
  } else {
    gh repo create $repo --public --source=. --remote=origin --description "Multi-agent music recommendation engine with explainable Tree"
  }
}

if (-not (git remote get-url origin 2>$null)) {
  git remote add origin "https://github.com/$repo.git"
}

git branch -M main
git push -u origin main

Write-Host ""
Write-Host "Pushed. Enable Pages if first time:"
Write-Host "  https://github.com/$repo/settings/pages -> Source: GitHub Actions"
Write-Host "Live demo (after CI): https://uhchi-actual.github.io/ultraviolet/"
