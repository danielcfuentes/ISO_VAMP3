# Backend

This is the backend service for the VAMP application. It provides API endpoints for vulnerability assessment and management.

## Technology Stack

- Python Flask for the backend API
- SQL Server for the database
- pyodbc for database connectivity

## Setup Instructions

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Configure SQL Server connection:
- Update the connection string in `database/sql_server_config.py`
- Ensure SQL Server is running and accessible

3. Create the database tables:
- Run the SQL scripts in the `database/schema` directory to create necessary tables

4. Start the backend server:
```bash
python app.py
```

The server will start on http://localhost:5000

## API Documentation

The backend provides the following main endpoints:

- `/api/auth/*` - Authentication endpoints
- `/api/exception-requests/*` - Exception request management
- `/api/scans/*` - Scan management
- `/api/external-scans/*` - External scan management

For detailed API documentation, please refer to the API documentation in the docs folder.

## Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# SQL Server Configuration
SQL_SERVER=your_server_name
SQL_DATABASE=your_database_name
SQL_USERNAME=your_username
SQL_PASSWORD=your_password
```

## Error Handling

The application uses proper error handling and logging. Check the logs for troubleshooting. 