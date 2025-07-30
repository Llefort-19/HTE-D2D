# HTE Design Application

A High-Throughput Experimentation (HTE) Design Application for chemical experiment planning and data management.

## 🚀 Quick Start

### Prerequisites

- **Python**: 3.8 or higher (3.9+ recommended)
- **Node.js**: 16 or higher (18+ recommended)
- **npm**: 8 or higher

### Installation

#### Windows
```bash
# Run the automated deployment script
deploy.bat
```

#### Manual Installation
```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Install root npm dependencies
npm install

# 3. Install frontend dependencies
cd frontend
npm install
cd ..

# 4. Start the application
npm start
```

## 🔧 Development

### Available Scripts

- `npm start` - Start both backend and frontend
- `npm run dev` - Start in development mode
- `npm run build` - Build frontend for production
- `npm run audit` - Check for security vulnerabilities
- `npm run audit-fix` - Fix security vulnerabilities
- `npm run clean` - Clean install all dependencies

### Project Structure

```
HTE App/
├── backend/
│   └── app.py              # Flask backend server
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   └── App.js          # Main React app
│   └── package.json        # Frontend dependencies
├── requirements.txt        # Python dependencies
├── package.json           # Root dependencies
└── deploy.bat            # Windows deployment script
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Python Dependencies
```bash
# If you get build errors, try:
pip install --upgrade setuptools wheel
pip install -r requirements.txt --no-cache-dir
```

#### 2. Node.js Dependencies
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install

# For frontend specifically:
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### 3. Security Vulnerabilities
```bash
# Check for vulnerabilities
npm run audit

# Fix non-breaking issues
npm run audit-fix
```

#### 4. Port Conflicts
- Frontend runs on: http://localhost:3000
- Backend runs on: http://localhost:5000

If ports are in use, kill the processes or change ports in the configuration.

### Version Compatibility

| Component | Minimum Version | Recommended Version |
|-----------|----------------|-------------------|
| Python    | 3.8            | 3.9+              |
| Node.js   | 16.0.0         | 18.0.0+           |
| npm       | 8.0.0          | 9.0.0+            |

## 🔒 Security

### Recent Updates
- Updated all dependencies to latest secure versions
- Added security overrides for vulnerable packages
- Implemented proper error handling
- Removed deprecated dependencies

### Security Audit
Run `npm run audit` to check for security vulnerabilities in both root and frontend packages.

## 📝 Features

- **Experiment Context**: Define experiment parameters and conditions
- **Materials Management**: Chemical inventory and material selection
- **96-Well Plate Design**: Visual plate layout and procedure planning
- **Analytical Data**: Import and process experimental data
- **Results Analysis**: Data visualization and analysis tools
- **Heatmap Generation**: Visual representation of experimental results

## 🐛 Known Issues

1. **RDKit Compatibility**: Some versions of RDKit may have compatibility issues with Python 3.13+. Use Python 3.9-3.11 for best compatibility.
2. **React Scripts**: Version 5.0.1 has some known vulnerabilities. Consider upgrading to a newer version when available.
3. **Console Logging**: Development console logs are present in production code and should be removed.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and security audits
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the console output for error messages
3. Ensure all prerequisites are met
4. Try the clean installation process

---

**Last Updated**: January 2025
**Version**: 1.0.0 