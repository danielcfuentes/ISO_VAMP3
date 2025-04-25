import win32com.client
import pythoncom
import logging
from jinja2 import Template
import os
import threading

def send_security_notification(request_data):
    """
    Send a notification email to the security team about a new exception request
    
    Args:
        request_data (dict): Dictionary containing all the request details
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Initialize COM for thread safety
        pythoncom.CoInitialize()
        
        # Load email template
        email_template_path = os.path.join(os.path.dirname(__file__), 'templates', 'security_notification_email.html')
        with open(email_template_path, 'r') as file:
            template = Template(file.read())
        
        # Render the email body with the template
        email_body = template.render(
            request_id=request_data.get('id'),
            server_name=request_data.get('serverName'),
            requester_first_name=request_data.get('requesterFirstName'),
            requester_last_name=request_data.get('requesterLastName'),
            requester_email=request_data.get('requesterEmail'),
            requester_department=request_data.get('requesterDepartment', 'N/A'),
            requester_job_description=request_data.get('requesterJobDescription'),
            data_classification=request_data.get('dataClassification'),
            exception_duration=request_data.get('exceptionDurationType'),
            expiration_date=request_data.get('expirationDate'),
            users_affected=request_data.get('usersAffected'),
            data_at_risk=request_data.get('dataAtRisk'),
            dashboard_url="http://localhost:5173/exception-requests"  # Update with your actual URL
        )
        
        # Create and send the email using Outlook
        outlook = win32com.client.Dispatch("Outlook.Application")
        namespace = outlook.GetNamespace("MAPI")
        
        # Try to get the security@utep.edu account
        try:
            account = None
            for acc in namespace.Accounts:
                if acc.SmtpAddress.lower() == "security@utep.edu":
                    account = acc
                    break
            
            if account:
                # Create mail item using the specific account
                mail = account.CreateItem(0)  # 0 represents an email item
            else:
                # Fallback to default account if security@utep.edu not found
                mail = outlook.CreateItem(0)
                logging.warning("security@utep.edu account not found, using default account")
        except Exception as e:
            # Fallback to default account if there's any error
            mail = outlook.CreateItem(0)
            logging.warning(f"Error accessing accounts: {str(e)}, using default account")
        
        mail.To = "dcfuentes@miners.utep.edu"
        mail.Subject = f"VAMP TESTING EMAIL: New Vulnerability Exception Request - {request_data.get('serverName')}"
        mail.HTMLBody = email_body
        mail.Send()
        
        # Clean up COM resources
        pythoncom.CoUninitialize()
        
        logging.info(f"Security notification email sent for request {request_data.get('id')}")
        return True
        
    except Exception as e:
        logging.error(f"Failed to send security notification email: {str(e)}")
        return False

def send_confirmation_email(recipient_email, server_name):
    """
    Send a confirmation email to the requester when they submit an exception request
    
    Args:
        recipient_email (str): Email address of the requester
        server_name (str): Name of the server for which the exception was requested
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Initialize COM for thread safety
        pythoncom.CoInitialize()
        
        # Load email template
        email_template_path = os.path.join(os.path.dirname(__file__), 'templates', 'confirmation_email.html')
        with open(email_template_path, 'r') as file:
            template = Template(file.read())
        
        # Render the email body with the template
        email_body = template.render(
            server_name=server_name,
            dashboard_url="http://localhost:5173/exception-requests"  # Update with your actual URL
        )
        
        # Create and send the email using Outlook
        outlook = win32com.client.Dispatch("Outlook.Application")
        namespace = outlook.GetNamespace("MAPI")
        
        # Try to get the security@utep.edu account
        try:
            account = None
            for acc in namespace.Accounts:
                if acc.SmtpAddress.lower() == "security@utep.edu":
                    account = acc
                    break
            
            if account:
                # Create mail item using the specific account
                mail = account.CreateItem(0)  # 0 represents an email item
            else:
                # Fallback to default account if security@utep.edu not found
                mail = outlook.CreateItem(0)
                logging.warning("security@utep.edu account not found, using default account")
        except Exception as e:
            # Fallback to default account if there's any error
            mail = outlook.CreateItem(0)
            logging.warning(f"Error accessing accounts: {str(e)}, using default account")
        
        mail.To = recipient_email
        mail.Subject = f"Vulnerability Exception Request Submitted - {server_name}"
        mail.HTMLBody = email_body
        mail.Send()
        
        # Clean up COM resources
        pythoncom.CoUninitialize()
        
        logging.info(f"Confirmation email sent to {recipient_email} for server {server_name}")
        return True
        
    except Exception as e:
        logging.error(f"Failed to send confirmation email to {recipient_email}: {str(e)}")
        return False 