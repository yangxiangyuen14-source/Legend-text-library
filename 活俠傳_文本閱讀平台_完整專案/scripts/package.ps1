$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$outputPath = Join-Path (Split-Path $projectRoot -Parent) '活俠傳_文本閱讀平台_完整專案.zip'
$stream = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::Create)
$archive = [System.IO.Compression.ZipArchive]::new($stream, [System.IO.Compression.ZipArchiveMode]::Create, $false, [System.Text.Encoding]::UTF8)
try {
    Get-ChildItem -LiteralPath $projectRoot -Recurse -File -Force | ForEach-Object {
        $relativePath = [System.IO.Path]::GetRelativePath($projectRoot, $_.FullName).Replace('\', '/')
        if ($relativePath -notmatch '^(\.git/|\.openai/|node_modules/|artifacts/)' -and $relativePath -notmatch '(^|/)\.env($|\.)' -and $relativePath -notmatch '\.(tar\.gz|tgz)$') {
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, $_.FullName, $relativePath, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
        }
    }
} finally {
    $archive.Dispose()
    $stream.Dispose()
}
Write-Output "Project ZIP: $outputPath"
