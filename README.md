# HTE App - High Throughput Experiment Design

A comprehensive web application for designing, recording, and analyzing high throughput chemical experiments. The app allows users to manage chemical inventory, design 96-well plate experiments, record analytical data, and export results for ML model training.

## Features

- **Chemical Inventory Management**: Search and add chemicals from Excel-based inventory
- **Experiment Context**: Define experiment metadata (author, date, project, etc.)
- **Materials Management**: Add chemicals with roles, quantification levels, and properties
- **96-Well Plate Design**: Interactive plate layout for reaction design
- **Analytical Data Recording**: Record chromatogram areas for compounds
- **Results Calculation**: Calculate and record conversion, yield, and selectivity
- **Excel Export**: Export complete experiment data in template-compatible format

## Technology Stack

- **Backend**: Python Flask with RESTful API
- **Frontend**: React.js with modern UI components
- **Data Storage**: In-memory storage with Excel export
- **Dependencies**: pandas, openpyxl, flask-cors

## Setup Instructions

### Prerequisites

- Python 3.7+
- Node.js 14+
- npm or yarn

### Backend Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Ensure your `Inventory.xlsx` file is in the root directory (contains chemical inventory)

3. Start the Flask backend:
```bash
cd backend
python app.py
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Install Node.js dependencies:
```bash
cd frontend
npm install
```

2. Start the React development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage Guide

### 1. Experiment Context
- Enter experiment metadata (author, date, project, ELN number, objective)
- This information will be included in the exported Excel file

### 2. Materials
- Search the chemical inventory by name or common name
- Add chemicals from inventory or manually enter new materials
- Define chemical roles (Reactant, Product, Solvent, Reagent)
- Set quantification levels and analytical parameters

### 3. 96-Well Plate Design
- Click on wells to add chemicals and define reaction conditions
- Add compounds, reagents, and solvents with quantities
- Wells with content are highlighted in green
- Use the dropdown to quickly add materials from your defined list

### 4. Analytical Data
- Click on wells to copy compound names from the procedure
- Enter chromatogram areas for each compound
- Leave area fields blank if compound is not quantified
- Use the same compound names as defined in Materials

### 5. Results
- Calculate and record conversion, yield, and selectivity percentages
- View procedure and analytical data for each well
- Export complete experiment data to Excel format

## Data Export

The app exports data in the same format as the provided template (`HTE_reaction_data_template_96_v3.2.xlsx`):

- **Context**: Experiment metadata
- **Materials**: Chemical information with properties
- **Procedure**: 96-well plate layout with quantities
- **Analytical data (1)**: Chromatogram areas
- **Results (1)**: Calculated results

The exported Excel file is suitable for:
- ML model training
- Data analysis
- Further processing in other tools

## File Structure

```
HTE App/
├── backend/
│   └── app.py                 # Flask backend API
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── ExperimentContext.js
│   │   │   ├── Materials.js
│   │   │   ├── Procedure.js
│   │   │   ├── AnalyticalData.js
│   │   │   └── Results.js
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
├── Inventory.xlsx             # Chemical inventory
├── HTE_reaction_data_template_96_v3.2.xlsx  # Template file
├── requirements.txt           # Python dependencies
└── README.md
```

## API Endpoints

### Inventory
- `GET /api/inventory` - Get all chemicals
- `GET /api/inventory/search?q=<query>` - Search chemicals

### Experiment Data
- `GET/POST /api/experiment/context` - Experiment metadata
- `GET/POST /api/experiment/materials` - Chemical materials
- `GET/POST /api/experiment/procedure` - 96-well plate data
- `GET/POST /api/experiment/analytical` - Analytical data
- `GET/POST /api/experiment/results` - Experiment results
- `POST /api/experiment/export` - Export to Excel
- `POST /api/experiment/reset` - Reset experiment

## Development

### Adding New Features

1. **Backend**: Add new endpoints in `backend/app.py`
2. **Frontend**: Create new components in `frontend/src/components/`
3. **Styling**: Update CSS in `frontend/src/index.css`

### Data Validation

The app includes basic validation for:
- Required fields in experiment context
- Chemical name consistency between materials and procedure
- Numerical values for quantities and areas

### Error Handling

- API errors are displayed as user-friendly messages
- Form validation prevents invalid data entry
- Export errors are handled gracefully

## Troubleshooting

### Common Issues

1. **Backend not starting**: Check if port 5000 is available
2. **Frontend not connecting**: Ensure backend is running on localhost:5000
3. **Excel export fails**: Check if Inventory.xlsx exists in root directory
4. **Search not working**: Verify Inventory.xlsx has correct column names

### Debug Mode

Backend runs in debug mode by default. Check console for detailed error messages.

## Future Enhancements

- Database integration for persistent storage
- User authentication and multi-user support
- Advanced search and filtering
- Data visualization and charts
- Integration with laboratory equipment
- Automated result calculations
- Template customization
- Data import from other formats

## License

This project is designed for research and educational use in chemical process development. 