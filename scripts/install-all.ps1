# install-all.ps1 — 一键安装全部 DeepSeek Harness 插件
# 用法: powershell -ExecutionPolicy Bypass -File install-all.ps1 [-Profile web] [-Owner <gh>] [-Repo <name>] [-Version <v>]
param(
  [string]$Profile = "web",
  [string]$Owner = "mm2672653902-star",
  [string]$Repo = "dsh-plugin-marketplace",
  [string]$Version = "0.1.0"
)

$names = @(
  "dsh-tool-text", "dsh-tool-calculator", "dsh-tool-datetime", "dsh-tool-generator",
  "dsh-tool-system-info", "dsh-notes", "dsh-reminder", "dsh-usage-stats",
  "dsh-skill-git-commit", "dsh-safety-guard", "dsh-theme-ink", "dsh-ui-session-badge"
)

foreach ($n in $names) {
  $url = "https://github.com/$Owner/$Repo/releases/download/v$Version/$n-0.1.0.tgz"
  Write-Host "安装 $n ..."
  dsh plugin --profile $Profile add $url
  if ($LASTEXITCODE -ne 0) { Write-Warning "安装失败: $n" }
}
Write-Host "全部完成。重启 dsh 使插件生效。"
