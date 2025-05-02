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
        
        mail.To = "security@utep.edu"
        mail.Subject = f"VAMP TESTING EMAIL: New Vulnerability Exception Request - {request_data.get('serverName')}"
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
        
        mail.To = request_data.get('requesterEmail')
        mail.Subject = f"Additional Information Required - Request {request_data.get('requestID')}"
        mail.HTMLBody = email_body
        mail.Send()
        
        # Clean up COM resources
        pythoncom.CoUninitialize()
        
        logging.info(f"Need more info email sent to {request_data.get('requesterEmail')} for request {request_data.get('requestID')}")
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
        
        mail.To = request_data.get('requesterEmail')
        mail.Subject = f"Request Declined - {request_data.get('requestID')}"
        mail.HTMLBody = email_body
        mail.Send()
        
        # Clean up COM resources
        pythoncom.CoUninitialize()
        
        logging.info(f"Decline email sent to {request_data.get('requesterEmail')} for request {request_data.get('requestID')}")
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
        
        mail.To = request_data.get('requesterEmail')
        mail.Subject = f"Request Approved - {request_data.get('requestID')}"
        mail.HTMLBody = email_body
        mail.Send()
        
        # Clean up COM resources
        pythoncom.CoUninitialize()
        
        logging.info(f"Approval email sent to {request_data.get('requesterEmail')} for request {request_data.get('requestID')}")
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
        
        # Set email subject based on status
        subject_prefix = "VAMP TESTING EMAIL: "
        if status == 'APPROVED':
            subject = f"{subject_prefix}Exception Request Approved - Request #{request_id}"
        elif status == 'DECLINED':
            subject = f"{subject_prefix}Exception Request Declined - Request #{request_id}"
        else:  # NEED_MORE_INFO
            subject = f"{subject_prefix}Additional Information Needed - Request #{request_id}"
        
        # Create email body
        body = f"""
        <p>Your vulnerability exception request (ID: {request_id}) has been reviewed.</p>
        <p><strong>Status:</strong> {status}</p>
        """
        
        if comments:
            body += f"<p><strong>Comments:</strong> {comments}</p>"
            
        body += """
        <p>You can view the full details of your request in the VaMP portal:</p>
        <p><a href="http://localhost:5173/exception-requests">View Request</a></p>
        """
        
        # For testing, send to a test email address
        mail.To = "dcfuentes2@miners.utep.edu"
        mail.Subject = subject
        mail.HTMLBody = body
        mail.Send()
        
        # Clean up COM resources
        pythoncom.CoUninitialize()
        
        logging.info(f"Status update email sent for request {request_id}")
        return True
        
    except Exception as e:
        logging.error(f"Failed to send status update email for request {request_id}: {str(e)}")
        return False 