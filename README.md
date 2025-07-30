# HTE Design Application

A High-Throughput Experimentation (HTE) design application for chemistry experiments with 96-well plate visualization and analytical data processing.

## Features

- **Experiment Management**: Context, materials, and procedure tracking
- **Analytical Data Processing**: Upload and process chromatogram data
- **Heatmap Visualization**: 8x12 plate visualization with customizable formulas
- **Compound Name Mapping**: Automatic display of compound names from data
- **File Upload**: Support for Excel and CSV files
- **Data Persistence**: Auto-save functionality across tabs
- **Molecule Rendering**: RDKit-based molecular structure visualization

## Tech Stack

### Backend
- **Flask** (2.3.3) - Web framework
- **Flask-CORS** (4.0.0) - Cross-origin resource sharing
- **Pandas** (2.3.1) - Data manipulation
- **OpenPyXL** (3.1.5) - Excel file handling
- **RDKit** (2025.3.3) - Cheminformatics
- **Pillow** (11.3.0) - Image processing
- **CairoSVG** (2.7.1) - SVG to PNG conversion

### Frontend
- **React** (18.2.0) - UI framework
- **React Router** (6.3.0) - Navigation
- **Axios** (1.4.0) - HTTP client
- **React Scripts** (5.0.1) - Build tools

## Prerequisites

- **Python** 3.8 or higher
- **Node.js** 16 or higher
- **npm** 8 or higher

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Llefort-19/HTE-design-app.git
cd HTE-design-app
```

### 2. Install Dependencies

#### Option A: Using npm scripts (Recommended)
```bash
npm run install-all
```

#### Option B: Manual installation
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install Python dependencies
pip install -r requirements.txt
```

### 3. Start the Application

#### Option A: Using npm scripts (Recommended)
```bash
npm start
```

#### Option B: Manual start
```bash
# Terminal 1: Start backend
cd backend
python app.py

# Terminal 2: Start frontend
cd frontend
npm start
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

## Project Structure

```
HTE-design-app/
├── backend/
│   └── app.py                 # Flask backend server
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── AnalyticalData.js
│   │   │   ├── ExperimentContext.js
│   │   │   ├── Header.jsx
│   │   │   ├── Heatmap.js
│   │   │   ├── Materials.js
│   │   │   ├── Procedure.js
│   │   │   ├── Results.js
│   │   │   ├── Toast.js
│   │   │   └── ToastContext.js
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
├── requirements.txt           # Python dependencies
├── package.json              # Root npm configuration
└── README.md
```

## Usage

### 1. Experiment Context
- Fill in experiment details and context information
- Data auto-saves as you type

### 2. Materials
- Search and select materials from the inventory
- Add custom materials to private inventory

### 3. Procedure
- Document experimental procedures
- Auto-save functionality included

### 4. Analytical Data
- Generate Excel templates for chromatogram analysis
- Upload filled templates with compound data
- Filter and select compounds for analysis

### 5. Results
- View uploaded analytical data
- Export results to Excel

### 6. Heatmap
- Visualize analytical results as 8x12 heatmaps
- Build custom formulas using compound names
- Multi-column selection for numerator/denominator
- Percentage calculations available
- Data persists across tab switches

## API Endpoints

### Experiment Management
- `GET/POST /api/experiment/context` - Experiment context
- `GET/POST /api/experiment/materials` - Materials data
- `GET/POST /api/experiment/procedure` - Procedure data
- `GET/POST /api/experiment/results` - Results data
- `POST /api/experiment/reset` - Reset experiment

### Analytical Data
- `GET/POST /api/experiment/analytical` - Analytical data
- `POST /api/experiment/analytical/template` - Generate template
- `POST /api/experiment/analytical/upload` - Upload data

### Heatmap
- `GET/POST /api/experiment/heatmap` - Heatmap data persistence

### Inventory
- `GET /api/inventory` - Get inventory
- `GET /api/inventory/search` - Search inventory
- `POST /api/inventory/private/add` - Add to private inventory

### Molecules
- `POST /api/molecule/image` - Generate molecule image
- `POST /api/upload/sdf` - Upload SDF file

## Development

### Backend Development
```bash
cd backend
python app.py
```

### Frontend Development
```bash
cd frontend
npm start
```

### Building for Production
```bash
cd frontend
npm run build
```

## Deployment

### Local Deployment
1. Follow the installation instructions above
2. Use `npm start` to run both frontend and backend

### Production Deployment
1. Build the frontend: `npm run build`
2. Set up a production server (e.g., nginx, Apache)
3. Configure the backend to run as a service
4. Update proxy settings in production

## Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   - Kill existing processes: `npx kill-port 3000`
   - Or use a different port: `PORT=3001 npm start`

2. **Python dependencies not found**
   - Ensure you're using the correct Python environment
   - Reinstall requirements: `pip install -r requirements.txt`

3. **RDKit installation issues**
   - On Windows: Use conda: `conda install -c conda-forge rdkit`
   - On Linux/Mac: `pip install rdkit-pypi`

4. **CairoSVG installation issues**
   - On Windows: Install Visual C++ build tools
   - On Linux: `sudo apt-get install libcairo2-dev`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please create an issue on the GitHub repository. 