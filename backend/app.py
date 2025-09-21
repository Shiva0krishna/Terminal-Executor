from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os
from dotenv import load_dotenv
from gemini_service import GeminiService
from command_executor import CommandExecutor

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize services
gemini_service = GeminiService()
command_executor = CommandExecutor()

@app.route('/execute', methods=['POST'])
def execute_command():
    """Execute a direct terminal command"""
    try:
        # Get the command from JSON request
        data = request.get_json()
        if not data or 'cmd' not in data:
            return jsonify({'error': 'No command provided'}), 400
        
        command = data['cmd'].strip()
        if not command:
            return jsonify({'error': 'Empty command'}), 400
        
        # Execute the command
        result = command_executor.execute_command(command)
        
        return jsonify({
            'command': result['command'],
            'return_code': result['return_code'],
            'output': result['output'],
            'error': result['error'],
            'success': result['success'],
            'mode': 'manual'
        })
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/natural-language', methods=['POST'])
def process_natural_language():
    """Process natural language query and execute the converted command"""
    try:
        # Get the natural language query from JSON request
        data = request.get_json()
        if not data or 'query' not in data:
            return jsonify({'error': 'No query provided'}), 400
        
        query = data['query'].strip()
        if not query:
            return jsonify({'error': 'Empty query'}), 400
        
        print(f"Processing natural language query: {query}")
        
        # Convert natural language to command using Gemini
        converted_command, error = gemini_service.convert_natural_language_to_command(query)
        
        if error:
            return jsonify({
                'error': error,
                'original_query': query,
                'mode': 'natural_language'
            }), 400
        
        if not converted_command:
            return jsonify({
                'error': 'Could not convert query to command',
                'original_query': query,
                'mode': 'natural_language'
            }), 400
        
        print(f"Converted to command: {converted_command}")
        
        # Execute the converted command
        result = command_executor.execute_command(converted_command)
        
        return jsonify({
            'original_query': query,
            'converted_command': converted_command,
            'command': result['command'],
            'return_code': result['return_code'],
            'output': result['output'],
            'error': result['error'],
            'success': result['success'],
            'mode': 'natural_language'
        })
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'python_version': sys.version,
        'working_directory': os.getcwd(),
        'gemini_configured': gemini_service.is_configured,
        'services': {
            'gemini': 'configured' if gemini_service.is_configured else 'not_configured',
            'command_executor': 'ready'
        }
    })

if __name__ == '__main__':
    print("Starting Enhanced Terminal Backend Server...")
    print("Server will run on http://localhost:5000")
    print("Features:")
    print("  - Natural language processing with Gemini AI")
    print("  - Direct command execution")
    print("  - Modular architecture")
    print("Endpoints:")
    print("  POST /execute - Execute direct commands")
    print("  POST /natural-language - Process natural language queries")
    print("  GET /health - Health check")
    
    if not gemini_service.is_configured:
        print("\nWarning: GEMINI_API_KEY not configured. Natural language processing will be disabled.")
    else:
        print("\n✅ Gemini AI configured and ready!")
    
    app.run(debug=True, host='0.0.0.0', port=5000)