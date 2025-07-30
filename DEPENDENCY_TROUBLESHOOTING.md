# HTE App Dependency Troubleshooting Guide

## Common Issues and Solutions

### 1. React Scripts Issues

**Problem**: `onAfterSetupMiddleware` errors or React Scripts compatibility issues

**Solutions**:
- Run the installation script: `install_dependencies.bat`
- Clear npm cache: `npm cache clean --force`
- Use legacy peer deps: `npm install --legacy-peer-deps`
- If issues persist, try: `npm run clean` (Linux/Mac) or `npm run clean:win` (Windows)

### 2. Proxy Issues

**Problem**: Frontend can't connect to backend API

**Solutions**:
- Ensure backend is running on port 5000
- Check if port 5000 is available: `netstat -an | findstr :5000`
- Restart both frontend and backend
- Clear browser cache and hard refresh

### 3. Node.js Version Issues

**Problem**: Incompatible Node.js version

**Solution**:
- Install Node.js 16.0.0 or higher
- Download from: https://nodejs.org/
- Verify installation: `node --version`

### 4. Python Dependencies

**Problem**: Python package installation failures

**Solutions**:
- Upgrade pip: `pip install --upgrade pip`
- Install with no cache: `pip install -r requirements.txt --no-cache-dir`
- Use virtual environment: `python -m venv venv && venv\Scripts\activate`

### 5. Cross-Platform Compatibility

**Windows Issues**:
- Use `npm run clean:win` instead of `npm run clean`
- Ensure PowerShell execution policy allows scripts
- Run as administrator if permission issues occur

**Linux/Mac Issues**:
- Use `npm run clean` for Unix systems
- Ensure proper file permissions
- Use `chmod +x` for shell scripts

## Quick Fix Commands

### For React Scripts Issues:
```bash
# Windows
npm run clean:win

# Linux/Mac
npm run clean
```

### For Fresh Installation:
```bash
# Run the installation script
install_dependencies.bat
```

### For Proxy Issues:
```bash
# Check if backend is running
netstat -an | findstr :5000

# Restart the application
npm start
```

### For Python Issues:
```bash
# Upgrade pip and reinstall
pip install --upgrade pip
pip install -r requirements.txt --no-cache-dir
```

## Environment Requirements

### Minimum Requirements:
- Node.js: 16.0.0 or higher
- npm: 8.0.0 or higher
- Python: 3.8 or higher
- pip: Latest version

### Recommended:
- Node.js: 18.x or 20.x LTS
- Python: 3.9 or 3.10
- 8GB RAM minimum
- 2GB free disk space

## File Structure Check

Ensure these files exist and are properly configured:
```
HTE App/
├── package.json
├── frontend/package.json
├── frontend/src/setupProxy.js
├── requirements.txt
├── install_dependencies.bat
└── backend/app.py
```

## Contact Support

If issues persist after trying these solutions:
1. Check the console output for specific error messages
2. Verify all requirements are met
3. Try a fresh clone of the repository
4. Contact the development team with error logs 