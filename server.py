import os
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# Load Whisper model
print("Loading Whisper model...")
model = whisper.load_model("tiny")  # Using tiny model for faster loading
print("Whisper model loaded successfully!")

# Configure upload folder
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Allowed file extensions
ALLOWED_EXTENSIONS = {'wav', 'mp3', 'mp4', 'm4a', 'ogg', 'flac', 'webm'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return jsonify({"message": "Audio Transcription Server", "status": "running"})

@app.route('/upload', methods=['POST'])
def upload_file():
    """Upload audio file endpoint (for backward compatibility)"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        return jsonify({'message': 'File uploaded successfully', 'filename': filename}), 200
    
    return jsonify({'error': 'File type not allowed'}), 400

@app.route('/transcribe/file', methods=['POST'])
def transcribe_file():
    """Transcribe audio file endpoint"""
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if not file or not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400
    
    try:
        # Create a temporary file to save the uploaded audio
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            file.save(temp_file.name)
            
            # Transcribe the audio using Whisper
            print(f"Transcribing audio file: {file.filename}")
            result = model.transcribe(temp_file.name)
            
            # Clean up the temporary file
            os.unlink(temp_file.name)
            
            # Return the transcription
            return jsonify({
                'transcription': result['text'],
                'language': result.get('language', 'unknown'),
                'filename': file.filename,
                'status': 'success'
            }), 200
            
    except Exception as e:
        # Clean up temp file if it exists
        if 'temp_file' in locals():
            try:
                os.unlink(temp_file.name)
            except:
                pass
        
        print(f"Transcription error: {str(e)}")
        return jsonify({'error': f'Transcription failed: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'whisper_model': 'base'}), 200

if __name__ == '__main__':
    print("Starting Audio Transcription Server...")
    app.run(debug=True, host='0.0.0.0', port=5000)