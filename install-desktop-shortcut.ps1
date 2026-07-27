param([string]$Destination)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($Destination)) {
  $Destination = if ($env:ECHO_ENGLISH_SHORTCUT_DIR) {
    $env:ECHO_ENGLISH_SHORTCUT_DIR
  } else {
    [Environment]::GetFolderPath('Desktop')
  }
}

$appPath = Join-Path $PSScriptRoot 'index.html'
if (-not (Test-Path -LiteralPath $appPath)) {
  throw "Cannot find the website entry file: $appPath"
}

if (-not (Test-Path -LiteralPath $Destination)) {
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
}

$shortcutPath = Join-Path $Destination 'Echo English.lnk'
if (Test-Path -LiteralPath $shortcutPath) {
  Remove-Item -LiteralPath $shortcutPath -Force
}
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $env:WINDIR 'explorer.exe'
$shortcut.Arguments = '"' + $appPath + '"'
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.IconLocation = (Join-Path $env:WINDIR 'System32\imageres.dll') + ',15'
$shortcut.Description = 'Open Echo English personal practice'
$shortcut.Save()

if (-not (Test-Path -LiteralPath $shortcutPath)) {
  throw "The desktop shortcut was not created: $shortcutPath"
}

Write-Output $shortcutPath
