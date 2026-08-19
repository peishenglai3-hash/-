Add-Type -AssemblyName System.Drawing

$sourcePath = (Get-ChildItem -LiteralPath 'D:\美术资产\第3章 美术资产\Chapter3_character' -File | Where-Object { $_.Name -like '董*' } | Select-Object -First 1).FullName
$outDir = Join-Path $PSScriptRoot '..\public\assets\characters\ch03-dong-yunting'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Export-KeyedCrop([System.Drawing.Bitmap] $source, [string] $name, [int] $x, [int] $y, [int] $width, [int] $height) {
    $output = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($output)
    $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, $width, $height), [System.Drawing.Rectangle]::new($x, $y, $width, $height), [System.Drawing.GraphicsUnit]::Pixel)
    $graphics.Dispose()

    for ($py = 0; $py -lt $height; $py++) {
        for ($px = 0; $px -lt $width; $px++) {
            $color = $output.GetPixel($px, $py)
            $greenStrength = $color.G - [Math]::Max($color.R, $color.B)
            if ($color.G -ge 90 -and $greenStrength -ge 45) {
                $output.SetPixel($px, $py, [System.Drawing.Color]::FromArgb(0, $color.R, $color.G, $color.B))
            } elseif ($color.G -ge 80 -and $greenStrength -ge 12) {
                $alpha = [Math]::Max(0, [Math]::Min(255, [int]((45 - $greenStrength) * 255 / 33)))
                $output.SetPixel($px, $py, [System.Drawing.Color]::FromArgb($alpha, $color.R, $color.G, $color.B))
            }
        }
    }

    $output.Save((Join-Path $outDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $output.Dispose()
}

$source = [System.Drawing.Bitmap]::FromFile([string]$sourcePath)
try {
    Export-KeyedCrop $source 'idle.png' 470 195 85 125
    Export-KeyedCrop $source 'avatar.png' 175 20 295 300
} finally {
    $source.Dispose()
}
