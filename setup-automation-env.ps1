# PowerShell script to configure git for automation across all projects
# Run this once in any new Cursor project

Write-Host "🔧 Setting up Git for Automation Environment" -ForegroundColor Cyan

# Check if we're in a git repository
if (-not (Test-Path ".git")) {
    Write-Host "❌ Not in a git repository" -ForegroundColor Red
    exit 1
}

# Configure git for automation (no pagers, no interactive prompts)
Write-Host "📝 Configuring git settings..." -ForegroundColor Yellow

git config core.pager ""
git config core.autocrlf false
git config core.filemode false
git config advice.pushNonFastForward false
git config advice.statusHints false
git config advice.commitBeforeMerge false
git config advice.resolveConflict false
git config advice.implicitIdentity false
git config advice.detachedHead false
git config push.default simple
git config push.autoSetupRemote true
git config pull.rebase false

# Create automation helper functions
Write-Host "🔧 Creating automation helper script..." -ForegroundColor Yellow

$automationScript = @"
# Git Automation Helper Functions
# Source this in your automation scripts

function Git-Add-All {
    git --no-pager add .
}

function Git-Commit {
    param([string]`$message)
    git --no-pager commit -m "`$message"
}

function Git-Push {
    git --no-pager push origin main
}

function Git-Status {
    git --no-pager status --porcelain
}

function Git-Auto-Commit-Push {
    param([string]`$message)
    Git-Add-All
    Git-Commit "`$message"
    Git-Push
}

# Environment detection
function Get-Shell-Environment {
    if (`$env:OS -eq "Windows_NT") {
        if (`$PSVersionTable.PSVersion.Major -ge 6) {
            return "PowerShell-Core"
        } else {
            return "PowerShell-Windows"
        }
    } else {
        return "Unix-Shell"
    }
}

Write-Host "Shell Environment: `$(Get-Shell-Environment)" -ForegroundColor Green
"@

$automationScript | Out-File -FilePath "git-automation-helpers.ps1" -Encoding UTF8

Write-Host "✅ Git automation setup complete!" -ForegroundColor Green
Write-Host "📋 Created files:" -ForegroundColor Cyan
Write-Host "   - .gitconfig-automation (git settings)" -ForegroundColor White
Write-Host "   - git-automation-helpers.ps1 (helper functions)" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "🚀 Usage in automation:" -ForegroundColor Cyan
Write-Host "   . .\git-automation-helpers.ps1" -ForegroundColor White
Write-Host "   Git-Auto-Commit-Push 'Your commit message'" -ForegroundColor White
