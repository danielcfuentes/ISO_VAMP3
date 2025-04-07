// Script to create an exception request
const prisma = require('../prisma/client');

async function createExceptionRequest() {
  try {
    // Read input data from stdin
    let inputData = '';
    process.stdin.on('data', (chunk) => {
      inputData += chunk;
    });

    process.stdin.on('end', async () => {
      try {
        // Parse the input data
        const data = JSON.parse(inputData);
        console.error('Received data:', JSON.stringify(data, null, 2));
        
        // Validate required fields
        if (!data.serverName) {
          throw new Error('Server name is required');
        }
        
        // Handle date formatting
        let expirationDate;
        try {
          if (typeof data.expirationDate === 'string') {
            expirationDate = new Date(data.expirationDate);
          } else if (data.expirationDate && typeof data.expirationDate === 'object') {
            // Try to use the ISO or timestamp representation if available
            if (data.expirationDate.d) {
              expirationDate = new Date(data.expirationDate.d);
            } else if (data.expirationDate.$d) {
              expirationDate = new Date(data.expirationDate.$d);
            } else {
              // Fallback to using year/month/day components if available
              const year = data.expirationDate.$y || data.expirationDate.y || 2025;
              const month = (data.expirationDate.$M || data.expirationDate.M || 11); // JS months are 0-based
              const day = data.expirationDate.$D || data.expirationDate.D || 31;
              expirationDate = new Date(year, month, day);
            }
          } else {
            // Default to one year from now if no date provided
            expirationDate = new Date();
            expirationDate.setFullYear(expirationDate.getFullYear() + 1);
          }
          
          // Validate the date (ensure it's in the future and a valid date)
          if (isNaN(expirationDate.getTime())) {
            console.error('Invalid date, using default');
            expirationDate = new Date();
            expirationDate.setFullYear(expirationDate.getFullYear() + 1);
          }
          
        } catch (dateError) {
          console.error('Error parsing date:', dateError);
          // Default to one year from now
          expirationDate = new Date();
          expirationDate.setFullYear(expirationDate.getFullYear() + 1);
        }

        // Process vulnerabilities - handle both string arrays and object arrays
        let vulnerabilities = [];
        if (Array.isArray(data.vulnerabilities)) {
          vulnerabilities = data.vulnerabilities.map(vuln => {
            if (typeof vuln === 'string') {
              return vuln;
            }
            // If it's an object, extract the name or fall back to ID
            return vuln.name || vuln.plugin_name || `Vulnerability ID: ${vuln.id || vuln.plugin_id || 'unknown'}`;
          });
        } else if (data.vulnerabilities) {
          console.error('Vulnerabilities not in expected format, using as-is:', data.vulnerabilities);
          vulnerabilities = [String(data.vulnerabilities)];
        } else {
          vulnerabilities = ['No vulnerabilities specified'];
        }

        // Create the exception request
        const result = await prisma.exceptionRequest.create({
          data: {
            serverName: data.serverName,
            vulnerabilities: vulnerabilities,
            justification: data.justification || 'No justification provided',
            mitigation: data.mitigation || 'No mitigation provided',
            expirationDate: expirationDate,
            requestedBy: data.requestedBy || 'unknown'
          }
        });

        // Return the created record
        console.log(JSON.stringify(result));
        process.exit(0);
      } catch (parseError) {
        console.error('Error processing input:', parseError);
        console.log(JSON.stringify({ error: parseError.message }));
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Top level error:', error);
    console.log(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

createExceptionRequest(); 