# Troubleshooting Guide

## 🚨 Critical Issues and Solutions

### 1. React Scripts onAfterSetupMiddleware Error

#### Problem: React Scripts 5.0.1 deprecated middleware
```
Error: onAfterSetupMiddleware is not a function
Error: onBeforeSetupMiddleware is not a function
```

#### Solution:
```bash
# The setupProxy.js file has been added to handle proxy configuration
# This resolves the deprecated middleware issue in react-scripts 5.0.1

# If you still encounter issues, try:
cd frontend
npm install http-proxy-middleware@^2.0.6
npm start
```

### 2. Security Vulnerabilities

#### Problem: Multiple security vulnerabilities in frontend dependencies
```
12 vulnerabilities (2 low, 3 moderate, 6 high, 1 critical)
```

#### Solution:
```bash
# Navigate to frontend directory
cd frontend

# Apply security fixes
npm audit fix --force

# If issues persist, manually update vulnerable packages
npm install nth-check@^2.1.1 postcss@^8.4.35 webpack-dev-server@^4.15.2 form-data@^4.0.0 on-headers@^1.1.0
```

### 3. RDKit Installation Issues

#### Problem: RDKit fails to install on some systems
```
Error: Microsoft Visual C++ 14.0 or greater is required
```

#### Solution:
```bash
# Option 1: Use conda (recommended)
conda install -c conda-forge rdkit

# Option 2: Install Visual C++ Build Tools
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/

# Option 3: Use pre-compiled wheel
pip install rdkit-pypi
```

### 4. Python Version Compatibility

#### Problem: Python 3.13+ compatibility issues
Your current Python version (3.13.1) may cause issues with some packages.

#### Solution:
```bash
# Install Python 3.11 (recommended for this project)
# Download from: https://www.python.org/downloads/

# Or use conda to manage Python versions
conda create -n hte-app python=3.11
conda activate hte-app
```

### 5. Node.js Version Issues

#### Problem: Node.js v22.14.0 is very recent and may cause compatibility issues

#### Solution:
```bash
# Install Node.js 18 LTS (recommended)
# Download from: https://nodejs.org/

# Or use nvm to manage Node.js versions
nvm install 18.19.0
nvm use 18.19.0
```

## 🔧 Step-by-Step Fix Process

### Complete Reset and Reinstall

1. **Clean everything:**
```bash
# Remove all node_modules and lock files
rm -rf node_modules frontend/node_modules
rm package-lock.json frontend/package-lock.json

# Clear npm cache
npm cache clean --force
```

2. **Update Python environment:**
```bash
# Upgrade pip and build tools
python -m pip install --upgrade pip setuptools wheel

# Install Python dependencies
pip install -r requirements.txt --no-cache-dir
```

3. **Install Node.js dependencies:**
```bash
# Install root dependencies
npm install --no-audit

# Install frontend dependencies
cd frontend
npm install --no-audit
npm audit fix --force
cd ..
```

4. **Test the installation:**
```bash
# Start the application
npm start
```

## 🐛 Common Error Messages and Solutions

### React Scripts Middleware Errors

#### Problem:
```
Error: onAfterSetupMiddleware is not a function
Error: onBeforeSetupMiddleware is not a function
```

#### Solution:
```bash
# The setupProxy.js file handles this automatically
# If issues persist, ensure http-proxy-middleware is installed:
cd frontend
npm install http-proxy-middleware@^2.0.6
npm start
```

### "Module not found" Errors

#### Problem:
```
ModuleNotFoundError: No module named 'rdkit'
```

#### Solution:
```bash
# Try conda installation
conda install -c conda-forge rdkit

# Or use pip with specific version
pip install rdkit==2024.9.1
```

### "Port already in use" Errors

#### Problem:
```
Error: listen EADDRINUSE: address already in use :::3000
```

#### Solution:
```bash
# Kill processes using the ports
npx kill-port 3000 5000

# Or use different ports
set PORT=3001 && npm start
```

### "Permission denied" Errors

#### Problem:
```
Error: EACCES: permission denied
```

#### Solution:
```bash
# Run as administrator (Windows)
# Right-click PowerShell/Command Prompt and "Run as administrator"

# Or fix npm permissions (Linux/Mac)
sudo chown -R $USER:$GROUP ~/.npm
sudo chown -R $USER:$GROUP ~/.config
```

## 🔒 Security Best Practices

### Regular Security Audits

```bash
# Check for vulnerabilities
npm run audit

# Fix non-breaking issues
npm run audit-fix

# Update dependencies regularly
npm update
```

### Production Deployment

1. **Use the production deployment script:**
```bash
deploy_production.bat
```

2. **Set up environment variables:**
```bash
# Create .env file
echo FLASK_ENV=production > .env
echo FLASK_DEBUG=False >> .env
echo NODE_ENV=production >> .env
```

3. **Remove development dependencies:**
```bash
cd frontend
npm prune --production
cd ..
```

## 📋 System Requirements Checklist

- [ ] Python 3.9-3.11 (not 3.13+)
- [ ] Node.js 18 LTS (not 22+)
- [ ] npm 9+
- [ ] Visual C++ Build Tools (Windows)
- [ ] Git

## 🆘 Getting Help

### Before Asking for Help

1. **Check the logs:**
   - Browser console (F12)
   - Terminal output
   - Application logs

2. **Verify your environment:**
```bash
python --version
node --version
npm --version
```

3. **Try the clean installation process:**
```bash
# Use the production deployment script
deploy_production.bat
```

### When to Contact Support

- All troubleshooting steps completed
- Error messages copied exactly
- System information provided
- Steps to reproduce the issue documented

## 📞 Emergency Fixes

### If Nothing Works

1. **Use Docker (if available):**
```bash
docker-compose up
```

2. **Try a different machine:**
   - Use Python 3.11
   - Use Node.js 18 LTS
   - Fresh OS installation

3. **Alternative installation:**
```bash
# Use yarn instead of npm
npm install -g yarn
yarn install
```

---

**Last Updated**: January 2025
**For urgent issues**: Check the main README.md first 