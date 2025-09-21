import os
import requests
import json
import re
from typing import Tuple, Optional

class GeminiService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        self.headers = {
            "Content-Type": "application/json",
            "X-goog-api-key": self.api_key
        }
        self.is_configured = self.api_key is not None
    
    def convert_natural_language_to_command(self, text: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Convert natural language to terminal command using Gemini API.
        Returns (command, error_message)
        """
        if not self.is_configured:
            return None, "Gemini API is not configured. Please set GEMINI_API_KEY in environment variables."
        
        try:
            prompt = self._build_prompt(text)
            payload = {
                "contents": [
                    {
                        "parts": [
                            {
                                "text": prompt
                            }
                        ]
                    }
                ]
            }
            
            response = requests.post(self.url, headers=self.headers, json=payload, timeout=10)
            
            if response.status_code != 200:
                return None, f"Gemini API error: {response.status_code} - {response.text}"
            
            result = response.json()
            
            if 'candidates' not in result or not result['candidates']:
                return None, "No response from Gemini API"
            
            command_text = result['candidates'][0]['content']['parts'][0]['text']
            command = self._clean_command_response(command_text)
            
            # Safety check
            if self._is_dangerous_command(command):
                return None, "Command rejected for safety reasons."
            
            return command, None
            
        except requests.exceptions.Timeout:
            return None, "Gemini API request timed out"
        except requests.exceptions.RequestException as e:
            return None, f"Network error: {str(e)}"
        except Exception as e:
            return None, f"Error converting natural language: {str(e)}"
    
    def _build_prompt(self, text: str) -> str:
        """Build the prompt for Gemini API"""
        return f"""
Convert the following natural language request into a single, appropriate terminal/shell command. 
Only respond with the command itself, no explanations or additional text.

Examples:
- "show me all files in current directory" -> "ls -la"
- "what's my current location" -> "pwd"
- "create a new folder called test" -> "mkdir test"
- "show running processes" -> "ps aux"
- "check disk usage" -> "df -h"
- "find all python files" -> "find . -name "*.py""
- "show current date and time" -> "date"
- "show system information" -> "uname -a"
- "list all directories" -> "ls -d */"
- "show file contents of readme.txt" -> "cat readme.txt"

Request: {text}

Command:"""
    
    def _clean_command_response(self, command_text: str) -> str:
        """Clean up the Gemini response"""
        # Remove any markdown formatting or extra text
        command = re.sub(r'^```.*?\n', '', command_text)
        command = re.sub(r'\n```$', '', command_text)
        command = command.strip()
        
        # Remove any explanatory text (take only the first line if multiple lines)
        command = command.split('\n')[0].strip()
        
        return command
    
    def _is_dangerous_command(self, command: str) -> bool:
        """Check if command is potentially dangerous"""
        dangerous_patterns = [
            r'\brm\s+-rf\s+/',
            r'\bformat\b',
            r'\bdel\s+/[sq]',
            r'>\s*/dev/sd[a-z]',
            r'\bdd\s+if=.*of=/dev/',
            r'\bshutdown\b',
            r'\breboot\b',
            r'\bhalt\b',
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, command, re.IGNORECASE):
                return True
        
        return False