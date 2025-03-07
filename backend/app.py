from flask import Flask, jsonify, request, session
from flask_cors import CORS
import requests
import urllib3
import logging
import time
import json
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

# Nessus API Configuration
NESSUS_URL = 'https://isosrvutn00.utep.edu:8834'
TEMPLATE_UUID = 'e785b26c-5b4d-5da8-6643-007ea1f8ee1c8f23937a4bd45a1d'
POLICY_ID = '26729'

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'token' not in session:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

def get_headers():
    return {
        'X-Cookie': f'token={session["token"]}',
        'Content-Type': 'application/json'
    }

@app.route('/api/auth/login', methods=['POST'])
def login():
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
        
        # Store token in session
        token = auth_response.json()['token']
        session['token'] = token
        session['username'] = username
        
        return jsonify({'message': 'Login successful'})
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 401

@app.route('/api/agent-groups', methods=['GET'])
@login_required
def get_agent_groups():
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
        
        # Log the response for debugging
        print(f"Nessus Response Status: {response.status_code}")
        print(f"Nessus Response: {response.text}")
        
        response.raise_for_status()
        return jsonify({'message': 'Agent removed successfully'})
    except requests.exceptions.RequestException as e:
        print(f"Error removing agent: {str(e)}")
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    


# LAUNCH AND START SCAN

@app.route('/api/folders/my-scans', methods=['GET'])
@login_required
def get_my_scans_folder():
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
        app.logger.error(f"Error checking existing scan: {str(e)}")
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
        logging.debug(f"Creating scan with data: {data}")
        
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
        
        logging.debug(f"Making request to {scan_url} with headers: {headers}")
        logging.debug(f"Request payload: {json.dumps(scan_data, indent=2)}")
        
        response = requests.post(
            scan_url,
            headers=headers,
            json=scan_data,
            verify=False
        )
        
        # Log the response for debugging
        logging.debug(f"Response status code: {response.status_code}")
        logging.debug(f"Response content: {response.text}")
        
        response.raise_for_status()
        return jsonify(response.json())
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Error creating scan: {str(e)}"
        if hasattr(e, 'response'):
            error_msg += f"\nResponse: {e.response.text}"
        logging.error(error_msg)
        return jsonify({'error': error_msg}), 500
    except Exception as e:
        error_msg = f"Unexpected error creating scan: {str(e)}"
        logging.error(error_msg)
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
        app.logger.error(f"Error launching scan: {str(e)}")
        return jsonify({'error': str(e)}), 500


# SCAN STATUS

@app.route('/api/scans/status/<int:scan_id>', methods=['GET'])
@login_required
def get_scan_status(scan_id):
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
        
        logging.debug(f"Scan {scan_id} status: {status_info}")
        return jsonify(status_info)
    except Exception as e:
        logging.error(f"Error getting scan status: {str(e)}")
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)