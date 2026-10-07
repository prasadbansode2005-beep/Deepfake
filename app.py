import os
import json
import random
import hashlib
import secrets
import sqlite3
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import logging

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'mp4', 'mov', 'avi', 'mkv', 'wav', 'mp3', 'm4a'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
AUTH_DB = os.path.join(os.path.dirname(__file__), 'trustai_auth.db')
auth_lock = threading.Lock()


def init_auth_db():
    with sqlite3.connect(AUTH_DB) as connection:
        connection.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL
            )
        ''')


def hash_password(password):
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def user_payload(user):
    return {
        'id': user[0],
        'fullName': user[1],
        'email': user[2],
        'username': user[3],
        'role': 'USER'
    }


init_auth_db()


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/auth/register', methods=['POST'])
def register_user():
    data = request.get_json(silent=True) or {}
    full_name = data.get('fullName', '').strip()
    email = data.get('email', '').strip().lower()
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not full_name or not email or not username or len(password) < 8:
        return jsonify({'success': False, 'message': 'All fields are required and password must be at least 8 characters'}), 400

    try:
        with auth_lock, sqlite3.connect(AUTH_DB) as connection:
            connection.execute(
                'INSERT INTO users (full_name, email, username, password_hash) VALUES (?, ?, ?, ?)',
                (full_name, email, username, hash_password(password))
            )
        return jsonify({'success': True, 'message': 'Registration successful'}), 201
    except sqlite3.IntegrityError:
        return jsonify({'success': False, 'message': 'Email or username already exists'}), 409


@app.route('/api/auth/login', methods=['POST'])
def login_user():
    data = request.get_json(silent=True) or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    with sqlite3.connect(AUTH_DB) as connection:
        user = connection.execute(
            'SELECT id, full_name, email, username FROM users WHERE email = ? AND password_hash = ?',
            (email, hash_password(password))
        ).fetchone()

    if not user:
        return jsonify({'success': False, 'message': 'Invalid email or password'}), 401

    return jsonify({
        'success': True,
        'data': {
            'token': secrets.token_urlsafe(32),
            'user': user_payload(user)
        }
    }), 200


def generate_demo_analysis():
    """
    Generate demo analysis results for testing.
    In production, this would be replaced with actual ML model inference.
    """
    fake_probability = round(random.uniform(0, 100), 2)
    authenticity_score = round(100 - fake_probability * 0.8, 2)
    
    return {
        'fakeProbability': fake_probability,
        'authenticityScore': authenticity_score,
        'analysis': {
            'faceManipulation': round(random.uniform(20, 95), 2),
            'lightingConsistency': round(random.uniform(40, 100), 2),
            'textureAnalysis': round(random.uniform(30, 90), 2),
            'audioVideoSync': round(random.uniform(50, 100), 2),
        },
        'trust': {
            'sourceReliability': round(random.uniform(30, 90), 2),
            'manipulationRisk': round(random.uniform(10, 80), 2),
            'metadataIntegrity': round(random.uniform(40, 100), 2),
            'aiConfidence': round(random.uniform(60, 98), 2),
        }
    }


@app.route('/api/analyze', methods=['POST'])
def analyze_file():
    """
    Main analysis endpoint.
    Receives file upload and returns deepfake analysis results.
    """
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No file provided'
            }), 400

        file = request.files['file']

        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400

        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'message': 'File type not supported'
            }), 400

        # Save file
        filename = secure_filename(file.filename)
        import uuid
        filename = str(uuid.uuid4()) + '_' + filename
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)

        logger.info(f"File received: {filename}")

        # Generate analysis (DEMO MODE)
        analysis_result = generate_demo_analysis()

        # Add metadata
        analysis_result['success'] = True
        analysis_result['message'] = 'Analysis completed'
        analysis_result['fileName'] = file.filename
        analysis_result['fileSize'] = os.path.getsize(filepath)

        logger.info(f"Analysis completed for {filename}")

        return jsonify(analysis_result), 200

    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Analysis error: {str(e)}'
        }), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'service': 'TrustAI Flask AI Service',
        'version': '1.0.0'
    }), 200


@app.route('/', methods=['GET'])
def index():
    """Welcome endpoint."""
    return jsonify({
        'message': 'TrustAI Flask AI Service',
        'version': '1.0.0',
        'endpoints': {
            'health': '/api/health',
            'analyze': '/api/analyze (POST)'
        }
    }), 200


if __name__ == '__main__':
    app.run(host='localhost', port=5000, debug=True)
