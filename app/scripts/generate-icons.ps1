$csharpCode = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using System.IO;

public class ImageProcessor
{
    public static void MakeBlackTransparent(string sourcePath, string targetPath)
    {
        using (Bitmap bmp = new Bitmap(sourcePath))
        {
            BitmapData data = bmp.LockBits(new Rectangle(0, 0, bmp.Width, bmp.Height), ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int size = data.Stride * data.Height;
            byte[] bytes = new byte[size];
            Marshal.Copy(data.Scan0, bytes, 0, size);
            
            for (int i = 0; i < size; i += 4)
            {
                byte b = bytes[i];
                byte g = bytes[i + 1];
                byte r = bytes[i + 2];
                
                // Key out black and dark backgrounds
                byte max = Math.Max(r, Math.Max(g, b));
                if (max < 30)
                {
                    bytes[i + 3] = 0; // Fully transparent
                }
                else if (max < 90)
                {
                    // Smooth antialiasing edge transition
                    double factor = (max - 30) / 60.0;
                    bytes[i + 3] = (byte)(255 * factor);
                }
            }
            
            Marshal.Copy(bytes, 0, data.Scan0, size);
            bmp.UnlockBits(data);
            bmp.Save(targetPath, ImageFormat.Png);
        }
    }
}

public class IcoBuilder
{
    public static void BuildIco(string[] pngPaths, string outputPath)
    {
        using (FileStream fs = new FileStream(outputPath, FileMode.Create))
        using (BinaryWriter bw = new BinaryWriter(fs))
        {
            ushort count = (ushort)pngPaths.Length;
            
            // ICO Header
            bw.Write((ushort)0); // Reserved
            bw.Write((ushort)1); // Type: Icon
            bw.Write(count);     // Number of images
            
            byte[][] pngBytes = new byte[count][];
            int offset = 6 + (count * 16);
            
            for (int i = 0; i < count; i++)
            {
                pngBytes[i] = File.ReadAllBytes(pngPaths[i]);
            }
            
            for (int i = 0; i < count; i++)
            {
                int w = 0, h = 0;
                using (Image img = Image.FromFile(pngPaths[i]))
                {
                    w = img.Width;
                    h = img.Height;
                }
                
                byte icoW = (byte)(w >= 256 ? 0 : w);
                byte icoH = (byte)(h >= 256 ? 0 : h);
                
                bw.Write(icoW);
                bw.Write(icoH);
                bw.Write((byte)0); // Colors
                bw.Write((byte)0); // Reserved
                bw.Write((ushort)1); // Planes
                bw.Write((ushort)32); // BPP
                bw.Write((uint)pngBytes[i].Length); // Image size
                bw.Write((uint)offset);             // Image offset
                
                offset += pngBytes[i].Length;
            }
            
            for (int i = 0; i < count; i++)
            {
                bw.Write(pngBytes[i]);
            }
        }
    }
}
"@

# Compile the C# helper classes
Add-Type -TypeDefinition $csharpCode -ReferencedAssemblies System.Drawing

$sourcePath = "C:\Users\PC\.gemini\antigravity-ide\brain\07fd4288-3ee8-4649-9abb-e796be913880\app_icon_black_bg_1781282498110.png"
$appRoot = "c:\Users\PC\OneDrive\Desktop\GelirGiderTakip\app"
$transparentSourcePath = Join-Path $appRoot "build/temp_transparent.png"

# Ensure build folder exists
if (!(Test-Path (Join-Path $appRoot "build"))) {
    New-Item -ItemType Directory -Force -Path (Join-Path $appRoot "build") | Out-Null
}

# 1. Process source image to remove black background and make it transparent
[ImageProcessor]::MakeBlackTransparent($sourcePath, $transparentSourcePath)
Write-Host "Processed source image to remove black background: $transparentSourcePath"

function Resize-Image {
    param (
        [string]$sourcePath,
        [string]$targetPath,
        [int]$width,
        [int]$height,
        [double]$scale = 0.95
    )
    $srcImg = [System.Drawing.Image]::FromFile($sourcePath)
    $destImg = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($destImg)
    
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $g.Clear([System.Drawing.Color]::Transparent)
    
    # Calculate scale and center logo to leave nice padding
    $w = [int]($width * $scale)
    $h = [int]($height * $scale)
    $x = [int](($width - $w) / 2)
    $y = [int](($height - $h) / 2)
    
    $g.DrawImage($srcImg, $x, $y, $w, $h)
    
    $parentDir = Split-Path $targetPath
    if (!(Test-Path $parentDir)) {
        New-Item -ItemType Directory -Force -Path $parentDir | Out-Null
    }
    
    $destImg.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $destImg.Dispose()
    $srcImg.Dispose()
    Write-Host "Generated: $targetPath ($width x $height) [scale: $scale]"
}

# 1. PWA Web App Icons (public folder) - scale: 1.0 for maximum visibility
$webSizes = @(
    @{W=72; H=72; Name="icon-72x72.png"},
    @{W=96; H=96; Name="icon-96x96.png"},
    @{W=128; H=128; Name="icon-128x128.png"},
    @{W=144; H=144; Name="icon-144x144.png"},
    @{W=152; H=152; Name="icon-152x152.png"},
    @{W=192; H=192; Name="icon-192x192.png"},
    @{W=384; H=384; Name="icon-384x384.png"},
    @{W=512; H=512; Name="icon-512x512.png"}
)

foreach ($size in $webSizes) {
    $target = Join-Path $appRoot "public/$($size.Name)"
    Resize-Image -sourcePath $transparentSourcePath -targetPath $target -width $size.W -height $size.H -scale 1.0
}

# 2. Electron Desktop Icons (build folder) - scale: 1.0
Resize-Image -sourcePath $transparentSourcePath -targetPath (Join-Path $appRoot "build/icon.png") -width 512 -height 512 -scale 1.0

# For multi-resolution ICO, we generate temporary files at 16x16, 32x32, 48x48, 256x256
$temp16 = Join-Path $appRoot "build/temp16.png"
$temp32 = Join-Path $appRoot "build/temp32.png"
$temp48 = Join-Path $appRoot "build/temp48.png"
$temp256 = Join-Path $appRoot "build/temp256.png"

Resize-Image -sourcePath $transparentSourcePath -targetPath $temp16 -width 16 -height 16 -scale 1.0
Resize-Image -sourcePath $transparentSourcePath -targetPath $temp32 -width 32 -height 32 -scale 1.0
Resize-Image -sourcePath $transparentSourcePath -targetPath $temp48 -width 48 -height 48 -scale 1.0
Resize-Image -sourcePath $transparentSourcePath -targetPath $temp256 -width 256 -height 256 -scale 1.0

# Compile multiple resolutions into one ICO
[IcoBuilder]::BuildIco(@($temp16, $temp32, $temp48, $temp256), (Join-Path $appRoot "build/icon.ico"))

# Remove temp files
Remove-Item -Path $temp16 -Force
Remove-Item -Path $temp32 -Force
Remove-Item -Path $temp48 -Force
Remove-Item -Path $temp256 -Force

# 3. Android mipmap launchers - scale: 0.82 for normal/round to prevent circular mask cropping, 0.70 for foreground
$androidMipmaps = @(
    @{W=48; Path="android/app/src/main/res/mipmap-mdpi"},
    @{W=72; Path="android/app/src/main/res/mipmap-hdpi"},
    @{W=96; Path="android/app/src/main/res/mipmap-xhdpi"},
    @{W=144; Path="android/app/src/main/res/mipmap-xxhdpi"},
    @{W=192; Path="android/app/src/main/res/mipmap-xxxhdpi"}
)

foreach ($map in $androidMipmaps) {
    $dirPath = Join-Path $appRoot $map.Path
    Resize-Image -sourcePath $transparentSourcePath -targetPath (Join-Path $dirPath "ic_launcher.png") -width $map.W -height $map.W -scale 0.82
    Resize-Image -sourcePath $transparentSourcePath -targetPath (Join-Path $dirPath "ic_launcher_round.png") -width $map.W -height $map.W -scale 0.82
    Resize-Image -sourcePath $transparentSourcePath -targetPath (Join-Path $dirPath "ic_launcher_foreground.png") -width $map.W -height $map.W -scale 0.70
}

# Cleanup temp transparent source
Remove-Item -Path $transparentSourcePath -Force

Write-Host "All transparent icons (including multi-resolution ICO) resized and updated successfully!"
