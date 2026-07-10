Add-Type -AssemblyName System.Drawing

function Save-Icon {
  param([int]$Size, [string]$Path)

  $bmp = New-Object System.Drawing.Bitmap $Size, $Size
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

  $rect = New-Object System.Drawing.Rectangle 0, 0, $Size, $Size
  $start = [System.Drawing.Color]::FromArgb(255, 99, 102, 241)
  $end = [System.Drawing.Color]::FromArgb(255, 139, 92, 246)
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $start, $end, 45.0)
  $graphics.FillRectangle($brush, $rect)

  $white = [System.Drawing.Brushes]::White
  $node = [int]($Size * 0.11)
  $small = [int]($Size * 0.09)

  $graphics.FillEllipse($white, [int]($Size * 0.44), [int]($Size * 0.17), $node, $node)
  $graphics.FillEllipse($white, [int]($Size * 0.30), [int]($Size * 0.33), $small, $small)
  $graphics.FillEllipse($white, [int]($Size * 0.58), [int]($Size * 0.33), $small, $small)
  $graphics.FillEllipse($white, [int]($Size * 0.22), [int]($Size * 0.56), $small, $small)
  $graphics.FillEllipse($white, [int]($Size * 0.40), [int]($Size * 0.56), $small, $small)
  $graphics.FillEllipse($white, [int]($Size * 0.52), [int]($Size * 0.56), $small, $small)
  $graphics.FillEllipse($white, [int]($Size * 0.70), [int]($Size * 0.56), $small, $small)

  $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, [single]($Size * 0.03))
  $graphics.DrawLine($pen, $Size * 0.5, $Size * 0.27, $Size * 0.35, $Size * 0.36)
  $graphics.DrawLine($pen, $Size * 0.5, $Size * 0.27, $Size * 0.63, $Size * 0.36)

  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $graphics.Dispose()
  $bmp.Dispose()
  $brush.Dispose()
  $pen.Dispose()
}

$iconsDir = Join-Path $PSScriptRoot "..\icons"
New-Item -ItemType Directory -Force -Path $iconsDir | Out-Null

Save-Icon -Size 192 -Path (Join-Path $iconsDir "icon-192.png")
Save-Icon -Size 512 -Path (Join-Path $iconsDir "icon-512.png")
Save-Icon -Size 512 -Path (Join-Path $iconsDir "icon-maskable-512.png")

Write-Output "Generated icons in $iconsDir"