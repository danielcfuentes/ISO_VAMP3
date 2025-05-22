import win32com.client
import pythoncom
import logging
from jinja2 import Template
import os
import threading
from datetime import datetime

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
            request_id=request_data.get('requestID'),
            approval_phase=request_data.get('approvalPhase', 'ISO_REVIEW')
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
        
        # For testing, send to test email
        mail.To = "dcfuentes@miners.utep.edu"
        mail.Subject = f"VAMP TESTING EMAIL: New Exception Request {request_data.get('requestID')} - {request_data.get('approvalPhase', 'ISO_REVIEW')}"
        mail.HTMLBody = email_body
        mail.Send()
        
        # Clean up COM resources
        pythoncom.CoUninitialize()
        
        logging.info(f"Security notification email sent for request {request_data.get('requestID')}")
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
        
        # For testing, send to test email
        mail.To = "dcfuentes@miners.utep.edu"
        mail.Subject = f"VAMP TESTING EMAIL: Vulnerability Exception Request Submitted - {server_name}"
        mail.HTMLBody = email_body
        mail.Send()
        
        # Clean up COM resources
        pythoncom.CoUninitialize()
        
        logging.info(f"Confirmation email sent to dcfuentes@miners.utep.edu for server {server_name}")
        return True
        
    except Exception as e:
        logging.error(f"Failed to send confirmation email: {str(e)}")
        return False

def send_need_more_info_email(request_data, reviewer_name, reviewer_role, comments):
    """
    Send an email to the requester when more information is needed
    
    Args:
        request_data (dict): Dictionary containing the request details
        reviewer_name (str): Name of the reviewer requesting more info
        reviewer_role (str): Role of the reviewer (ISO, Department Head, CISO)
        comments (str): Comments explaining what additional information is needed
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Initialize COM for thread safety
        pythoncom.CoInitialize()
        
        # Load email template
        email_template_path = os.path.join(os.path.dirname(__file__), 'templates', 'need_more_info_email.html')
        with open(email_template_path, 'r') as file:
            template = Template(file.read())
        
        # Render the email body with the template
        email_body = template.render(
            request_id=request_data.get('requestID'),
            server_name=request_data.get('serverName'),
            approval_phase=request_data.get('approvalPhase'),
            reviewer_name=reviewer_name,
            reviewer_role=reviewer_role,
            reviewer_comments=comments,
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
        
        # For testing, send to test email
        mail.To = "dcfuentes@miners.utep.edu"
        mail.Subject = f"VAMP TESTING EMAIL: Additional Information Required - Request {request_data.get('requestID')}"
        mail.HTMLBody = email_body
        mail.Send()
        
        # Clean up COM resources
        pythoncom.CoUninitialize()
        
        logging.info(f"Need more info email sent to dcfuentes@miners.utep.edu for request {request_data.get('requestID')}")
        return True
        
    except Exception as e:
        logging.error(f"Failed to send need more info email: {str(e)}")
        return False

def send_decline_email(request_data, reviewer_name, reviewer_role, decline_reason):
    """
    Send an email to the requester when their request is declined
    
    Args:
        request_data (dict): Dictionary containing the request details
        reviewer_name (str): Name of the reviewer who declined the request
        reviewer_role (str): Role of the reviewer (ISO, Department Head, CISO)
        decline_reason (str): Reason for declining the request
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Initialize COM for thread safety
        pythoncom.CoInitialize()
        
        # Load email template
        email_template_path = os.path.join(os.path.dirname(__file__), 'templates', 'request_declined_email.html')
        with open(email_template_path, 'r') as file:
            template = Template(file.read())
        
        # Render the email body with the template
        email_body = template.render(
            request_id=request_data.get('requestID'),
            server_name=request_data.get('serverName'),
            reviewer_name=reviewer_name,
            reviewer_role=reviewer_role,
            declined_date=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            decline_reason=decline_reason,
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
        
        # For testing, send to test email
        mail.To = "dcfuentes@miners.utep.edu"
        mail.Subject = f"VAMP TESTING EMAIL: Request Declined - {request_data.get('requestID')}"
        mail.HTMLBody = email_body
        mail.Send()
        
        # Clean up COM resources
        pythoncom.CoUninitialize()
        
        logging.info(f"Decline email sent to dcfuentes@miners.utep.edu for request {request_data.get('requestID')}")
        return True
        
    except Exception as e:
        logging.error(f"Failed to send decline email: {str(e)}")
        return False

def send_approval_email(request_data, approver_name, approver_role):
    """
    Send an email to the requester when their request is approved
    
    Args:
        request_data (dict): Dictionary containing the request details
        approver_name (str): Name of the approver
        approver_role (str): Role of the approver (ISO, Department Head, CISO)
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Initialize COM for thread safety
        pythoncom.CoInitialize()
        
        # Load email template
        email_template_path = os.path.join(os.path.dirname(__file__), 'templates', 'request_approved_email.html')
        with open(email_template_path, 'r') as file:
            template = Template(file.read())
        
        # Render the email body with the template
        email_body = template.render(
            request_id=request_data.get('requestID'),
            server_name=request_data.get('serverName'),
            approval_date=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            expiration_date=request_data.get('expirationDate'),
            approver_name=approver_name,
            approver_role=approver_role,
            approval_phase=request_data.get('approvalPhase'),
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
        
        # For testing, send to test email
        mail.To = "dcfuentes@miners.utep.edu"
        mail.Subject = f"VAMP TESTING EMAIL: Request Approved - {request_data.get('requestID')}"
        mail.HTMLBody = email_body
        mail.Send()
        
        # Clean up COM resources
        pythoncom.CoUninitialize()
        
        logging.info(f"Approval email sent to dcfuentes@miners.utep.edu for request {request_data.get('requestID')}")
        return True
        
    except Exception as e:
        logging.error(f"Failed to send approval email: {str(e)}")
        return False

def send_status_update_email(request_id, status, comments):
    """
    Send an email notification when an exception request status is updated
    
    Args:
        request_id (int): ID of the exception request
        status (str): New status of the request (APPROVED, DECLINED, NEED_MORE_INFO)
        comments (str): Comments provided with the status update
    
    Returns:
        bool: True if email was sent successfully, False otherwise
    """
    try:
        # Initialize COM for thread safety
        pythoncom.CoInitialize()
        
        # Create and send the email using Outlook
        outlook = win32com.client.Dispatch("Outlook.Application")
        mail = outlook.CreateItem(0)
        
        # Create simplified email body
        body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #041E42; padding: 20px; color: white; text-align: center;">
                <h1>UTEP Information Security Office</h1>
                <h2>Vulnerability Management Program (VaMP)</h2>
            </div>
            
            <div style="padding: 20px; background-color: #f5f5f5;">
                <div style="background-color: #e1f5fe; border-left: 4px solid #03a9f4; padding: 15px; margin: 15px 0;">
                    <p><strong>Exception Request Status Update</strong></p>
                </div>
                
                <div style="background-color: #fff; border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 4px;">
                    <p><strong>Request ID:</strong> {request_id}</p>
                    <p><strong>Current Status:</strong> {status}</p>
                </div>
                
                <p>For more information, please contact the Information Security Office:</p>
                <p>Email: security@utep.edu<br>
                Phone: (915) 747-6324</p>
            </div>
            
            <div style="padding: 10px 20px; font-size: 12px; text-align: center; color: #666;">
                <p>&copy; 2024 UTEP Information Security Office • All rights reserved</p>
                <p>This email was sent automatically. Please do not reply to this message.</p>
            </div>
        </div>
        """
        
        # For testing, send to test email
        mail.To = "dcfuentes@miners.utep.edu"
        mail.Subject = f"VAMP TESTING EMAIL: Request {request_id} Status Update - {status}"
        mail.HTMLBody = body
        mail.Send()
        
        # Clean up COM resources
        pythoncom.CoUninitialize()
        
        logging.info(f"Status update email sent to dcfuentes@miners.utep.edu for request {request_id}")
        return True
        
    except Exception as e:
        logging.error(f"Failed to send status update email for request {request_id}: {str(e)}")
        return False 