param(
  [Parameter(Mandatory = $true)]
  [string]$Description,
  [string]$Remote = "origin",
  [string]$BaseBranch = "main"
)

if ($Description -match "\\s") {
  Write-Error "Description cannot contain spaces. Use hyphens instead."
  exit 1
}

$date = Get-Date -Format "yyyy-MM-dd"
$worktreePath = ".worktrees/$date-$Description"
$branch = "chore/$date-$Description"

git fetch $Remote | Out-Null
git worktree add $worktreePath -b $branch "$Remote/$BaseBranch"

if (Test-Path .\node_modules) {
  Copy-Item -Recurse -Force .\node_modules (Join-Path $worktreePath "node_modules")
}
