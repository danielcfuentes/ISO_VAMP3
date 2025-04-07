// Script to get exception requests for a specific user
const prisma = require('../prisma/client');

async function getUserExceptionRequests() {
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
        const username = data.username;
        
        if (!username) {
          throw new Error('Username is required');
        }
        
        // Query the database for exception requests for this user
        const exceptionRequests = await prisma.exceptionRequest.findMany({
          where: {
            requestedBy: username
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        // Return the results
        console.log(JSON.stringify(exceptionRequests));
        process.exit(0);
      } catch (parseError) {
        console.error('Error parsing input:', parseError);
        console.log(JSON.stringify({ error: parseError.message }));
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Error retrieving exception requests:', error);
    console.log(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

getUserExceptionRequests(); 