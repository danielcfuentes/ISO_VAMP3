# Backend Database Integration

This document provides information about the PostgreSQL database integration with the ISO VAMP3 application.

## Setup

The application uses PostgreSQL as the database, Prisma as the ORM, and Node.js scripts for database operations called from the Flask backend.

### Prerequisites

- PostgreSQL database server (v12 or higher)
- Node.js (v16 or higher)
- Python (v3.6 or higher)
- pip

### Environment Configuration

The `.env` file contains the configuration for the database connection:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/iso_vamp_db?schema=public"
```

Make sure to update this with your actual PostgreSQL credentials and connection details.

## Database Schema

The database has the following schema:

### ExceptionRequest Table

| Column           | Type      | Description                                 |
|------------------|-----------|---------------------------------------------|
| id               | Integer   | Primary key, auto-incrementing              |
| serverName       | String    | Name of the server for exception            |
| vulnerabilities  | String[]  | Array of vulnerability IDs                  |
| justification    | String    | Justification for the exception request     |
| mitigation       | String    | Mitigation measures in place                |
| expirationDate   | DateTime  | When the exception expires                  |
| status           | String    | Status (pending, approved, rejected)        |
| requestedBy      | String    | Username of requester                       |
| requestedDate    | DateTime  | When the request was made                   |
| createdAt        | DateTime  | Record creation timestamp                   |
| updatedAt        | DateTime  | Record update timestamp                     |

## Database Scripts

The following Node.js scripts handle database operations:

- `create-exception.js` - Creates a new exception request
- `get-all-exceptions.js` - Gets all exception requests

## API Endpoints

The following API endpoints are available for exception requests:

- `POST /api/exception-requests` - Create a new exception request
- `GET /api/exception-requests` - Get all exception requests

## First-time Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Generate Prisma client:
   ```
   npm run db:generate
   ```

3. Run database migrations:
   ```
   npm run db:migrate
   ```

4. Start the application:
   ```
   npm start
   ```

## Troubleshooting

If you encounter database connection issues:

1. Verify PostgreSQL is running
2. Check your database credentials in the `.env` file
3. Make sure the database exists (create it if needed)
4. Run `npx prisma migrate reset` to reset the database (will delete all data)
5. Run `npx prisma studio` to open the Prisma Studio interface for direct database access 