# Upgrade PyTorch to cu128 for RTX 50-series (sm_120). Downloads to D:\ultraviolet-data\torch
$ErrorActionPreference = "Stop"
$env:TORCH_HOME = "D:\ultraviolet-data\torch"
$pip = "D:\projects\ultraviolet\backend\.venv\Scripts\pip.exe"
$py = "D:\projects\ultraviolet\backend\.venv\Scripts\python.exe"
$log = "D:\ultraviolet-data\upgrade-pytorch.log"

function Log($m) { $l = "[$(Get-Date -Format 'HH:mm:ss')] $m"; Add-Content $log $l; Write-Output $l }

Log "Upgrading torch/torchaudio to cu128 (~2.5 GB to D: TORCH_HOME)..."
& $pip install --upgrade torch torchaudio --index-url https://download.pytorch.org/whl/cu128
Log "Verify GPU:"
& $py -c "import torch; print(torch.__version__, torch.cuda.get_device_name(0)); torch.zeros(1,device='cuda'); print('cuda ok')"
Log "Done"
