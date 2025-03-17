"""
Updated Flask Backend with External Report Download Functionality
Based on the original app.py and incorporating the new external report download code.
"""

# =============================================================================
# IMPORTS AND SETUP
# =============================================================================

from flask import Flask, jsonify, request, session, Response
from flask_cors import CORS
import requests
import urllib3
import logging
import time
import json
import io
from functools import wraps

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

@app.route('/api/agents', methods=['GET'])
@login_required
def get_agents():
    try:
        # Get user's group first
        groups_response = requests.get(
            f'{NESSUS_URL}/agent-groups',
            headers=get_headers(),
            verify=False
        )
        groups_response.raise_for_status()
        
        groups = groups_response.json().get('groups', [])
        user_group = next(
            (group for group in groups if group['name'] == session['username']),
            None
        )
        
        if not user_group:
            return jsonify({'error': 'User group not found'}), 404
            
        # Get agents in the user's group
        group_id = user_group['id']
        agents_response = requests.get(
            f'{NESSUS_URL}/agent-groups/{group_id}/agents',
            headers=get_headers(),
            verify=False
        )
        agents_response.raise_for_status()
        
        agents = agents_response.json().get('agents', [])
        agent_details = []
        
        for agent in agents:
            agent_id = agent.get('id')
            agent_response = requests.get(
                f'{NESSUS_URL}/agents/{agent_id}',
                headers=get_headers(),
                verify=False
            )
            if agent_response.status_code == 200:
                agent_info = agent_response.json()
                agent_details.append({
                    'name': agent_info.get('name', 'Unknown'),
                    'status': agent_info.get('status', 'unknown').lower(),
                    'ipAddress': agent_info.get('ip', 'Unknown'),
                    'lastPluginUpdate': agent_info.get('last_plugin_update', 'Never'),
                    'lastScan': agent_info.get('last_scanned', 'Never'),
                    'key': str(agent_id)
                })
        
        return jsonify(agent_details)
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

@app.route('/api/agents/<int:agent_id>', methods=['GET'])
@login_required
def get_agent_details(agent_id):
    try:
        response = requests.get(
            f'{NESSUS_URL}/agents/{agent_id}',
            headers=get_headers(),
            verify=False
        )
        response.raise_for_status()
        return jsonify(response.json())
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

# New route for specifically downloading external scan reports
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

# =============================================================================
# MAIN APPLICATION ENTRY POINT
# =============================================================================

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)