Add-Type -AssemblyName System.Drawing

function New-Icon($size, $outPath) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)

  # Sfondo verde #6DAB3C
  $g.Clear([System.Drawing.Color]::FromArgb(255, 109, 171, 60))

  # Carica logo elefante e rende bianco trasparente
  $src = [System.Drawing.Bitmap]::FromFile("$PSScriptRoot\public\VeniceAI_3tJwOMd.png")
  $src.MakeTransparent([System.Drawing.Color]::White)

  # Padding negativo: zooma sull'elefante ritagliando lo spazio bianco del PNG sorgente
  $pad = [int]($size * -0.20)
  $inner = $size - ($pad * 2)
  $destRect = New-Object System.Drawing.Rectangle($pad, $pad, $inner, $inner)

  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.DrawImage($src, $destRect)

  $g.Dispose()
  $src.Dispose()
  $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

New-Icon 192 "$PSScriptRoot\public\icon-192.png"
New-Icon 512 "$PSScriptRoot\public\icon-512.png"
Write-Host "Icons created OK"
