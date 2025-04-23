"""
Flask Backend with External Vulnerability Scanning Support
Integrates the external vulnerability scanning functionality into the existing Flask app.
"""

from flask import Flask, jsonify, request, session, Response
from flask_cors import CORS
import requests
import urllib3
import logging
import time
import json
import io
from functools import wraps
from datetime import datetime, timedelta
import os
import subprocess
from database.sql_server_config import execute_query
import pyodbc

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

app = Flask(__name__)
app.secret_key = '327bea025b52ca7341eea640990d593b94fe26842c27b7b4cf39a22befe248f9'  # Change this to a secure secret key

# Configure CORS properly for all routes and methods
CORS(app, 
     supports_credentials=True,
     resources={
         r"/api/*": {
             "origins": ["http://localhost:5173"],  # Your React app's URL
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
             "allow_headers": ["Content-Type", "Authorization", "X-Cookie"],
             "expose_headers": ["Content-Type", "Authorization"],
             "supports_credentials": True
         }
     })

# =============================================================================
# CONFIGURATION
# =============================================================================

# Nessus API Configuration
NESSUS_URL = 'https://isosrvutn00.utep.edu:8834'
TEMPLATE_UUID = 'e785b26c-5b4d-5da8-6643-007ea1f8ee1c8f23937a4bd45a1d'
POLICY_ID = '26729'
EXTERNAL_TEMPLATE_UUID = 'ad629e16-03b6-8c1d-cef6-ef8c9dd3c658d24bd260ef5f9e66'
EXTERNAL_POLICY_ID = '67766'
REPORT_TEMPLATE_ID = '2493'

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')

# =============================================================================
# DATABASE INTEGRATION 
# =============================================================================

# Function to execute Node.js scripts that interact with Prisma
def execute_prisma_script(script_type, data=None):
    """
    Execute a Node.js script to interact with Prisma
    
    Args:
        script_type (str): Type of script to execute (e.g., 'create', 'get-all')
        data (dict, optional): Data to pass to the script. Defaults to None.
    
    Returns:
        dict: Response from the script
    """
    try:
        if data:
            input_data = json.dumps(data)
            result = subprocess.run(
                ['node', f'database/{script_type}.js'], 
                input=input_data, 
                text=True, 
                capture_output=True
            )
        else:
            result = subprocess.run(
                ['node', f'database/{script_type}.js'], 
                text=True, 
                capture_output=True
            )
        
        if result.returncode != 0:
            logging.error(f"Database script error: {result.stderr}")
            return {"error": "Database operation failed"}
        
        return json.loads(result.stdout)
    except Exception as e:
        logging.error(f"Error executing database script: {str(e)}")
        return {"error": str(e)}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def login_required(f):
    """
    Decorator to ensure user is authenticated before accessing endpoint
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'token' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

def get_headers():
    """
    Returns standard headers with authentication token for Nessus API requests
    """
    return {
        'X-Cookie': f'token={session["token"]}',
        'Content-Type': 'application/json'
    }

def format_timestamp(timestamp):
    """Convert Unix timestamp to readable format"""
    try:
        if not timestamp:
            return "N/A"
        return datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d %H:%M:%S')
    except:
        return "N/A"

def get_scan_details(nessus_url, token, scan_id):
    """Get detailed information about a specific scan"""
    try:
        headers = {'X-Cookie': f'token={token}'}
        response = requests.get(
            f'{nessus_url}/scans/{scan_id}',
            headers=headers,
            verify=False
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"Error getting scan details: {e}")
        return None

def get_host_vulnerabilities(nessus_url, token, scan_id, host_id, history_id=None):
    """Get vulnerability details for a specific host in a scan"""
    try:
        headers = {'X-Cookie': f'token={token}'}
        url = f'{nessus_url}/scans/{scan_id}/hosts/{host_id}'
        
        if history_id:
            url += f'?history_id={history_id}'
            
        response = requests.get(url, headers=headers, verify=False)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"Error getting host vulnerabilities: {e}")
        return None

def get_plugin_details(nessus_url, token, scan_id, host_id, plugin_id, history_id=None):
    """Get detailed information about a specific vulnerability plugin"""
    try:
        headers = {'X-Cookie': f'token={token}'}
        url = f'{nessus_url}/scans/{scan_id}/hosts/{host_id}/plugins/{plugin_id}'
        
        if history_id:
            url += f'?history_id={history_id}'
            
        response = requests.get(url, headers=headers, verify=False)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logging.error(f"Error getting plugin details for plugin {plugin_id}: {e}")
        return None

# =============================================================================
# AUTHENTICATION ROUTES
# =============================================================================
@app.route('/api/auth/login', methods=['POST'])
def login():
    """
    Authenticate with Nessus Manager and establish session
    """
    try:
        data = request.json
        username = data.get('username')
        password = data.get('password')

        # Authenticate with Nessus Manager
        auth_data = {'username': username, 'password': password}
        auth_response = requests.post(
            f'{NESSUS_URL}/session',
            json=auth_data,
            verify=False
        )
        auth_response.raise_for_status()
        
        # Store token in session (Keep this as it was before)
        token = auth_response.json()['token']
        session['token'] = token
        session['username'] = username
        
        # Check if user is admin (belongs to group with ID 4)
        is_admin = False
        
        # Get user session info which contains group membership
        try:
            user_info_response = requests.get(
                f'{NESSUS_URL}/session',
                headers={'X-Cookie': f'token={token}', 'Content-Type': 'application/json'},
                verify=False
            )
            
            if user_info_response.status_code == 200:
                user_info = user_info_response.json()
                
                # Check if user is in the DashboardAdmins group (ID 4)
                if 'groups' in user_info:
                    # Only store the minimal information needed
                    is_admin = any(group.get('id') == 4 for group in user_info.get('groups', []))
                    logging.info(f"User '{username}' is admin: {is_admin}")
            
            # Store only the admin status, not the entire group data
            session['is_admin'] = is_admin
            
        except Exception as e:
            logging.error(f"Error checking admin status: {str(e)}")
            # If there's an error, don't disrupt the login flow
        
        return jsonify({
            'message': 'Login successful', 
            'is_admin': is_admin
        })
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 401

@app.route('/api/auth/current-user', methods=['GET'])
@login_required
def get_current_user():
    """
    Get the current user's username from the session
    """
    try:
        username = session.get('username')
        if not username:
            return jsonify({
                'success': False,
                'message': 'No user found in session'
            }), 401
            
        return jsonify({
            'success': True,
            'username': username
        }), 200
        
    except Exception as e:
        logging.error(f"Error getting current user: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error getting current user: {str(e)}'
        }), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """
    Clear user session
    """
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

# =============================================================================
# AGENT AND GROUP MANAGEMENT ROUTES
# =============================================================================

@app.route('/api/agent-groups', methods=['GET'])
@login_required
def get_agent_groups():
    """
    Retrieve agent groups filtered by current user
    """
    try:
        response = requests.get(
            f'{NESSUS_URL}/agent-groups',
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        
        # Find the group with the same name as the username
        groups = response.json().get('groups', [])
        user_group = next(
            (group for group in groups if group['name'] == session['username']),
            None
        )
        
        return jsonify(user_group)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/agent-groups/<int:group_id>', methods=['GET'])
@login_required
def get_group_details(group_id):
    try:
        response = requests.get(
            f'{NESSUS_URL}/agent-groups/{group_id}',
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/agent-groups/<int:group_id>/agents/<int:agent_id>', methods=['DELETE'])
@login_required
def remove_agent(group_id, agent_id):
    try:
        # Get the user's token from session
        token = session.get('token')
        if not token:
            return jsonify({'error': 'No valid session'}), 401

        # Make the delete request to Nessus
        headers = {'X-Cookie': f'token={token}'}
        response = requests.delete(
            f'{NESSUS_URL}/agent-groups/{group_id}/agents/{agent_id}',
            headers=headers,
            verify=False
        )
        
        response.raise_for_status()
        return jsonify({'message': 'Agent removed successfully'})
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =============================================================================
# SCAN MANAGEMENT ROUTES
# =============================================================================

@app.route('/api/folders/my-scans', methods=['GET'])
@login_required
def get_my_scans_folder():
    """
    Retrieve 'My Scans' folder ID
    """
    try:
        response = requests.get(
            f'{NESSUS_URL}/folders',
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        folders = response.json().get('folders', [])
        
        for folder in folders:
            if folder['name'] == "My Scans":
                return jsonify(folder)
        
        return jsonify({'error': 'My Scans folder not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scans/check-existing', methods=['GET'])
@login_required
def check_existing_scan():
    try:
        agent_name = request.args.get('agent_name')
        folder_id = request.args.get('folder_id')
        
        if not agent_name or not folder_id:
            return jsonify({'error': 'Missing required parameters'}), 400

        # Get scans from folder
        response = requests.get(
            f'{NESSUS_URL}/scans',
            params={'folder_id': folder_id},
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        
        scans = response.json().get('scans', [])
        if scans is None:
            scans = []  # Ensure scans is always a list
            
        # Look for matching scan
        existing_scan = None
        for scan in scans:
            if scan['name'].lower() == agent_name.lower():
                existing_scan = scan
                break
                
        return jsonify({
            'exists': existing_scan is not None,
            'scan': existing_scan
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/agent-groups/create', methods=['POST'])
@login_required
def create_agent_group():
    try:
        data = request.json
        group_name = data.get('group_name')
        
        # Check if group exists
        response = requests.get(
            f'{NESSUS_URL}/agent-groups',
            headers=get_headers(),
            verify=False
        )
        groups = response.json().get('groups', [])
        
        existing_group = next(
            (group for group in groups if group['name'].lower() == group_name.lower()),
            None
        )
        
        if existing_group:
            return jsonify(existing_group)
            
        # Create new group
        group_data = {
            "name": group_name,
            "description": f"Agent group for {group_name}"
        }
        
        response = requests.post(
            f'{NESSUS_URL}/agent-groups',
            headers=get_headers(),
            json=group_data,
            verify=False
        )
        response.raise_for_status()
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scans/create', methods=['POST'])
@login_required
def create_scan():
    try:
        data = request.json
        
        # Ensure proper formatting of URL
        scan_url = f'{NESSUS_URL.rstrip("/")}/scans'
        
        # Set up headers properly
        headers = {
            'X-Cookie': f'token={session["token"]}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        
        # Create scan data payload
        scan_data = {
            "uuid": TEMPLATE_UUID,
            "settings": {
                "name": data['server_name'],
                "description": f"{session.get('username', 'user')} created scan for {data['server_name']}",
                "emails": "",
                "enabled": True,
                "launch": "ON_DEMAND",
                "folder_id": int(data['folder_id']),
                "policy_id": POLICY_ID,
                "scanner_id": 1,
                "text_targets": data['server_name'],
                "agent_group_id": [int(data['agent_group_id'])]
            }
        }
        
        response = requests.post(
            scan_url,
            headers=headers,
            json=scan_data,
            verify=False
        )
        
        response.raise_for_status()
        return jsonify(response.json())
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Error creating scan: {str(e)}"
        if hasattr(e, 'response'):
            error_msg += f"\nResponse: {e.response.text}"
        return jsonify({'error': error_msg}), 500
    except Exception as e:
        error_msg = f"Unexpected error creating scan: {str(e)}"
        return jsonify({'error': error_msg}), 500

@app.route('/api/scans/<int:scan_id>/launch', methods=['POST'])
@login_required
def launch_scan(scan_id):
    try:
        response = requests.post(
            f'{NESSUS_URL}/scans/{scan_id}/launch',
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        return jsonify({'message': 'Scan launched successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =============================================================================
# SCAN STATUS ROUTES
# =============================================================================

@app.route('/api/scans/status/<int:scan_id>', methods=['GET'])
@login_required
def get_scan_status(scan_id):
    """
    Get the current status of a scan, including progress information
    """
    try:
        response = requests.get(
            f'{NESSUS_URL}/scans/{scan_id}',
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        scan_details = response.json()
        
        # Get detailed status information
        info = scan_details.get('info', {})
        status = info.get('status')
        
        # Map status more accurately
        if status == 'running':
            progress = info.get('progress', 0)
            if progress == 0:
                status = 'pending'
        
        status_info = {
            'status': status,
            'progress': info.get('progress', 0),
            'timestamp': info.get('timestamp'),
            'raw_status': info  # Include raw status for debugging
        }
        
        return jsonify(status_info)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scans/find/<server_name>', methods=['GET'])
@login_required
def find_scan(server_name):
    try:
        response = requests.get(
            f'{NESSUS_URL}/scans',
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        scans = response.json().get('scans', [])
        
        scan = next(
            (scan for scan in scans if server_name.lower() in scan['name'].lower()),
            None
        )
        
        if scan:
            return jsonify(scan)
        return jsonify({'error': 'Scan not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =============================================================================
# REPORT GENERATION ROUTES
# =============================================================================

@app.route('/api/scan/report/<server_name>', methods=['GET'])
@login_required
def download_report(server_name):
    """
    Generate and download a PDF report for a completed scan
    """
    try:
        # Find scan for the server
        scans_response = requests.get(
            f'{NESSUS_URL}/scans',
            headers=get_headers(),
            verify=False
        )
        scans_response.raise_for_status()
        scans = scans_response.json().get('scans', [])
        
        scan = None
        for s in scans:
            if server_name.lower() in s['name'].lower():
                scan = s
                break
        
        if not scan:
            return jsonify({'error': 'Scan not found'}), 404
        
        scan_id = scan['id']
        
        # Prepare export request
        export_data = {
            'format': 'pdf',
            'template_id': REPORT_TEMPLATE_ID,
            'chapters': 'vuln_hosts_summary'
        }
        
        # Initiate report download
        export_response = requests.post(
            f'{NESSUS_URL}/scans/{scan_id}/export',
            headers=get_headers(),
            json=export_data,
            verify=False
        )
        export_response.raise_for_status()
        file_id = export_response.json()['file']
        
        # Check status until ready
        while True:
            status_response = requests.get(
                f'{NESSUS_URL}/scans/{scan_id}/export/{file_id}/status',
                headers=get_headers(),
                verify=False
            )
            status_response.raise_for_status()
            status = status_response.json()
            
            if status.get('status') == 'ready':
                break
            elif status.get('status') == 'error':
                return jsonify({'error': 'Error generating report'}), 500
                
            time.sleep(1)
        
        # Download the report
        download_response = requests.get(
            f'{NESSUS_URL}/scans/{scan_id}/export/{file_id}/download',
            headers=get_headers(),
            verify=False
        )
        download_response.raise_for_status()
        
        # Return the file as a download
        filename = f"nessus_report_{server_name}_{time.strftime('%Y%m%d_%H%M%S')}.pdf"
        return Response(
            io.BytesIO(download_response.content),
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename={filename}'
            }
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =============================================================================
# EXTERNAL SCANNING ROUTES
# =============================================================================

@app.route('/api/external-scans/folder', methods=['GET'])
@login_required
def get_external_scans_folder():
    """
    Retrieve or create the 'ExternalScans' folder
    """
    try:
        # Get folders
        response = requests.get(
            f'{NESSUS_URL}/folders',
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        folders = response.json().get('folders', [])
        
        # Look for ExternalScans folder
        for folder in folders:
            if folder['name'] == 'ExternalScans':
                return jsonify(folder)
        
        # Also check for 'External Scans' folder (with space)
        for folder in folders:
            if folder['name'] == 'External Scans':
                return jsonify(folder)
        
        # Create folder if it doesn't exist
        create_folder_data = {'name': 'ExternalScans'}
        create_response = requests.post(
            f'{NESSUS_URL}/folders',
            headers=get_headers(),
            json=create_folder_data,
            verify=False
        )
        create_response.raise_for_status()
        return jsonify(create_response.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/external-scans/create', methods=['POST'])
@login_required
def create_external_scan():
    try:
        data = request.json
        server_name = data.get('server_name')
        folder_id = data.get('folder_id')
        
        if not server_name or not folder_id:
            return jsonify({'error': 'Missing required parameters'}), 400
        
        # Create external scan
        scan_data = {
            "uuid": EXTERNAL_TEMPLATE_UUID,
            "settings": {
                "name": server_name,
                "description": f"{session.get('username', 'user')} created vulnerability scan for {server_name}",
                "enabled": True,
                "launch": "ON_DEMAND",
                "folder_id": int(folder_id),
                "policy_id": EXTERNAL_POLICY_ID,
                "scanner_id": 1,
                "text_targets": server_name,
                "type": "vulnerability"
            }
        }
        
        response = requests.post(
            f'{NESSUS_URL}/scans',
            headers=get_headers(),
            json=scan_data,
            verify=False
        )
        response.raise_for_status()
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/external-scans/check-existing', methods=['GET'])
@login_required
def check_existing_external_scan():
    try:
        server_name = request.args.get('server_name')
        folder_id = request.args.get('folder_id')
        
        if not server_name or not folder_id:
            return jsonify({'error': 'Missing required parameters'}), 400

        # Get scans from folder
        response = requests.get(
            f'{NESSUS_URL}/scans',
            params={'folder_id': folder_id},
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        
        scans = response.json().get('scans', [])
        if scans is None:
            scans = []
            
        # Look for matching scan
        existing_scan = None
        for scan in scans:
            if scan['name'].lower() == server_name.lower():
                existing_scan = scan
                break
                
        return jsonify({
            'exists': existing_scan is not None,
            'scan': existing_scan
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/external-scans', methods=['GET'])
@login_required
def list_external_scans():
    try:
        # First get the ExternalScans folder
        folders_response = requests.get(
            f'{NESSUS_URL}/folders',
            headers=get_headers(),
            verify=False
        )
        folders_response.raise_for_status()
        folders = folders_response.json().get('folders', [])
        
        folder_id = None
        for folder in folders:
            if folder['name'] == 'ExternalScans' or folder['name'] == 'External Scans':
                folder_id = folder['id']
                break
        
        if not folder_id:
            return jsonify({'scans': []})
        
        # Get all scans in the folder
        response = requests.get(
            f'{NESSUS_URL}/scans',
            params={'folder_id': folder_id},
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        scans = response.json().get('scans', [])
        
        scan_details = []
        for scan in scans:
            scan_id = scan.get('id')
            detail_response = requests.get(
                f'{NESSUS_URL}/scans/{scan_id}',
                headers=get_headers(),
                verify=False
            )
            if detail_response.status_code == 200:
                detail = detail_response.json()
                host_info = []
                if 'hosts' in detail:
                    for host in detail.get('hosts', []):
                        host_info.append({
                            'hostname': host.get('hostname', 'N/A'),
                            'ip': host.get('host-ip', host.get('hostname', 'N/A')),
                            'critical': host.get('critical', 0),
                            'high': host.get('high', 0),
                            'medium': host.get('medium', 0),
                            'low': host.get('low', 0),
                            'info': host.get('info', 0)
                        })
                
                scan_details.append({
                    'id': scan_id,
                    'name': scan.get('name', 'Unknown'),
                    'status': detail.get('info', {}).get('status', 'unknown'),
                    'start_time': detail.get('info', {}).get('scan_start', None),
                    'end_time': detail.get('info', {}).get('scan_end', None),
                    'hosts': host_info
                })
        
        return jsonify({'scans': scan_details})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/external-scans/stop/<int:scan_id>', methods=['POST'])
@login_required
def stop_external_scan(scan_id):
    try:
        response = requests.post(
            f'{NESSUS_URL}/scans/{scan_id}/stop',
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        return jsonify({'message': 'Scan stopped successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/scan/stop/<int:scan_id>', methods=['POST'])
@login_required
def stop_scan(scan_id):
    """
    Stop a running scan
    """
    try:
        response = requests.post(
            f'{NESSUS_URL}/scans/{scan_id}/stop',
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        return jsonify({'message': 'Scan stopped successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# =============================================================================
# NEW EXTERNAL SCAN VULNERABILITY ENDPOINTS
# =============================================================================

@app.route('/api/external-scan/report/<server_name>', methods=['GET'])
@login_required
def download_external_scan_report(server_name):
    """
    Generate and download a PDF report for a completed external scan
    """
    try:
        # First get the ExternalScans folder
        folders_response = requests.get(
            f'{NESSUS_URL}/folders',
            headers=get_headers(),
            verify=False
        )
        folders_response.raise_for_status()
        folders = folders_response.json().get('folders', [])
        
        folder_id = None
        for folder in folders:
            if folder['name'] == 'ExternalScans' or folder['name'] == 'External Scans':
                folder_id = folder['id']
                break
        
        if not folder_id:
            return jsonify({'error': 'External Scans folder not found'}), 404
        
        # Find the scan for the server in the external scans folder
        response = requests.get(
            f'{NESSUS_URL}/scans',
            params={'folder_id': folder_id},
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        scans = response.json().get('scans', [])
        
        scan = None
        for s in scans:
            if server_name.lower() in s['name'].lower():
                scan = s
                break
        
        if not scan:
            return jsonify({'error': f'No external scan found for {server_name}'}), 404
        
        scan_id = scan['id']
        
        logging.info(f"Preparing to generate report for external scan ID {scan_id} ({server_name})")
        
        # Prepare export request
        export_data = {
            'format': 'pdf',
            'template_id': REPORT_TEMPLATE_ID,
            'chapters': 'vuln_hosts_summary'
        }
        
        # Initiate report download
        export_response = requests.post(
            f'{NESSUS_URL}/scans/{scan_id}/export',
            headers=get_headers(),
            json=export_data,
            verify=False
        )
        export_response.raise_for_status()
        
        if 'file' not in export_response.json():
            return jsonify({'error': 'Failed to initiate report export'}), 500
            
        file_id = export_response.json()['file']
        logging.info(f"Report export initiated with file ID: {file_id}")
        
        # Check status until ready (with timeout)
        max_attempts = 30  # 30 seconds timeout
        attempts = 0
        
        while attempts < max_attempts:
            status_response = requests.get(
                f'{NESSUS_URL}/scans/{scan_id}/export/{file_id}/status',
                headers=get_headers(),
                verify=False
            )
            status_response.raise_for_status()
            status = status_response.json()
            
            if status.get('status') == 'ready':
                logging.info("Report is ready for download")
                break
            elif status.get('status') == 'error':
                return jsonify({'error': 'Error generating report'}), 500
            
            logging.debug(f"Report still generating (attempt {attempts+1}/{max_attempts})")
            attempts += 1
            time.sleep(1)
        
        if attempts >= max_attempts:
            return jsonify({'error': 'Timeout while waiting for report generation'}), 504
        
        # Download the report
        download_response = requests.get(
            f'{NESSUS_URL}/scans/{scan_id}/export/{file_id}/download',
            headers=get_headers(),
            verify=False
        )
        download_response.raise_for_status()
        
        # Return the file as a download
        filename = f"external_scan_report_{server_name}_{time.strftime('%Y%m%d_%H%M%S')}.pdf"
        
        return Response(
            io.BytesIO(download_response.content),
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename={filename}'
            }
        )
    except Exception as e:
        logging.error(f"Error downloading external scan report: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/external-scan/vulnerabilities/<server_name>', methods=['GET'])
@login_required
def get_external_scan_vulnerabilities(server_name):
    """
    Get vulnerability details for an external scan
    """
    try:
        # Get ExternalScans folder
        folders_response = requests.get(
            f'{NESSUS_URL}/folders',
            headers=get_headers(),
            verify=False
        )
        folders_response.raise_for_status()
        folders = folders_response.json().get('folders', [])
        
        # Find external scans folder
        folder_id = None
        for folder in folders:
            if folder['name'] == 'ExternalScans' or folder['name'] == 'External Scans':
                folder_id = folder['id']
                break
        
        if not folder_id:
            return jsonify({'error': 'External Scans folder not found'}), 404
        
        # Find the scan for the server
        scans_response = requests.get(
            f'{NESSUS_URL}/scans',
            params={'folder_id': folder_id},
            headers=get_headers(),
            verify=False
        )
        scans_response.raise_for_status()
        scans = scans_response.json().get('scans', [])
        
        target_scan = None
        for scan in scans:
            if server_name.lower() in scan['name'].lower():
                target_scan = scan
                break
        
        if not target_scan:
            return jsonify({'error': f'No external scan found for {server_name}'}), 404
        
        scan_id = target_scan['id']
        
        # Get detailed scan information
        scan_details_response = requests.get(
            f'{NESSUS_URL}/scans/{scan_id}',
            headers=get_headers(),
            verify=False
        )
        scan_details_response.raise_for_status()
        scan_details = scan_details_response.json()
        
        # Format scan data for response
        scan_data = {
            'id': scan_id,
            'name': target_scan.get('name'),
            'status': scan_details.get('info', {}).get('status', 'unknown'),
            'start_time': format_timestamp(scan_details.get('info', {}).get('scan_start')),
            'end_time': format_timestamp(scan_details.get('info', {}).get('scan_end')),
            'targets': scan_details.get('info', {}).get('targets', ''),
            'hosts': []
        }
        
        # Get vulnerability data for each host
        if 'hosts' in scan_details:
            for host in scan_details.get('hosts', []):
                host_id = host.get('host_id')
                if not host_id:
                    continue
                    
                # Get host vulnerabilities
                host_vuln_response = requests.get(
                    f'{NESSUS_URL}/scans/{scan_id}/hosts/{host_id}',
                    headers=get_headers(),
                    verify=False
                )
                if host_vuln_response.status_code != 200:
                    continue
                    
                host_vuln_data = host_vuln_response.json()
                
                # Format host vulnerability data
                host_data = {
                    'id': host_id,
                    'hostname': host.get('hostname', 'N/A'),
                    'ip': host.get('host-ip', host.get('hostname', 'N/A')),
                    'os': host_vuln_data.get('info', {}).get('operating-system', 'Unknown'),
                    'critical': host.get('critical', 0),
                    'high': host.get('high', 0),
                    'medium': host.get('medium', 0),
                    'low': host.get('low', 0),
                    'info': host.get('info', 0),
                    'vulnerabilities': []
                }
                
                # Add vulnerability details
                for vuln in host_vuln_data.get('vulnerabilities', []):
                    severity_levels = {4: "Critical", 3: "High", 2: "Medium", 1: "Low", 0: "Info"}
                    
                    host_data['vulnerabilities'].append({
                        'plugin_id': vuln.get('plugin_id'),
                        'plugin_name': vuln.get('plugin_name'),
                        'severity': vuln.get('severity', 0),
                        'severity_name': severity_levels.get(vuln.get('severity', 0), "Unknown"),
                        'count': vuln.get('count', 1)
                    })
                
                scan_data['hosts'].append(host_data)
        
        return jsonify(scan_data)
    except Exception as e:
        logging.error(f"Error fetching external scan vulnerabilities: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/external-scan/vulnerability-details/<int:scan_id>/<int:host_id>/<int:plugin_id>', methods=['GET'])
@login_required
def get_vulnerability_plugin_details(scan_id, host_id, plugin_id):
    """
    Get detailed information about a specific vulnerability plugin for a host
    """
    try:
        # Fetch plugin details
        plugin_response = requests.get(
            f'{NESSUS_URL}/scans/{scan_id}/hosts/{host_id}/plugins/{plugin_id}',
            headers=get_headers(),
            verify=False
        )
        plugin_response.raise_for_status()
        plugin_data = plugin_response.json()
        
        if not plugin_data or 'info' not in plugin_data:
            return jsonify({'error': 'No plugin data available'}), 404
        
        # Extract and format plugin information
        plugin_desc = plugin_data['info'].get('plugindescription', {})
        plugin_attrs = plugin_desc.get('pluginattributes', {})
        risk_info = plugin_attrs.get('risk_information', {})
        plugin_info = plugin_attrs.get('plugin_information', {})
        
        formatted_data = {
            'plugin_id': plugin_desc.get('pluginid'),
            'name': plugin_desc.get('pluginname'),
            'family': plugin_desc.get('pluginfamily'),
            'severity': plugin_desc.get('severity'),
            'risk_factor': risk_info.get('risk_factor'),
            'plugin_type': plugin_info.get('plugin_type'),
            'plugin_modification_date': plugin_info.get('plugin_modification_date'),
            'synopsis': plugin_attrs.get('synopsis'),
            'description': plugin_attrs.get('description'),
            'solution': plugin_attrs.get('solution'),
            'see_also': plugin_attrs.get('see_also'),
            'cve': plugin_attrs.get('cve'),
            'cvss_base_score': plugin_attrs.get('cvss_base_score'),
            'cvss3_base_score': plugin_attrs.get('cvss3_base_score'),
            'outputs': []
        }
        
        # Add plugin outputs if available
        if 'output' in plugin_data:
            for output in plugin_data['output']:
                if isinstance(output, dict) and 'plugin_output' in output:
                    formatted_data['outputs'].append(output['plugin_output'])
                elif isinstance(output, str):
                    formatted_data['outputs'].append(output)
        
        return jsonify(formatted_data)
    except Exception as e:
        logging.error(f"Error fetching vulnerability details: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/external-scan/vulnerability-summary/<server_name>', methods=['GET'])
@login_required
def get_vulnerability_summary(server_name):
    """
    Get a summary of vulnerabilities for an external scan by severity
    """
    try:
        # First get the scan details using the existing endpoint
        scan_data_response = get_external_scan_vulnerabilities(server_name)
        
        # If the response is an error, return it
        if isinstance(scan_data_response, tuple):
            return scan_data_response
            
        # Otherwise, process the data
        scan_data = json.loads(scan_data_response.get_data(as_text=True))
        
        # Create summary data structure
        summary = {
            'scan_id': scan_data.get('id'),
            'name': scan_data.get('name'),
            'status': scan_data.get('status'),
            'start_time': scan_data.get('start_time'),
            'end_time': scan_data.get('end_time'),
            'host_count': len(scan_data.get('hosts', [])),
            'severity_counts': {
                'critical': 0,
                'high': 0,
                'medium': 0,
                'low': 0,
                'info': 0
            },
            'hosts': []
        }
        
        # Process each host
        for host in scan_data.get('hosts', []):
            host_summary = {
                'hostname': host.get('hostname'),
                'ip': host.get('ip'),
                'critical': host.get('critical', 0),
                'high': host.get('high', 0), 
                'medium': host.get('medium', 0),
                'low': host.get('low', 0),
                'info': host.get('info', 0)
            }
            
            # Add to total counts
            summary['severity_counts']['critical'] += host.get('critical', 0)
            summary['severity_counts']['high'] += host.get('high', 0)
            summary['severity_counts']['medium'] += host.get('medium', 0)
            summary['severity_counts']['low'] += host.get('low', 0)
            summary['severity_counts']['info'] += host.get('info', 0)
            
            summary['hosts'].append(host_summary)
        
        return jsonify(summary)
    except Exception as e:
        logging.error(f"Error generating vulnerability summary: {str(e)}")
        return jsonify({'error': str(e)}), 500

# =============================================================================
# INTERNAL SCAN VULNERABILITY ENDPOINTS
# =============================================================================

@app.route('/api/internal-scan/vulnerabilities/<server_name>', methods=['GET'])
@login_required
def get_internal_scan_vulnerabilities(server_name):
    try:
        # Get current session token
        token = session.get('token')
        if not token:
            return jsonify({'error': 'No valid session'}), 401

        # First find the scan for the server
        scans_response = requests.get(
            f'{NESSUS_URL}/scans',
            headers=get_headers(),
            verify=False
        )
        scans_response.raise_for_status()
        scans = scans_response.json().get('scans', [])
        
        target_scan = None
        for scan in scans:
            if server_name.lower() in scan['name'].lower():
                target_scan = scan
                break
        
        if not target_scan:
            return jsonify({'error': f'No scan found for {server_name}'}), 404

        # Get detailed scan information
        scan_details = get_scan_details(NESSUS_URL, token, target_scan['id'])
        
        if not scan_details:
            return jsonify({'error': 'Failed to get scan details'}), 500

        # Format scan data for response
        scan_data = {
            'id': target_scan['id'],
            'name': target_scan['name'],
            'status': scan_details.get('info', {}).get('status', 'unknown'),
            'start_time': format_timestamp(scan_details.get('info', {}).get('scan_start')),
            'end_time': format_timestamp(scan_details.get('info', {}).get('scan_end')),
            'hosts': []
        }

        # Get history_id from scan details if available
        history_id = scan_details.get('info', {}).get('history_id')

        # Process each host
        for host in scan_details.get('hosts', []):
            host_id = host.get('host_id')
            if not host_id:
                continue

            # Get host vulnerabilities
            host_vuln_data = get_host_vulnerabilities(
                NESSUS_URL, token, target_scan['id'], host_id, history_id
            )

            if not host_vuln_data:
                continue

            host_data = {
                'id': host_id,
                'hostname': host.get('hostname', 'N/A'),
                'ip': host.get('host-ip', host.get('hostname', 'N/A')),
                'os': host_vuln_data.get('info', {}).get('operating-system', 'Unknown'),
                'critical': host.get('critical', 0),
                'high': host.get('high', 0),
                'medium': host.get('medium', 0),
                'low': host.get('low', 0),
                'info': host.get('info', 0),
                'vulnerabilities': []
            }

            # Process vulnerabilities
            for vuln in host_vuln_data.get('vulnerabilities', []):
                severity_levels = {4: "Critical", 3: "High", 2: "Medium", 1: "Low", 0: "Info"}
                
                host_data['vulnerabilities'].append({
                    'plugin_id': vuln.get('plugin_id'),
                    'plugin_name': vuln.get('plugin_name'),
                    'severity': vuln.get('severity', 0),
                    'severity_name': severity_levels.get(vuln.get('severity', 0), "Unknown"),
                    'count': vuln.get('count', 1)
                })

            scan_data['hosts'].append(host_data)

        return jsonify(scan_data)

    except Exception as e:
        logging.error(f"Error processing internal scan vulnerabilities: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/internal-scan/vulnerability-details/<int:scan_id>/<int:host_id>/<int:plugin_id>', methods=['GET'])
@login_required
def get_internal_vulnerability_plugin_details(scan_id, host_id, plugin_id):
    try:
        token = session.get('token')
        if not token:
            return jsonify({'error': 'No valid session'}), 401

        plugin_data = get_plugin_details(NESSUS_URL, token, scan_id, host_id, plugin_id)
        
        if not plugin_data or 'info' not in plugin_data:
            return jsonify({'error': 'No plugin data available'}), 404

        plugin_desc = plugin_data['info'].get('plugindescription', {})
        plugin_attrs = plugin_desc.get('pluginattributes', {})
        risk_info = plugin_attrs.get('risk_information', {})
        plugin_info = plugin_attrs.get('plugin_information', {})

        formatted_data = {
            'plugin_id': plugin_desc.get('pluginid'),
            'name': plugin_desc.get('pluginname'),
            'family': plugin_desc.get('pluginfamily'),
            'severity': plugin_desc.get('severity'),
            'risk_factor': risk_info.get('risk_factor'),
            'plugin_type': plugin_info.get('plugin_type'),
            'plugin_modification_date': plugin_info.get('plugin_modification_date'),
            'synopsis': plugin_attrs.get('synopsis'),
            'description': plugin_attrs.get('description'),
            'solution': plugin_attrs.get('solution'),
            'see_also': plugin_attrs.get('see_also'),
            'cve': plugin_attrs.get('cve'),
            'cvss_base_score': plugin_attrs.get('cvss_base_score'),
            'cvss3_base_score': plugin_attrs.get('cvss3_base_score'),
            'plugin_publication_date': plugin_info.get('plugin_publication_date'),
            'plugin_modification_date': plugin_info.get('plugin_modification_date'),
            'outputs': []
        }

        if 'output' in plugin_data:
            for output in plugin_data['output']:
                if isinstance(output, dict) and 'plugin_output' in output:
                    formatted_data['outputs'].append(output['plugin_output'])
                elif isinstance(output, str):
                    formatted_data['outputs'].append(output)

        return jsonify(formatted_data)

    except Exception as e:
        logging.error(f"Error getting plugin details: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/internal-scan/stop/<int:scan_id>', methods=['POST'])
@login_required
def stop_internal_scan(scan_id):
    """
    Stop a running internal scan
    """
    try:
        response = requests.post(
            f'{NESSUS_URL}/scans/{scan_id}/stop',
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        return jsonify({'message': 'Internal scan stopped successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/internal-scan/report/<server_name>', methods=['GET'])
@login_required
def download_internal_scan_report(server_name):
    try:
        token = session.get('token')
        if not token:
            return jsonify({'error': 'No valid session'}), 401

        # Find scan for the server
        response = requests.get(
            f'{NESSUS_URL}/scans',
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        scans = response.json().get('scans', [])
        
        scan = None
        for s in scans:
            if server_name.lower() in s['name'].lower():
                scan = s
                break

        if not scan:
            return jsonify({'error': 'Scan not found'}), 404

        scan_id = scan['id']
        
        # Prepare export request
        export_data = {
            'format': 'pdf',
            'template_id': REPORT_TEMPLATE_ID,
            'chapters': 'vuln_hosts_summary'
        }
        
        # Initiate report download
        export_response = requests.post(
            f'{NESSUS_URL}/scans/{scan_id}/export',
            headers=get_headers(),
            json=export_data,
            verify=False
        )
        export_response.raise_for_status()
        file_id = export_response.json()['file']
        
        # Check status until ready
        while True:
            status_response = requests.get(
                f'{NESSUS_URL}/scans/{scan_id}/export/{file_id}/status',
                headers=get_headers(),
                verify=False
            )
            status_response.raise_for_status()
            status = status_response.json()
            
            if status.get('status') == 'ready':
                break
            elif status.get('status') == 'error':
                return jsonify({'error': 'Error generating report'}), 500
                
            time.sleep(1)
        
        # Download the report
        download_response = requests.get(
            f'{NESSUS_URL}/scans/{scan_id}/export/{file_id}/download',
            headers=get_headers(),
            verify=False
        )
        download_response.raise_for_status()
        
        # Return the file as a download
        filename = f"internal_scan_report_{server_name}_{time.strftime('%Y%m%d_%H%M%S')}.pdf"
        return Response(
            io.BytesIO(download_response.content),
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename={filename}'
            }
        )

    except Exception as e:
        logging.error(f"Error downloading report: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/internal-scan/history/<server_name>', methods=['GET'])
@login_required
def get_internal_scan_history(server_name):
    """
    Get the scan history for a specific server
    """
    try:
        token = session.get('token')
        if not token:
            return jsonify({'error': 'No valid session'}), 401

        # Find all scans for the server
        response = requests.get(
            f'{NESSUS_URL}/scans',
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        scans = response.json().get('scans', [])
        
        # Filter scans for the server only
        server_scans = [
            s for s in scans 
            if server_name.lower() in s['name'].lower()
        ]
        
        if not server_scans:
            return jsonify({
                'history': []
            })

        # Get history from all scans
        all_history = []
        for scan in server_scans:
            scan_id = scan['id']
            
            try:
                # Get scan details which includes history
                scan_details_response = requests.get(
                    f'{NESSUS_URL}/scans/{scan_id}',
                    headers=get_headers(),
                    verify=False
                )
                scan_details_response.raise_for_status()
                scan_details = scan_details_response.json()
                
                # Format history data
                if 'history' in scan_details:
                    for history_item in scan_details['history']:
                        all_history.append({
                            'history_id': history_item.get('history_id'),
                            'status': history_item.get('status'),
                            'starttime': format_timestamp(history_item.get('creation_date')),
                            'endtime': format_timestamp(history_item.get('last_modification_date')),
                            'creation_date': format_timestamp(history_item.get('creation_date')),
                            'last_modification_date': format_timestamp(history_item.get('last_modification_date')),
                            'uuid': history_item.get('uuid'),
                            'progress': history_item.get('progress', 0),
                            'total_hosts': history_item.get('total_hosts', 0),
                            'scanned_hosts': history_item.get('scanned_hosts', 0),
                            'scan_name': scan['name'],
                            'scan_type': 'internal'
                        })
            except Exception as e:
                logging.error(f"Error getting scan details for scan {scan_id}: {str(e)}")
                continue
        
        # Sort history by creation date (newest first)
        all_history.sort(key=lambda x: x['creation_date'], reverse=True)
        
        return jsonify({
            'history': all_history
        })

    except Exception as e:
        logging.error(f"Error getting scan history: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/external-scan/history/<server_name>', methods=['GET'])
@login_required
def get_external_scan_history(server_name):
    """
    Get the external scan history for a specific server
    """
    try:
        token = session.get('token')
        if not token:
            return jsonify({'error': 'No valid session'}), 401

        # Get ExternalScans folder
        folders_response = requests.get(
            f'{NESSUS_URL}/folders',
            headers=get_headers(),
            verify=False
        )
        folders_response.raise_for_status()
        folders = folders_response.json().get('folders', [])
        
        # Find external scans folder
        folder_id = None
        for folder in folders:
            if folder['name'] == 'ExternalScans' or folder['name'] == 'External Scans':
                folder_id = folder['id']
                break
        
        if not folder_id:
            return jsonify({'history': []})
        
        # Get all scans in the folder
        response = requests.get(
            f'{NESSUS_URL}/scans',
            params={'folder_id': folder_id},
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        scans = response.json().get('scans', [])
        
        # Filter scans for the server only
        server_scans = [
            s for s in scans 
            if server_name.lower() in s['name'].lower()
        ]
        
        if not server_scans:
            return jsonify({
                'history': []
            })

        # Get history from all scans
        all_history = []
        for scan in server_scans:
            scan_id = scan['id']
            
            try:
                # Get scan details which includes history
                scan_details_response = requests.get(
                    f'{NESSUS_URL}/scans/{scan_id}',
                    headers=get_headers(),
                    verify=False
                )
                scan_details_response.raise_for_status()
                scan_details = scan_details_response.json()
                
                # Format history data
                if 'history' in scan_details:
                    for history_item in scan_details['history']:
                        all_history.append({
                            'history_id': history_item.get('history_id'),
                            'status': history_item.get('status'),
                            'starttime': format_timestamp(history_item.get('creation_date')),
                            'endtime': format_timestamp(history_item.get('last_modification_date')),
                            'creation_date': format_timestamp(history_item.get('creation_date')),
                            'last_modification_date': format_timestamp(history_item.get('last_modification_date')),
                            'uuid': history_item.get('uuid'),
                            'progress': history_item.get('progress', 0),
                            'total_hosts': history_item.get('total_hosts', 0),
                            'scanned_hosts': history_item.get('scanned_hosts', 0),
                            'scan_name': scan['name'],
                            'scan_type': 'external'
                        })
            except Exception as e:
                logging.error(f"Error getting scan details for scan {scan_id}: {str(e)}")
                continue
        
        # Sort history by creation date (newest first)
        all_history.sort(key=lambda x: x['creation_date'], reverse=True)
        
        return jsonify({
            'history': all_history
        })

    except Exception as e:
        logging.error(f"Error getting external scan history: {str(e)}")
        return jsonify({'error': str(e)}), 500

# =============================================================================
# EXCEPTION REQUEST ROUTES
# =============================================================================

@app.route('/api/exception-requests', methods=['POST'])
@login_required
def create_exception_request():
    try:
        if not request.is_json:
            return jsonify({
                'success': False,
                'message': 'Request must be JSON'
            }), 400

        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400

        # Get username from session
        username = session.get('username')
        if not username:
            return jsonify({
                'success': False,
                'message': 'User not authenticated'
            }), 401

        # Validate required fields
        required_fields = [
            'serverName', 'requesterFirstName', 'requesterLastName',
            'requesterJobDescription', 'requesterEmail',
            'departmentHeadUsername', 'departmentHeadFirstName',
            'departmentHeadLastName', 'departmentHeadJobDescription',
            'departmentHeadEmail', 'dataClassification',
            'exceptionDurationType', 'usersAffected', 'dataAtRisk',
            'justification', 'mitigation', 'termsAccepted'
        ]

        missing_fields = [field for field in required_fields if not data.get(field)]
        if missing_fields:
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing_fields)}'
            }), 400
        
        # Get optional fields, allowing NULL values
        requester_department = data.get('requesterDepartment')
        requester_phone = data.get('requesterPhone')
        department_head_department = data.get('departmentHeadDepartment')
        department_head_phone = data.get('departmentHeadPhone')
        
        # Calculate expiration date based on duration type
        duration_type = data.get('exceptionDurationType')
        if duration_type == 'custom':
            expiration_date = data.get('customExpirationDate')
            if not expiration_date:
                return jsonify({
                    'success': False,
                    'message': 'Custom expiration date is required when duration type is custom'
                }), 400
        else:
            try:
                duration_months = int(duration_type)
                expiration_date = (datetime.now() + timedelta(days=30 * duration_months)).strftime('%Y-%m-%d')
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid duration type'
                }), 400
        
        # Convert vulnerabilities array to JSON string
        vulnerabilities_json = json.dumps(data.get('vulnerabilities', []))
        
        # Get exception type from the request data
        exception_type = data.get('exceptionType', 'Standard')
        
        try:
            # Prepare the insert query
            query = """
            INSERT INTO VulnerabilityExceptionRequests (
                ServerName, RequesterFirstName, RequesterLastName, RequesterDepartment,
                RequesterJobDescription, RequesterEmail, RequesterPhone,
                DepartmentHeadUsername, DepartmentHeadFirstName, DepartmentHeadLastName,
                DepartmentHeadDepartment, DepartmentHeadJobDescription, DepartmentHeadEmail, DepartmentHeadPhone,
                ApproverUsername, DataClassification,
                ExceptionDurationType, ExpirationDate, UsersAffected, DataAtRisk,
                Vulnerabilities, Justification, Mitigation, TermsAccepted,
                Status, DeclineReason, RequestedBy, RequestedDate, CreatedAt, UpdatedAt,
                ExceptionType
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, GETDATE(), GETDATE(), GETDATE(), ?)
            """
            
            params = (
                data.get('serverName'),
                data.get('requesterFirstName'),
                data.get('requesterLastName'),
                requester_department,
                data.get('requesterJobDescription'),
                data.get('requesterEmail'),
                requester_phone,
                data.get('departmentHeadUsername'),
                data.get('departmentHeadFirstName'),
                data.get('departmentHeadLastName'),
                department_head_department,
                data.get('departmentHeadJobDescription'),
                data.get('departmentHeadEmail'),
                department_head_phone,
                data.get('dataClassification'),
                duration_type,
                expiration_date,
                data.get('usersAffected'),
                data.get('dataAtRisk'),
                vulnerabilities_json,
                data.get('justification'),
                data.get('mitigation'),
                data.get('termsAccepted'),
                'Pending',
                username,  # Use username from session instead of email
                exception_type
            )
            
            execute_query(query, params)
            
            return jsonify({
                'success': True,
                'message': 'Exception request submitted successfully'
            }), 201
            
        except pyodbc.Error as e:
            error_message = str(e)
            if 'connection' in error_message.lower():
                return jsonify({
                    'success': False,
                    'message': 'Database connection error. Please try again later.'
                }), 500
            elif 'timeout' in error_message.lower():
                return jsonify({
                    'success': False,
                    'message': 'Database operation timed out. Please try again.'
                }), 500
            else:
                return jsonify({
                    'success': False,
                    'message': f'Database error: {error_message}'
                }), 500
                
    except Exception as e:
        logging.error(f"Error submitting exception request: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error submitting exception request: {str(e)}'
        }), 500

@app.route('/api/exception-requests', methods=['GET'])
@login_required
def get_exception_requests():
    try:
        # Get username from session
        username = session.get('username')
        logging.info(f"Fetching exception requests for user: {username}")
        
        if not username:
            logging.error("No username found in session")
            return jsonify({
                'success': False,
                'message': 'User not authenticated'
            }), 401

        # First, let's check what records exist in the database
        check_query = """
        SELECT RequestedBy, COUNT(*) as count
        FROM VulnerabilityExceptionRequests
        GROUP BY RequestedBy
        """
        logging.info("Checking all records in database...")
        all_records = execute_query(check_query, fetch=True)
        logging.info(f"Found records with RequestedBy values: {all_records}")

        # Now try to get the user's records
        query = """
        SELECT 
            ID,
            ServerName,
            RequesterFirstName,
            RequesterLastName,
            RequesterDepartment,
            RequesterJobDescription,
            RequesterEmail,
            RequesterPhone,
            DepartmentHeadUsername,
            DepartmentHeadFirstName,
            DepartmentHeadLastName,
            DepartmentHeadDepartment,
            DepartmentHeadJobDescription,
            DepartmentHeadEmail,
            DepartmentHeadPhone,
            ApproverUsername,
            DataClassification,
            ExceptionDurationType,
            ExpirationDate,
            UsersAffected,
            DataAtRisk,
            Vulnerabilities,
            Justification,
            Mitigation,
            TermsAccepted,
            Status,
            DeclineReason,
            RequestedBy,
            RequestedDate,
            CreatedAt,
            UpdatedAt,
            ExceptionType
        FROM VulnerabilityExceptionRequests
        WHERE RequestedBy = ? OR RequesterEmail LIKE ?
        ORDER BY CreatedAt DESC
        """
        
        # Try both username and email format
        email_pattern = f"%{username}%"
        logging.info(f"Executing query with username: {username} and email pattern: {email_pattern}")
        results = execute_query(query, (username, email_pattern), fetch=True)
        logging.info(f"Query returned {len(results) if results else 0} results")
        
        if not results:
            logging.info("No results found, returning empty array")
            return jsonify({
                'success': True,
                'requests': []
            }), 200
            
        # Format the results
        exception_requests = []
        for row in results:
            # Convert datetime objects to strings
            expiration_date = row['ExpirationDate'].strftime('%Y-%m-%d') if row['ExpirationDate'] else None
            requested_date = row['RequestedDate'].strftime('%Y-%m-%d') if row['RequestedDate'] else None
            created_at = row['CreatedAt'].strftime('%Y-%m-%d %H:%M:%S') if row['CreatedAt'] else None
            updated_at = row['UpdatedAt'].strftime('%Y-%m-%d %H:%M:%S') if row['UpdatedAt'] else None
            
            # Parse vulnerabilities JSON
            vulnerabilities = json.loads(row['Vulnerabilities']) if row['Vulnerabilities'] else []
            
            exception_request = {
                'id': row['ID'],
                'serverName': row['ServerName'],
                'requesterFirstName': row['RequesterFirstName'],
                'requesterLastName': row['RequesterLastName'],
                'requesterDepartment': row['RequesterDepartment'],
                'requesterJobDescription': row['RequesterJobDescription'],
                'requesterEmail': row['RequesterEmail'],
                'requesterPhone': row['RequesterPhone'],
                'departmentHeadUsername': row['DepartmentHeadUsername'],
                'departmentHeadFirstName': row['DepartmentHeadFirstName'],
                'departmentHeadLastName': row['DepartmentHeadLastName'],
                'departmentHeadDepartment': row['DepartmentHeadDepartment'],
                'departmentHeadJobDescription': row['DepartmentHeadJobDescription'],
                'departmentHeadEmail': row['DepartmentHeadEmail'],
                'departmentHeadPhone': row['DepartmentHeadPhone'],
                'approverUsername': row['ApproverUsername'],
                'dataClassification': row['DataClassification'],
                'exceptionDurationType': row['ExceptionDurationType'],
                'expirationDate': expiration_date,
                'usersAffected': row['UsersAffected'],
                'dataAtRisk': row['DataAtRisk'],
                'vulnerabilities': vulnerabilities,
                'justification': row['Justification'],
                'mitigation': row['Mitigation'],
                'termsAccepted': row['TermsAccepted'],
                'status': row['Status'],
                'declineReason': row['DeclineReason'],
                'requestedBy': row['RequestedBy'],
                'requestedDate': requested_date,
                'createdAt': created_at,
                'updatedAt': updated_at,
                'exceptionType': row['ExceptionType']
            }
            exception_requests.append(exception_request)
        
        logging.info(f"Returning {len(exception_requests)} formatted requests")
        return jsonify({
            'success': True,
            'requests': exception_requests
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching exception requests: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error fetching exception requests: {str(e)}'
        }), 500

@app.route('/api/admin/exception-requests', methods=['GET'])
@login_required
def get_all_exception_requests():
    try:
        # Check if user is admin
        if not session.get('is_admin', False):
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 403

        # Query to get all exception requests
        query = """
        SELECT 
            ID,
            ServerName,
            RequesterFirstName,
            RequesterLastName,
            RequesterDepartment,
            RequesterJobDescription,
            RequesterEmail,
            RequesterPhone,
            DepartmentHeadUsername,
            DepartmentHeadFirstName,
            DepartmentHeadLastName,
            DepartmentHeadDepartment,
            DepartmentHeadJobDescription,
            DepartmentHeadEmail,
            DepartmentHeadPhone,
            ApproverUsername,
            DataClassification,
            ExceptionDurationType,
            ExpirationDate,
            UsersAffected,
            DataAtRisk,
            Vulnerabilities,
            Justification,
            Mitigation,
            TermsAccepted,
            Status,
            DeclineReason,
            RequestedBy,
            RequestedDate,
            CreatedAt,
            UpdatedAt,
            ExceptionType
        FROM VulnerabilityExceptionRequests
        ORDER BY CreatedAt DESC
        """
        
        results = execute_query(query, fetch=True)
        
        if not results:
            return jsonify({
                'success': True,
                'requests': []
            }), 200
            
        # Format the results
        exception_requests = []
        for row in results:
            # Convert datetime objects to strings
            expiration_date = row['ExpirationDate'].strftime('%Y-%m-%d') if row['ExpirationDate'] else None
            requested_date = row['RequestedDate'].strftime('%Y-%m-%d') if row['RequestedDate'] else None
            created_at = row['CreatedAt'].strftime('%Y-%m-%d %H:%M:%S') if row['CreatedAt'] else None
            updated_at = row['UpdatedAt'].strftime('%Y-%m-%d %H:%M:%S') if row['UpdatedAt'] else None
            
            # Parse vulnerabilities JSON
            vulnerabilities = json.loads(row['Vulnerabilities']) if row['Vulnerabilities'] else []
            
            exception_request = {
                'id': row['ID'],
                'serverName': row['ServerName'],
                'requesterFirstName': row['RequesterFirstName'],
                'requesterLastName': row['RequesterLastName'],
                'requesterDepartment': row['RequesterDepartment'],
                'requesterJobDescription': row['RequesterJobDescription'],
                'requesterEmail': row['RequesterEmail'],
                'requesterPhone': row['RequesterPhone'],
                'departmentHeadUsername': row['DepartmentHeadUsername'],
                'departmentHeadFirstName': row['DepartmentHeadFirstName'],
                'departmentHeadLastName': row['DepartmentHeadLastName'],
                'departmentHeadDepartment': row['DepartmentHeadDepartment'],
                'departmentHeadJobDescription': row['DepartmentHeadJobDescription'],
                'departmentHeadEmail': row['DepartmentHeadEmail'],
                'departmentHeadPhone': row['DepartmentHeadPhone'],
                'approverUsername': row['ApproverUsername'],
                'dataClassification': row['DataClassification'],
                'exceptionDurationType': row['ExceptionDurationType'],
                'expirationDate': expiration_date,
                'usersAffected': row['UsersAffected'],
                'dataAtRisk': row['DataAtRisk'],
                'vulnerabilities': vulnerabilities,
                'justification': row['Justification'],
                'mitigation': row['Mitigation'],
                'termsAccepted': row['TermsAccepted'],
                'status': row['Status'],
                'declineReason': row['DeclineReason'],
                'requestedBy': row['RequestedBy'],
                'requestedDate': requested_date,
                'createdAt': created_at,
                'updatedAt': updated_at,
                'exceptionType': row['ExceptionType']
            }
            exception_requests.append(exception_request)
        
        return jsonify({
            'success': True,
            'requests': exception_requests
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching all exception requests: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error fetching all exception requests: {str(e)}'
        }), 500

@app.route('/api/exception-requests/<int:request_id>', methods=['PUT'])
@login_required
def update_exception_request(request_id):
    """
    Update an exception request status (admin only)
    """
    try:
        # Check if user is admin
        if not session.get('is_admin', False):
            return jsonify({'error': 'Unauthorized'}), 403
            
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        status = data.get('status')
        
        if not status or status not in ['approved', 'declined']:
            return jsonify({'error': 'Invalid status'}), 400
            
        # Update the exception request status in SQL Server
        if status == 'declined':
            decline_reason = data.get('declineReason')
            if not decline_reason:
                return jsonify({'error': 'Decline reason is required when declining a request'}), 400
            
            query = """
            UPDATE VulnerabilityExceptionRequests 
            SET Status = ?, DeclineReason = ?, UpdatedAt = GETDATE()
            WHERE ID = ?
            """
            params = (status, decline_reason, request_id)
        else:
            query = """
            UPDATE VulnerabilityExceptionRequests 
            SET Status = ?, UpdatedAt = GETDATE()
            WHERE ID = ?
            """
            params = (status, request_id)
        
        execute_query(query, params)
        
        return jsonify({
            'success': True,
            'message': f'Exception request {status} successfully'
        }), 200
        
    except Exception as e:
        logging.error(f"Error updating exception request: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<username>', methods=['GET'])
@login_required
def get_user_info(username):
    """
    Get user information from ISODepot.dbo.Persons table
    """
    try:
        query = """
        SELECT 
            ADUserName,
            FirstName,
            LastName,
            DepartmentName,
            DepartmentJobTitle,
            EmailAddress,
            CampusPhone
        FROM ISODepot.dbo.Persons
        WHERE ADUserName = ?
        """
        
        results = execute_query(query, (username,))
        
        if not results:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
            
        user = results[0]
        return jsonify({
            'success': True,
            'data': {
                'username': user[0],
                'firstName': user[1],
                'lastName': user[2],
                'department': user[3],
                'jobDescription': user[4],
                'email': user[5],
                'phone': user[6]
            }
        }), 200
        
    except Exception as e:
        logging.error(f"Error fetching user info: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Error fetching user info: {str(e)}'
        }), 500

# =============================================================================
# MAIN APPLICATION ENTRY POINT
# =============================================================================

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)