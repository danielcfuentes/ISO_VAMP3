// Script to get all exception requests
const prisma = require('../prisma/client');

async function getAllExceptionRequests() {
  try {
    // Query the database for all exception requests
    const exceptionRequests = await prisma.exceptionRequest.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Return the results
    console.log(JSON.stringify(exceptionRequests));
    process.exit(0);
  } catch (error) {
    console.error(error);
    console.log(JSON.stringify({ error: error.message }));
    process.exit(1);
  }
}

getAllExceptionRequests(); 