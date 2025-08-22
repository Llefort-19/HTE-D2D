# Cursor Project Automation Setup Guide

## 🎯 Purpose
Ensure consistent git automation across all Cursor projects by preventing shell environment and pager conflicts.

## 🚀 Quick Setup (Run Once Per Project)

### For Windows/PowerShell Projects:
```powershell
# Run this in your project root
.\setup-automation-env.ps1
```

### For Unix/Linux Projects:
```bash
# Configure git for automation
git config core.pager ""
git config core.autocrlf false
git config advice.statusHints false
```

## 🔧 Files Created

### 1. `.gitconfig-automation`
- Git configuration optimized for automation
- Disables pagers and interactive prompts

### 2. `git-automation-helpers.ps1`
- Helper functions for git operations
- Environment detection utilities

### 3. `.vscode/settings.json`
- Cursor/VSCode workspace settings
- Forces PowerShell as default terminal
- Sets environment variables to disable pagers

## 📝 Usage in Automation Scripts

### Option 1: Use Helper Functions
```powershell
# Source the helpers
. .\git-automation-helpers.ps1

# Use the functions
Git-Auto-Commit-Push "Your commit message"
```

### Option 2: Direct Commands with No-Pager
```powershell
git --no-pager add .
git --no-pager commit -m "Your message"
git --no-pager push origin main
```

### Option 3: PowerShell Wrapper
```powershell
powershell -Command "git --no-pager add .; git --no-pager commit -m 'message'; git --no-pager push"
```

## 🐛 Troubleshooting

### Issue: Commands hang in pager
**Solution**: Ensure `GIT_PAGER=""` is set or use `--no-pager` flag

### Issue: WSL/PowerShell environment mismatch
**Solution**: Use `powershell -Command` wrapper or check shell with:
```powershell
Get-Shell-Environment  # From helpers
```

### Issue: Permission errors
**Solution**: Run `Set-ExecutionPolicy Bypass -Scope CurrentUser`

## ✅ Verification

Test your setup:
```powershell
# Should return empty (no pager)
git config core.pager

# Should work without hanging
git --no-pager status
```

## 🔄 Template for New Projects

Copy these files to any new Cursor project:
- `.gitconfig-automation`
- `setup-automation-env.ps1`
- `AUTOMATION_SETUP.md`
- `.vscode/settings.json`

## 🎯 Best Practices

1. **Always use `--no-pager`** in automation scripts
2. **Set environment variables** `GIT_PAGER=""` and `PAGER=""`
3. **Test in the actual shell environment** where automation will run
4. **Use PowerShell wrappers** for cross-environment compatibility
5. **Source helper functions** for consistent behavior

---
*This setup prevents the shell environment and pager issues that cause git automation to fail in Cursor projects.*
