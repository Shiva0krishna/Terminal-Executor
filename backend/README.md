# AI-Enhanced Terminal Backend

A Flask backend that executes terminal commands with natural language processing using Google's Gemini AI.

## Features

- Execute terminal commands via HTTP API
- Natural language to command conversion using Gemini AI
- Command safety checks
- Session management
- Health monitoring

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Create a `.env` file and add your Gemini API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Run the server:
   ```bash
   python app.py
   ```

The server will start on http://localhost:5000

## API Endpoints

### POST /execute
Execute a terminal command (supports natural language).

**Request:**
```json
{
  "cmd": "show me all files in current directory"
}
```

**Response:**
```json
{
  "command": "ls -la",
  "original_input": "show me all files in current directory",
  "is_ai_converted": true,
  "return_code": 0,
  "output": "total 8\ndrwxr-xr-x  3 user user 4096 Jan  1 12:00 .\ndrwxr-xr-x  3 user user 4096 Jan  1 12:00 ..",
  "error": ""
}
```

### GET /health
Health check endpoint with configuration status.

**Response:**
```json
{
  "status": "healthy",
  "python_version": "3.9.0",
  "working_directory": "/path/to/current/directory",
  "gemini_configured": true
}
```

## Natural Language Examples

- "show me all files" → `ls -la`
- "what's my current location" → `pwd`
- "create a folder called test" → `mkdir test`
- "find all python files" → `find . -name "*.py"`
- "show running processes" → `ps aux`

## Security

- Commands are analyzed for safety before execution
- Dangerous operations are blocked
- 30-second timeout for command execution
- Designed for local development only

## Environment Variables

- `GEMINI_API_KEY`: Your Google Gemini API key for natural language processing