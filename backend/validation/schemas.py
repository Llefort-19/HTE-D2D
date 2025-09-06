"""
Marshmallow schemas for request/response validation.
"""
from marshmallow import Schema, fields, validate, post_load, ValidationError
from typing import Dict, Any

class ExperimentContextSchema(Schema):
    """Schema for experiment context data."""
    author = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    date = fields.Date(required=True)
    project = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    eln = fields.Str(required=True, validate=validate.Length(min=1, max=50))
    objective = fields.Str(validate=validate.Length(max=1000), allow_none=True)
    plate_type = fields.Str(validate=validate.OneOf(['24', '48', '96']), missing='96')

class MaterialSchema(Schema):
    """Schema for individual material data."""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    alias = fields.Str(validate=validate.Length(max=100), allow_none=True)
    cas = fields.Str(validate=validate.Length(max=50), allow_none=True)
    smiles = fields.Str(validate=validate.Length(max=500), allow_none=True)
    molecular_weight = fields.Str(validate=validate.Length(max=20), allow_none=True)
    barcode = fields.Str(validate=validate.Length(max=100), allow_none=True)
    role = fields.Str(validate=validate.OneOf([
        'Reactant', 'Target product', 'Product', 'Solvent', 
        'Reagent', 'Internal standard', ''
    ]), missing='')
    source = fields.Str(validate=validate.OneOf([
        'inventory_match', 'excel_upload', 'kit_upload', 'manual', 'solvent_database'
    ]), missing='manual')
    inventory_location = fields.Str(validate=validate.Length(max=100), allow_none=True)
    supplier = fields.Str(validate=validate.Length(max=100), allow_none=True)

class MaterialsListSchema(Schema):
    """Schema for list of materials (when materials are sent as root array)."""
    # This handles when materials are sent directly as an array
    pass

    @post_load
    def make_materials_list(self, data, **kwargs):
        # For direct array of materials
        if isinstance(data, list):
            return [MaterialSchema().load(item) for item in data]
        return data

class WellMaterialSchema(Schema):
    """Schema for materials in a well."""
    name = fields.Str(required=True, validate=validate.Length(min=1, max=200))
    alias = fields.Str(validate=validate.Length(max=100), allow_none=True)
    cas = fields.Str(validate=validate.Length(max=50), allow_none=True)
    amount = fields.Str(required=True, validate=validate.Length(min=1, max=20))
    unit = fields.Str(validate=validate.OneOf(['μmol', 'mmol', 'mol', 'μL', 'mL', 'L', 'mg', 'g']), missing='μmol')
    role = fields.Str(allow_none=True)
    source = fields.Str(allow_none=True)

class ProcedureItemSchema(Schema):
    """Schema for individual procedure item (well)."""
    well = fields.Str(required=True, validate=validate.Regexp(r'^[A-H](1[0-2]|[1-9])$'))
    id = fields.Str(validate=validate.Length(max=50), allow_none=True)
    materials = fields.List(fields.Nested(WellMaterialSchema), missing=list)

class ProcedureListSchema(Schema):
    """Schema for procedure data."""
    procedure = fields.List(fields.Nested(ProcedureItemSchema), required=True)

class ReactionConditionsSchema(Schema):
    """Schema for reaction conditions."""
    temperature = fields.Str(validate=validate.Length(max=20), allow_none=True)
    time = fields.Str(validate=validate.Length(max=20), allow_none=True)
    pressure = fields.Str(validate=validate.Length(max=20), allow_none=True)
    wavelength = fields.Str(validate=validate.Length(max=20), allow_none=True)
    remarks = fields.Str(validate=validate.Length(max=1000), allow_none=True)

class AnalyticalDetailsSchema(Schema):
    """Schema for analytical details."""
    uplcNumber = fields.Str(validate=validate.Length(max=50), allow_none=True)
    method = fields.Str(validate=validate.Length(max=100), allow_none=True)
    duration = fields.Str(validate=validate.Length(max=20), allow_none=True)
    remarks = fields.Str(validate=validate.Length(max=1000), allow_none=True)

class ProcedureSettingsSchema(Schema):
    """Schema for procedure settings."""
    reactionConditions = fields.Nested(ReactionConditionsSchema, missing=dict)
    analyticalDetails = fields.Nested(AnalyticalDetailsSchema, missing=dict)

class UploadedFileSchema(Schema):
    """Schema for uploaded file data."""
    filename = fields.Str(required=True, validate=validate.Length(min=1, max=255))
    upload_date = fields.DateTime(required=True)
    data = fields.List(fields.Dict(), required=True)
    columns = fields.List(fields.Str(), required=True)
    shape = fields.List(fields.Int(), validate=validate.Length(equal=2), required=True)
    area_columns = fields.List(fields.Str(), missing=list)

class AnalyticalDataSchema(Schema):
    """Schema for analytical data."""
    selectedCompounds = fields.List(fields.Str(), missing=list)
    uploadedFiles = fields.List(fields.Nested(UploadedFileSchema), missing=list)

class ResultItemSchema(Schema):
    """Schema for individual result item."""
    well = fields.Str(required=True, validate=validate.Regexp(r'^[A-H](1[0-2]|[1-9])$'))
    id = fields.Str(validate=validate.Length(max=50), allow_none=True)
    conversion_percent = fields.Str(validate=validate.Length(max=10), allow_none=True)
    yield_percent = fields.Str(validate=validate.Length(max=10), allow_none=True)
    selectivity_percent = fields.Str(validate=validate.Length(max=10), allow_none=True)

class ResultsSchema(Schema):
    """Schema for results data."""
    results = fields.List(fields.Nested(ResultItemSchema), required=True)

class HeatmapDataSchema(Schema):
    """Schema for heatmap data."""
    # Flexible schema since heatmap data structure can vary
    data = fields.Raw(required=True)
    metadata = fields.Dict(missing=dict)

class InventorySearchSchema(Schema):
    """Schema for inventory search parameters."""
    q = fields.Str(required=True, validate=validate.Length(min=1, max=100))
    
class SolventSearchSchema(Schema):
    """Schema for solvent search parameters."""
    q = fields.Str(validate=validate.Length(min=1, max=100), allow_none=True)
    type = fields.Str(validate=validate.OneOf(['all', 'name', 'alias', 'cas', 'boiling_point', 'class']), missing='all')
    class_filter = fields.Str(validate=validate.Length(max=50), allow_none=True)
    bp_filter = fields.Str(validate=validate.Length(max=20), allow_none=True)
    tier_filter = fields.Str(validate=validate.Length(max=10), allow_none=True)

class MoleculeImageRequestSchema(Schema):
    """Schema for molecule image generation request."""
    smiles = fields.Str(required=True, validate=validate.Length(min=1, max=500))
    width = fields.Int(validate=validate.Range(min=50, max=1000), missing=300)
    height = fields.Int(validate=validate.Range(min=50, max=1000), missing=300)

class MoleculeImageResponseSchema(Schema):
    """Schema for molecule image generation response."""
    image = fields.Str(required=True)
    format = fields.Str(required=True, validate=validate.OneOf(['png', 'jpeg']))
    size = fields.Dict(required=True)

class FileUploadResponseSchema(Schema):
    """Schema for file upload response."""
    message = fields.Str(required=True)
    filename = fields.Str(required=True)
    rows = fields.Int(validate=validate.Range(min=0), allow_none=True)
    columns = fields.Int(validate=validate.Range(min=0), allow_none=True)
    area_columns = fields.List(fields.Str(), missing=list)

class ErrorResponseSchema(Schema):
    """Schema for error responses."""
    error = fields.Str(required=True)
    message = fields.Str(required=True)
    status_code = fields.Int(required=True)

class SuccessResponseSchema(Schema):
    """Schema for success responses."""
    message = fields.Str(required=True)

class InventoryItemSchema(Schema):
    """Schema for inventory item."""
    chemical_name = fields.Str(required=True)
    alias = fields.Str(allow_none=True)
    cas_number = fields.Str(allow_none=True)
    molecular_weight = fields.Str(allow_none=True)
    smiles = fields.Str(allow_none=True)
    barcode = fields.Str(allow_none=True)
    location = fields.Str(allow_none=True)
    supplier = fields.Str(allow_none=True)
    source = fields.Str(allow_none=True)

class SolventItemSchema(Schema):
    """Schema for solvent item."""
    name = fields.Str(required=True)
    alias = fields.Str(allow_none=True)
    cas = fields.Str(allow_none=True)
    molecular_weight = fields.Str(allow_none=True)
    smiles = fields.Str(allow_none=True)
    boiling_point = fields.Float(allow_none=True)
    chemical_class = fields.Str(allow_none=True)
    density = fields.Float(allow_none=True)
    tier = fields.Str(allow_none=True)
    source = fields.Str(required=True, validate=validate.OneOf(['solvent_database']))

class KitSizeSchema(Schema):
    """Schema for kit size information."""
    rows = fields.Int(required=True, validate=validate.Range(min=1, max=8))
    columns = fields.Int(required=True, validate=validate.Range(min=1, max=12))
    total_wells = fields.Int(required=True, validate=validate.Range(min=1, max=96))
    content_wells = fields.Int(required=True, validate=validate.Range(min=1))
    row_range = fields.Str(required=True)
    col_range = fields.Str(required=True)
    wells = fields.List(fields.Str(), required=True)

class KitAnalysisResponseSchema(Schema):
    """Schema for kit analysis response."""
    materials = fields.List(fields.Nested(MaterialSchema), required=True)
    design = fields.Dict(required=True)  # Complex nested structure, keep flexible
    kit_size = fields.Nested(KitSizeSchema, required=True)
    filename = fields.Str(required=True)
