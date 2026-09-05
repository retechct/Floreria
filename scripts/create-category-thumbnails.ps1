$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$sourceDir = Join-Path $root "public\assets\edited\products"
$outputDir = Join-Path $root "public\assets\edited\thumbs"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

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

function New-Thumbnail {
  param(
    [string] $SourceName,
    [string] $OutputName,
    [int] $Size = 720
  )

  $sourcePath = Join-Path $sourceDir "$SourceName.jpg"
  if (!(Test-Path -LiteralPath $sourcePath)) {
    throw "No existe $sourcePath"
  }

  $source = [System.Drawing.Image]::FromFile($sourcePath)
  try {
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

      $canvas = New-Object System.Drawing.RectangleF(0, 0, $Size, $Size)
      $background = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $canvas,
        [System.Drawing.Color]::FromArgb(255, 247, 248),
        [System.Drawing.Color]::FromArgb(248, 231, 232),
        35
      )
      $graphics.FillRectangle($background, $canvas)
      $background.Dispose()

      $scale = [Math]::Max($Size / $source.Width, $Size / $source.Height) * 2.08
      $drawWidth = $source.Width * $scale
      $drawHeight = $source.Height * $scale
      $drawRect = New-Object System.Drawing.Rectangle(
        [int](($Size - $drawWidth) / 2),
        [int](($Size - $drawHeight) / 2),
        [int]$drawWidth,
        [int]$drawHeight
      )
      $graphics.DrawImage($source, $drawRect)

      $veil = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $canvas,
        [System.Drawing.Color]::FromArgb(0, 255, 255, 255),
        [System.Drawing.Color]::FromArgb(34, 255, 253, 249),
        90
      )
      $graphics.FillRectangle($veil, $canvas)
      $veil.Dispose()
    } finally {
      $graphics.Dispose()
    }

    Save-Jpeg -Bitmap $bitmap -Path (Join-Path $outputDir "$OutputName.jpg")
    $bitmap.Dispose()
  } finally {
    $source.Dispose()
  }
}

$thumbs = @(
  @{ Out = "ocasion-cumpleanos"; Src = "box-bella" },
  @{ Out = "ocasion-amor"; Src = "ramo-love" },
  @{ Out = "ocasion-graduacion"; Src = "ramo-pink" },
  @{ Out = "ocasion-detalles"; Src = "box-amber" },
  @{ Out = "ocasion-de-autor"; Src = "brunebox" },
  @{ Out = "ocasion-eternas"; Src = "rosas-eternas" },
  @{ Out = "ocasion-elegante"; Src = "orquidia-phalaenopsis" },
  @{ Out = "ocasion-regalos"; Src = "java-corazon" },
  @{ Out = "flor-tulipanes"; Src = "tulips-love" },
  @{ Out = "flor-rosas"; Src = "ramo-love" },
  @{ Out = "flor-girasoles"; Src = "box-amber" },
  @{ Out = "flor-boxes"; Src = "box-bella" },
  @{ Out = "flor-preservadas"; Src = "rosas-eternas" },
  @{ Out = "flor-regalos"; Src = "java-corazon" },
  @{ Out = "flor-orquideas"; Src = "orquidia-phalaenopsis" }
)

foreach ($thumb in $thumbs) {
  New-Thumbnail -SourceName $thumb.Src -OutputName $thumb.Out
}

Write-Output "created $($thumbs.Count) category thumbnails"
