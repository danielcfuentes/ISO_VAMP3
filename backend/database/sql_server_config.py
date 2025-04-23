import os
import pyodbc
from dotenv import load_dotenv

load_dotenv()

def get_sql_server_connection():
    """
    Creates and returns a connection to the SQL Server database
    """
    try:
        conn = pyodbc.connect(os.getenv('SQL_CONN_STR'))
        return conn
    except Exception as e:
        print(f"Error connecting to SQL Server: {str(e)}")
        raise

def execute_query(query, params=None, fetch=False):
    """
    Executes a query and returns the results
    """
    conn = None
    try:
        conn = get_sql_server_connection()
        cursor = conn.cursor()
        if params:
            cursor.execute(query, params)
        else:
            cursor.execute(query)
        
        if query.strip().upper().startswith('SELECT'):
            if fetch:
                # Return a list of dictionaries with column names as keys
                columns = [column[0] for column in cursor.description]
                results = []
                for row in cursor.fetchall():
                    results.append(dict(zip(columns, row)))
                return results
            else:
                return cursor.fetchall()
        else:
            conn.commit()
            return cursor.rowcount
    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error executing query: {str(e)}")
        raise
    finally:
        if conn:
            conn.close() 