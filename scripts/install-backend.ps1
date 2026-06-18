# Ultraviolet backend install — all heavy caches on D:
$ErrorActionPreference = "Stop"
$Log = "D:\ultraviolet-data\install.log"
$Venv = "D:\projects\ultraviolet\backend\.venv"
$Backend = "D:\projects\ultraviolet\backend"

$env:TORCH_HOME = "D:\ultraviolet-data\torch"
$env:HF_HOME = "D:\ultraviolet-data\huggingface"
$env:XDG_CACHE_HOME = "D:\ultraviolet-data\cache"
$env:STEM_CACHE_DIR = "D:\ultraviolet-data\stems"

function Log($msg) {
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $msg"
    Add-Content -Path $Log -Value $line
    Write-Output $line
}

New-Item -ItemType Directory -Force -Path (Split-Path $Log) | Out-Null
Log "=== Ultraviolet backend install start ==="
Log 'WARNING: PyTorch CUDA wheel is ~2.5 GB - downloads to D:\ultraviolet-data\torch'

if (-not (Test-Path "$Venv\Scripts\python.exe")) {
    Log "Creating venv..."
    python -m venv $Venv
}

$py = "$Venv\Scripts\python.exe"
$pip = "$Venv\Scripts\pip.exe"

Log "Upgrading pip..."
& $py -m pip install --upgrade pip

Log 'Installing PyTorch + torchaudio CUDA 12.4 - this is the slow step, ~2.5 GB...'
& $pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu124

Log "Installing ultraviolet backend [audio,demucs,dev]..."
& $pip install -e "$Backend[audio,demucs,dev]"

Log "Verifying imports..."
& $py -c "import torch, demucs, librosa; print('torch', torch.__version__, 'cuda', torch.cuda.is_available()); print('demucs', demucs.__version__)"

Log "Running pytest..."
Push-Location $Backend
& $py -m pytest -q
Pop-Location

Log "=== INSTALL COMPLETE ==="
