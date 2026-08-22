# The Python implementation is the canonical asset pipeline. Keep this
# wrapper so Windows users do not accidentally run the previous green-screen
# cropper, which would also overwrite the approved dialogue avatar.
$pythonCandidates = @(
    (Get-Command python -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1),
    (Get-Command py -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1),
    'C:\Users\35636\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

if (-not $pythonCandidates) {
    throw '未找到 Python。请使用 scripts\prepare_ch03_dong_assets.py 运行董云庭人物素材处理。'
}

$python = $pythonCandidates | Select-Object -First 1
& $python (Join-Path $PSScriptRoot 'prepare_ch03_dong_assets.py')
if ($LASTEXITCODE -ne 0) {
    throw "董云庭人物素材处理失败，退出码：$LASTEXITCODE"
}
