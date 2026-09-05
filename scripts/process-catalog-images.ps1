$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$productsPath = Join-Path $root "data\products.json"
$productOutput = Join-Path $root "public\assets\edited\products"
$catalogOutput = Join-Path $root "public\assets\edited\catalog"

New-Item -ItemType Directory -Force -Path $productOutput | Out-Null
New-Item -ItemType Directory -Force -Path $catalogOutput | Out-Null

function Get-RoundedPath {
  param(
    [System.Drawing.RectangleF] $Rect,
    [float] $Radius
  )

  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $diameter = $Radius * 2
  $arc = New-Object System.Drawing.RectangleF($Rect.X, $Rect.Y, $diameter, $diameter)
  $path.AddArc($arc, 180, 90)
  $arc.X = $Rect.Right - $diameter
  $path.AddArc($arc, 270, 90)
  $arc.Y = $Rect.Bottom - $diameter
  $path.AddArc($arc, 0, 90)
  $arc.X = $Rect.X
  $path.AddArc($arc, 90, 90)
  $path.CloseFigure()
  return $path
}

function Draw-ImageOpacity {
  param(
    [System.Drawing.Graphics] $Graphics,
    [System.Drawing.Image] $Image,
    [System.Drawing.Rectangle] $Destination,
    [float] $Opacity
  )

  $matrix = New-Object System.Drawing.Imaging.ColorMatrix
  $matrix.Matrix00 = 1
  $matrix.Matrix11 = 1
  $matrix.Matrix22 = 1
  $matrix.Matrix33 = $Opacity
  $matrix.Matrix44 = 1
  $attributes = New-Object System.Drawing.Imaging.ImageAttributes
  $attributes.SetColorMatrix(
    $matrix,
    [System.Drawing.Imaging.ColorMatrixFlag]::Default,
    [System.Drawing.Imaging.ColorAdjustType]::Bitmap
  )
  $Graphics.DrawImage(
    $Image,
    $Destination,
    0,
    0,
    $Image.Width,
    $Image.Height,
    [System.Drawing.GraphicsUnit]::Pixel,
    $attributes
  )
  $attributes.Dispose()
}

function Save-Jpeg {
  param(
    [System.Drawing.Bitmap] $Bitmap,
    [string] $Path,
    [long] $Quality = 92
  )

  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq "image/jpeg" } |
    Select-Object -First 1
  $qualityEncoder = [System.Drawing.Imaging.Encoder]::Quality
  $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($qualityEncoder, $Quality)
  $Bitmap.Save($Path, $codec, $encoderParams)
  $encoderParams.Dispose()
}

function Resolve-SourceImage {
  param([string] $RelativePath)

  $normalized = $RelativePath -replace "/", "\"
  $candidate = Join-Path $root $normalized
  if (([System.IO.Path]::GetExtension($candidate)).ToLowerInvariant() -ne ".webp" -and (Test-Path -LiteralPath $candidate)) {
    return (Resolve-Path -LiteralPath $candidate).Path
  }

  $withoutExt = [System.IO.Path]::Combine(
    [System.IO.Path]::GetDirectoryName($candidate),
    [System.IO.Path]::GetFileNameWithoutExtension($candidate)
  )
  foreach ($extension in @(".png", ".jpg", ".jpeg")) {
    $fallback = "$withoutExt$extension"
    if (Test-Path -LiteralPath $fallback) {
      return (Resolve-Path -LiteralPath $fallback).Path
    }
  }

  throw "No se encontro imagen fuente para $RelativePath"
}

function New-EditorialImage {
  param(
    [string] $SourcePath,
    [string] $OutputPath,
    [int] $CanvasSize = 1200
  )

  $source = [System.Drawing.Image]::FromFile($SourcePath)
  try {
    $bitmap = New-Object System.Drawing.Bitmap($CanvasSize, $CanvasSize)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

      $canvas = New-Object System.Drawing.RectangleF(0, 0, $CanvasSize, $CanvasSize)
      $background = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $canvas,
        [System.Drawing.Color]::FromArgb(255, 253, 249),
        [System.Drawing.Color]::FromArgb(245, 238, 232),
        35
      )
      $graphics.FillRectangle($background, $canvas)
      $background.Dispose()

      $coverScale = [Math]::Max($CanvasSize / $source.Width, $CanvasSize / $source.Height)
      $coverWidth = $source.Width * $coverScale
      $coverHeight = $source.Height * $coverScale
      $coverRect = New-Object System.Drawing.Rectangle(
        [int](($CanvasSize - $coverWidth) / 2),
        [int](($CanvasSize - $coverHeight) / 2),
        [int]$coverWidth,
        [int]$coverHeight
      )
      Draw-ImageOpacity -Graphics $graphics -Image $source -Destination $coverRect -Opacity 0.12

      $veil = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 255, 253, 249))
      $graphics.FillRectangle($veil, $canvas)
      $veil.Dispose()

      foreach ($shadow in @(
        @{ Offset = 42; Alpha = 18 },
        @{ Offset = 24; Alpha = 20 },
        @{ Offset = 12; Alpha = 16 }
      )) {
        $rect = New-Object System.Drawing.RectangleF(
          (96 + $shadow.Offset / 3),
          (96 + $shadow.Offset / 3),
          ($CanvasSize - 192),
          ($CanvasSize - 192)
        )
        $path = Get-RoundedPath -Rect $rect -Radius 42
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb($shadow.Alpha, 61, 29, 44))
        $graphics.FillPath($brush, $path)
        $brush.Dispose()
        $path.Dispose()
      }

      $matRect = New-Object System.Drawing.RectangleF(86, 82, ($CanvasSize - 172), ($CanvasSize - 172))
      $matPath = Get-RoundedPath -Rect $matRect -Radius 42
      $matBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(245, 255, 253, 249))
      $graphics.FillPath($matBrush, $matPath)
      $matBrush.Dispose()
      $matPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(34, 145, 51, 77), 2)
      $graphics.DrawPath($matPen, $matPath)
      $matPen.Dispose()
      $matPath.Dispose()

      $maxWidth = $CanvasSize - 250
      $maxHeight = $CanvasSize - 250
      $containScale = [Math]::Min($maxWidth / $source.Width, $maxHeight / $source.Height)
      $drawWidth = $source.Width * $containScale
      $drawHeight = $source.Height * $containScale
      $drawRect = New-Object System.Drawing.Rectangle(
        [int](($CanvasSize - $drawWidth) / 2),
        [int](($CanvasSize - $drawHeight) / 2),
        [int]$drawWidth,
        [int]$drawHeight
      )
      $graphics.DrawImage($source, $drawRect)

      $topLight = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $canvas,
        [System.Drawing.Color]::FromArgb(48, 255, 255, 255),
        [System.Drawing.Color]::FromArgb(0, 255, 255, 255),
        90
      )
      $graphics.FillRectangle($topLight, $canvas)
      $topLight.Dispose()
    } finally {
      $graphics.Dispose()
    }

    Save-Jpeg -Bitmap $bitmap -Path $OutputPath
    $bitmap.Dispose()
  } finally {
    $source.Dispose()
  }
}

$products = Get-Content -LiteralPath $productsPath -Raw | ConvertFrom-Json
$processed = 0

foreach ($product in $products) {
  $sourcePath = Resolve-SourceImage -RelativePath $product.image
  $outputPath = Join-Path $productOutput "$($product.id).jpg"
  New-EditorialImage -SourcePath $sourcePath -OutputPath $outputPath
  $processed++
}

foreach ($image in Get-ChildItem -LiteralPath (Join-Path $root "public\assets\catalog") -File -Include *.jpg,*.jpeg,*.png) {
  $outputPath = Join-Path $catalogOutput "$($image.BaseName).jpg"
  New-EditorialImage -SourcePath $image.FullName -OutputPath $outputPath
  $processed++
}

Write-Output "processed $processed images"
