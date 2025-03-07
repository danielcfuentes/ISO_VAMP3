// src/services/nessusService.js
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Configure axios to include credentials
// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json';


class NessusService {
  async login(username, password) {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        username,
        password
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to login');
    }
  }

  async getAgentGroups() {
    try {
      const response = await axios.get(`${API_URL}/agent-groups`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch agent groups');
    }
  }

  async getGroupDetails(groupId) {
    try {
      const response = await axios.get(`${API_URL}/agent-groups/${groupId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch group details');
    }
  }

  async downloadReport(serverName) {
    try {
      console.log(`Downloading report for server: ${serverName}`);
      const response = await axios.get(`${API_URL}/scan/report/${serverName}`, {
        responseType: 'blob',
        withCredentials: true
      });
      
      // Check if the response is valid
      if (!response.data) {
        throw new Error('Empty response received');
      }

      // Return the blob data for the component to handle
      return response.data;
    } catch (error) {
      console.error('Error in downloadReport:', error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new Error(error.response.data?.error || 'Server error during report download');
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('No response received from server');
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error(error.message || 'Failed to download report');
      }
    }
  }

  async removeAgent(groupId, agentId) {
    try {
      console.log(`Attempting to remove agent ${agentId} from group ${groupId}`);
      const response = await axios.delete(
        `${API_URL}/agent-groups/${groupId}/agents/${agentId}`,
        { withCredentials: true }
      );
      
      console.log('Remove agent response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in removeAgent:', error.response || error);
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        throw new Error(error.response.data?.error || 'Server error during agent removal');
      } else if (error.request) {
        // The request was made but no response was received
        throw new Error('No response received from server');
      } else {
        // Something happened in setting up the request that triggered an Error
        throw new Error(error.message || 'Failed to remove agent');
      }
    }
  }

  async getMyScansFolderId() {
    try {
      const response = await axios.get(`${API_URL}/folders/my-scans`);
      if (!response.data || !response.data.id) {
        throw new Error('Failed to get folder ID');
      }
      return response.data.id;
    } catch (error) {
      console.error('Error getting folder ID:', error);
      throw new Error('Failed to get My Scans folder');
    }
  }

  async checkExistingScan(agentName, folderId) {
    try {
      const response = await axios.get(`${API_URL}/scans/check-existing`, {
        params: {
          agent_name: agentName,
          folder_id: folderId
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error checking existing scan:', error);
      throw new Error('Failed to check existing scan');
    }
  }

  async createAgentGroup(groupName) {
    try {
      const response = await axios.post(`${API_URL}/agent-groups/create`, {
        group_name: groupName
      });
      
      if (!response.data || !response.data.id) {
        throw new Error('Invalid agent group response');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error creating agent group:', error);
      throw new Error('Failed to create agent group');
    }
  }

  async createScan(scanData) {
    try {
      console.log('Making createScan request with data:', scanData);
      const response = await axios.post(`${API_URL}/scans/create`, scanData);
      console.log('Create scan response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error in createScan:', error.response || error);
      throw new Error(error.response?.data?.error || 'Failed to create scan');
    }
  }

  async launchScan(scanId) {
    try {
      const response = await axios.post(`${API_URL}/scans/${scanId}/launch`);
      return response.data;
    } catch (error) {
      console.error('Error launching scan:', error);
      throw new Error('Failed to launch scan');
    }
  }

  async createAndLaunchScan(serverName) {
    try {
      // Get My Scans folder ID first
      const folderId = await this.getMyScansFolderId();
      if (!folderId) {
        throw new Error('Could not find My Scans folder');
      }

      // Check if scan exists
      const existingScan = await this.checkExistingScan(serverName, folderId);
      let scanId;

      if (!existingScan.exists) {
        console.log('No existing scan found, creating new scan...');
        
        // Create agent group
        const agentGroup = await this.createAgentGroup(serverName);
        if (!agentGroup || !agentGroup.id) {
          throw new Error('Failed to create agent group');
        }

        // Create scan with proper data
        const scanData = {
          server_name: serverName,
          folder_id: folderId,
          agent_group_id: agentGroup.id
        };

        console.log('Creating scan with data:', scanData);
        const newScan = await this.createScan(scanData);
        
        if (!newScan || !newScan.scan || !newScan.scan.id) {
          throw new Error('Failed to create scan: Invalid response');
        }
        
        scanId = newScan.scan.id;
      } else {
        console.log('Found existing scan:', existingScan.scan);
        scanId = existingScan.scan.id;
      }

      // Launch the scan
      await this.launchScan(scanId);
      
      return {
        success: true,
        scanId: scanId,
        message: 'Scan created and launched successfully'
      };
    } catch (error) {
      console.error('Error in createAndLaunchScan:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to create and launch scan');
    }
  }


  // SCAN STATUS

  
  async findScanByServerName(serverName) {
    try {
      const response = await axios.get(`${API_URL}/scans/find/${serverName}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(error.response?.data?.error || 'Failed to find scan');
    }
  }

  async getScanStatus(scanId) {
    try {
      const response = await axios.get(`${API_URL}/scans/status/${scanId}`);
      const status = response.data;
      
      // Map Nessus status to our application status
      let mappedStatus = status.status;
      
      // Log raw status for debugging
      console.log(`Raw scan status for ${scanId}:`, status);
      
      // Handle specific status mappings
      if (status.status === 'running') {
        if (status.progress === 0) {
          mappedStatus = 'pending';
        } else {
          mappedStatus = 'running';
        }
      }
      
      return {
        status: mappedStatus,
        progress: status.progress || 0,
        timestamp: status.timestamp
      };
    } catch (error) {
      console.error('Error getting scan status:', error);
      throw new Error(error.response?.data?.error || 'Failed to get scan status');
    }
  }

  async launchAndMonitorScan(serverName) {
    try {
      // First create and launch the scan
      const result = await this.createAndLaunchScan(serverName);
      
      // Find the scan ID
      const scan = await this.findScanByServerName(serverName);
      if (!scan) {
        throw new Error('Could not find launched scan');
      }

      return {
        scanId: scan.id,
        message: result.message
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to launch and monitor scan');
    }
  }

}

export default new NessusService();