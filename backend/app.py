from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import pandas as pd
import json
import numpy as np
from werkzeug.utils import secure_filename
import uuid
from datetime import datetime
import sqlite3
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
DATABASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.sqlite')
ALLOWED_EXTENSIONS = {'csv', 'json', 'xlsx', 'xls'}

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Initialize database
def init_db():
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        
        # Create datasets table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS datasets (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_type TEXT NOT NULL,
            size INTEGER NOT NULL,
            uploaded_at TIMESTAMP NOT NULL,
            schema TEXT
        )
        ''')
        
        # Create columns table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS columns (
            id TEXT PRIMARY KEY,
            dataset_id TEXT NOT NULL,
            name TEXT NOT NULL,
            data_type TEXT NOT NULL,
            nullable BOOLEAN NOT NULL,
            unique_values INTEGER,
            min_value TEXT,
            max_value TEXT,
            avg_value REAL,
            missing_count INTEGER,
            FOREIGN KEY (dataset_id) REFERENCES datasets(id)
        )
        ''')
        
        conn.commit()

init_db()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Helper functions for data processing
def infer_schema(df):
    schema = []
    
    for col in df.columns:
        col_data = {
            'name': col,
            'nullable': df[col].isnull().any()
        }
        
        # Infer data type
        dtype = df[col].dtype
        if pd.api.types.is_integer_dtype(dtype):
            col_data['data_type'] = 'INTEGER'
        elif pd.api.types.is_float_dtype(dtype):
            col_data['data_type'] = 'FLOAT'
        elif pd.api.types.is_datetime64_dtype(dtype):
            col_data['data_type'] = 'TIMESTAMP'
        else:
            col_data['data_type'] = 'VARCHAR'
        
        # Calculate stats
        unique_count = df[col].nunique()
        col_data['unique_values'] = int(unique_count) if not pd.isna(unique_count) else None
        
        if col_data['data_type'] in ['INTEGER', 'FLOAT']:
            col_data['min_value'] = str(df[col].min()) if not df[col].isnull().all() else None
            col_data['max_value'] = str(df[col].max()) if not df[col].isnull().all() else None
            col_data['avg_value'] = float(df[col].mean()) if not df[col].isnull().all() else None
        elif col_data['data_type'] == 'TIMESTAMP':
            col_data['min_value'] = str(df[col].min()) if not df[col].isnull().all() else None
            col_data['max_value'] = str(df[col].max()) if not df[col].isnull().all() else None
            col_data['avg_value'] = None
        else:
            col_data['min_value'] = None
            col_data['max_value'] = None
            col_data['avg_value'] = None
        
        col_data['missing_count'] = int(df[col].isnull().sum())
        
        schema.append(col_data)
    
    return schema

def get_profiling_data(df):
    profile = {
        'row_count': len(df),
        'column_count': len(df.columns),
        'columns': {}
    }
    
    for col in df.columns:
        col_profile = {}
        
        # Data type
        dtype = df[col].dtype
        if pd.api.types.is_integer_dtype(dtype):
            col_profile['type'] = 'INTEGER'
        elif pd.api.types.is_float_dtype(dtype):
            col_profile['type'] = 'FLOAT'
        elif pd.api.types.is_datetime64_dtype(dtype):
            col_profile['type'] = 'TIMESTAMP'
        else:
            col_profile['type'] = 'VARCHAR'
        
        # Completeness
        total_rows = len(df)
        non_null_count = df[col].count()
        col_profile['completeness'] = round((non_null_count / total_rows) * 100, 1) if total_rows > 0 else 100
        
        # Uniqueness
        unique_count = df[col].nunique()
        col_profile['uniqueness'] = round((unique_count / total_rows) * 100, 1) if total_rows > 0 else 100
        
        # Min/Max for numeric and date columns
        if col_profile['type'] in ['INTEGER', 'FLOAT', 'TIMESTAMP']:
            col_profile['min'] = str(df[col].min()) if not df[col].isnull().all() else None
            col_profile['max'] = str(df[col].max()) if not df[col].isnull().all() else None
        else:
            # For string columns, get most frequent values
            if not df[col].isnull().all():
                value_counts = df[col].value_counts().head(5).to_dict()
                col_profile['top_values'] = {str(k): int(v) for k, v in value_counts.items()}
        
        profile['columns'][col] = col_profile
    
    return profile

# Routes
@app.route('/api/datasets', methods=['GET'])
def get_datasets():
    with sqlite3.connect(DATABASE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM datasets ORDER BY uploaded_at DESC')
        datasets = [dict(row) for row in cursor.fetchall()]
    
    return jsonify(datasets)

@app.route('/api/datasets/import', methods=['POST'])
def import_dataset():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        dataset_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_FOLDER, f"{dataset_id}_{filename}")
        
        # Save the file
        file.save(file_path)
        
        # Get file size
        size = os.path.getsize(file_path)
        
        # Determine file type and load data
        file_ext = filename.rsplit('.', 1)[1].lower()
        
        try:
            if file_ext == 'csv':
                df = pd.read_csv(file_path)
            elif file_ext == 'json':
                df = pd.read_json(file_path)
            elif file_ext in ['xlsx', 'xls']:
                df = pd.read_excel(file_path)
            
            # Infer schema
            schema = infer_schema(df)
            
            # Get profiling data
            profile = get_profiling_data(df)
            
            # Save dataset info in database
            with sqlite3.connect(DATABASE) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO datasets (id, name, file_path, file_type, size, uploaded_at, schema) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    (dataset_id, filename, file_path, file_ext.upper(), size, datetime.now().isoformat(), json.dumps(schema))
                )
                
                # Save column info
                for col_info in schema:
                    col_id = str(uuid.uuid4())
                    cursor.execute(
                        '''INSERT INTO columns (id, dataset_id, name, data_type, nullable, unique_values, 
                           min_value, max_value, avg_value, missing_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                        (col_id, dataset_id, col_info['name'], col_info['data_type'], col_info['nullable'], 
                         col_info['unique_values'], col_info['min_value'], col_info['max_value'], 
                         col_info['avg_value'], col_info['missing_count'])
                    )
                
                conn.commit()
            
            return jsonify({
                'id': dataset_id,
                'name': filename,
                'type': file_ext.upper(),
                'size': size,
                'uploaded_at': datetime.now().isoformat(),
                'row_count': len(df),
                'column_count': len(df.columns)
            })
            
        except Exception as e:
            # Clean up the file if processing fails
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({'error': str(e)}), 500
    
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/api/datasets/<dataset_id>', methods=['GET'])
def get_dataset(dataset_id):
    with sqlite3.connect(DATABASE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get dataset
        cursor.execute('SELECT * FROM datasets WHERE id = ?', (dataset_id,))
        dataset = cursor.fetchone()
        
        if not dataset:
            return jsonify({'error': 'Dataset not found'}), 404
        
        dataset_dict = dict(dataset)
        
        # Get columns
        cursor.execute('SELECT * FROM columns WHERE dataset_id = ?', (dataset_id,))
        columns = [dict(row) for row in cursor.fetchall()]
        
        dataset_dict['columns'] = columns
    
    return jsonify(dataset_dict)

@app.route('/api/datasets/<dataset_id>/profile', methods=['GET'])
def get_dataset_profile(dataset_id):
    with sqlite3.connect(DATABASE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get dataset
        cursor.execute('SELECT * FROM datasets WHERE id = ?', (dataset_id,))
        dataset = cursor.fetchone()
        
        if not dataset:
            return jsonify({'error': 'Dataset not found'}), 404
        
        dataset_dict = dict(dataset)
        file_path = dataset_dict['file_path']
        file_ext = Path(file_path).suffix[1:].lower()
    
    try:
        # Load the data
        if file_ext == 'csv':
            df = pd.read_csv(file_path)
        elif file_ext == 'json':
            df = pd.read_json(file_path)
        elif file_ext in ['xlsx', 'xls']:
            df = pd.read_excel(file_path)
        
        # Generate profile
        profile = get_profiling_data(df)
        
        return jsonify(profile)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/datasets/<dataset_id>', methods=['DELETE'])
def delete_dataset(dataset_id):
    with sqlite3.connect(DATABASE) as conn:
        cursor = conn.cursor()
        
        # Get file path
        cursor.execute('SELECT file_path FROM datasets WHERE id = ?', (dataset_id,))
        result = cursor.fetchone()
        
        if not result:
            return jsonify({'error': 'Dataset not found'}), 404
        
        file_path = result[0]
        
        # Delete from database
        cursor.execute('DELETE FROM columns WHERE dataset_id = ?', (dataset_id,))
        cursor.execute('DELETE FROM datasets WHERE id = ?', (dataset_id,))
        conn.commit()
    
    # Delete file
    if os.path.exists(file_path):
        os.remove(file_path)
    
    return jsonify({'success': True})

@app.route('/api/datasets/<dataset_id>/preview', methods=['GET'])
def preview_dataset(dataset_id):
    with sqlite3.connect(DATABASE) as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get dataset
        cursor.execute('SELECT * FROM datasets WHERE id = ?', (dataset_id,))
        dataset = cursor.fetchone()
        
        if not dataset:
            return jsonify({'error': 'Dataset not found'}), 404
        
        dataset_dict = dict(dataset)
        file_path = dataset_dict['file_path']
        file_ext = Path(file_path).suffix[1:].lower()
    
    try:
        # Load just the first 100 rows
        if file_ext == 'csv':
            df = pd.read_csv(file_path, nrows=100)
        elif file_ext == 'json':
            df = pd.read_json(file_path)
            if len(df) > 100:
                df = df.head(100)
        elif file_ext in ['xlsx', 'xls']:
            df = pd.read_excel(file_path, nrows=100)
        
        # Convert to JSON-compatible format
        return jsonify({
            'columns': list(df.columns),
            'rows': df.replace({np.nan: None}).to_dict('records')
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)