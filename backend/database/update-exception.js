const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateExceptionRequest(data) {
    try {
        const { id, status, declineReason } = data;
        
        // Validate required fields
        if (!id || !status) {
            throw new Error('ID and status are required');
        }

        // Validate status value
        if (!['approved', 'declined'].includes(status)) {
            throw new Error('Invalid status value');
        }

        // If status is declined, require declineReason
        if (status === 'declined' && !declineReason) {
            throw new Error('Decline reason is required when declining a request');
        }

        // Update the exception request
        const updatedRequest = await prisma.exceptionRequest.update({
            where: { id: parseInt(id) },
            data: {
                status,
                ...(status === 'declined' && { declineReason })
            }
        });

        return updatedRequest;
    } catch (error) {
        console.error('Error updating exception request:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Get data from stdin
let inputData = '';
process.stdin.on('data', chunk => {
    inputData += chunk;
});

process.stdin.on('end', async () => {
    try {
        const data = JSON.parse(inputData);
        const result = await updateExceptionRequest(data);
        console.log(JSON.stringify(result));
    } catch (error) {
        console.error(JSON.stringify({ error: error.message }));
        process.exit(1);
    }
}); 