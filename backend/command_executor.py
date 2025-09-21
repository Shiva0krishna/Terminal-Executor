import subprocess
import os
from typing import Dict, Any

class CommandExecutor:
    def __init__(self):
        self.timeout = 30  # 30 second timeout
    
    def execute_command(self, command: str) -> Dict[str, Any]:
        """
        Execute a terminal command and return the result.
        Returns a dictionary with execution details.
        """
        try:
            print(f"Executing command: {command}")
            
            # Execute the command
            result = subprocess.run(
                command, 
                shell=True, 
                capture_output=True, 
                text=True, 
                timeout=self.timeout,
                cwd=os.getcwd()
            )
            
            # Prepare response
            response_data = {
                'command': command,
                'return_code': result.returncode,
                'output': result.stdout if result.stdout else '',
                'error': result.stderr if result.stderr else '',
                'success': result.returncode == 0
            }
            
            # If there's an error (non-zero return code), include it
            if result.returncode != 0:
                if result.stderr:
                    response_data['output'] = result.stderr
                    response_data['error'] = f"Command failed with return code {result.returncode}"
                else:
                    response_data['output'] = f"Command failed with return code {result.returncode}"
            
            return response_data
            
        except subprocess.TimeoutExpired:
            return {
                'command': command,
                'return_code': -1,
                'output': f'Command timed out ({self.timeout} seconds)',
                'error': 'Timeout',
                'success': False
            }
        
        except Exception as e:
            return {
                'command': command,
                'return_code': -1,
                'output': f'Failed to execute command: {str(e)}',
                'error': str(e),
                'success': False
            }