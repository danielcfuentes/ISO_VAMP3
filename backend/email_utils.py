import win32com.client
import pythoncom
import logging
from jinja2 import Template
import os
import threading

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