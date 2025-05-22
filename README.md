# VAMP - Vulnerability Management Program

**UTEP Information Security Office**

A comprehensive vulnerability management system that integrates with Nessus scanners to provide automated vulnerability scanning, reporting, and exception request management for enterprise environments.

## 🚀 Features

### Core Functionality
- **Automated Vulnerability Scanning**: Integration with Nessus for both internal and external vulnerability assessments
- **Agent Management**: Centralized management of Nessus agents across multiple servers
- **Real-time Monitoring**: Live scan status tracking with progress indicators
- **Report Generation**: Automated PDF report generation and download
- **Exception Request Workflow**: Complete vulnerability exception request lifecycle management

### Advanced Capabilities
- **Multi-Role Authentication**: Support for regular users, department heads, and administrators
- **Approval Workflow**: Multi-stage approval process (ISO → Department Head → CISO)
- **Email Notifications**: Automated notifications for request status changes
- **Scan History**: Complete audit trail of all vulnerability scans
- **Dashboard Analytics**: Visual vulnerability distribution and severity analysis

## 🏗️ Architecture

### Frontend (React)
- **Framework**: React 18 with Ant Design UI components
- **State Management**: React Hooks with local state management
- **Routing**: React Router for navigation
- **API Integration**: Axios for HTTP requests with credential handling
- **Styling**: Custom CSS with UTEP branding + Tailwind utilities

### Backend (Python Flask)
- **Framework**: Flask with CORS support
- **Database**: SQL Server with pyodbc connector
- **External Integration**: Nessus REST API integration
- **Authentication**: Session-based authentication with role management
- **Email System**: Outlook integration via win32com for notifications

### Database Schema
- **Primary Tables**: VulnerabilityExceptionRequests, ExceptionRequestServers
- **Views**: Consolidated server and request management views
- **Triggers**: Automated RequestID generation
- **Indexes**: Optimized for performance

## 📋 Prerequisites

### System Requirements
- **Python**: 3.8+
- **Node.js**: 16+
- **SQL Server**: 2016+ or SQL Server Express
- **Nessus Scanner**: Professional or Manager license
- **Microsoft Outlook**: For email notifications

### Required Services
- Active Directory integration for user authentication
- Nessus Manager accessible via HTTPS
- SMTP/Exchange server for email delivery

## 🛠️ Installation

### Backend Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd vamp/backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment variables**
Create a `.env` file in the backend directory:
```env
SQL_CONN_STR=Driver={ODBC Driver 17 for SQL Server};Server=your-server;Database=your-db;Trusted_Connection=yes;
NESSUS_URL=https://your-nessus-server:8834
NESSUS_ACCESS_KEY=your-access-key
NESSUS_SECRET_KEY=your-secret-key
```

5. **Database Setup**
```sql
-- Run the SQL scripts in order:
-- 1. Create the main tables
-- 2. Run update_exception_requests_table.sql for enhanced schema
```

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd ../frontend/nessus-dashboard
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
Update API URLs in `src/services/nessusService.js` if needed.

4. **Start development server**
```bash
npm run dev
```

## 🚀 Deployment

### Production Deployment

#### Backend (Flask)
```bash
# Using Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app

# Or using IIS with wfastcgi (Windows)
# Configure IIS virtual directory and FastCGI module
```

#### Frontend (React)
```bash
# Build for production
npm run build

# Deploy to web server (IIS, Apache, Nginx)
# Point document root to dist/ folder
```

### Docker Deployment (Optional)
```dockerfile
# Dockerfile example for backend
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

## 🔧 Configuration

### Nessus Integration
- Configure scanner policies and templates
- Set up agent groups for organizational units
- Configure network access between VAMP and Nessus Manager

### Database Configuration
- Ensure SQL Server connectivity
- Configure appropriate user permissions
- Set up database backup and maintenance plans

### Email Configuration
- Configure Outlook integration
- Set up email templates in `backend/templates/`
- Update recipient addresses in `email_utils.py`

## 📖 Usage

### For End Users
1. **Access Dashboard**: Navigate to the web interface
2. **Agent Management**: Link Nessus agents using provided keys
3. **Scan Execution**: Launch internal or external vulnerability scans
4. **Report Download**: Generate and download PDF reports
5. **Exception Requests**: Submit vulnerability exception requests

### For Administrators
1. **User Management**: Manage user roles and permissions
2. **Scan Oversight**: Monitor all scanning activities
3. **Exception Review**: Review and approve/deny exception requests
4. **System Monitoring**: Track system performance and usage

### For Department Heads
1. **Team Oversight**: Review requests from team members
2. **Approval Process**: Participate in multi-stage approval workflow
3. **Reporting**: Access departmental vulnerability reports

## 🔐 Security Considerations

### Authentication & Authorization
- Session-based authentication with secure cookies
- Role-based access control (RBAC)
- Active Directory integration for user validation

### Data Protection
- Encrypted database connections
- Secure API communications (HTTPS only)
- Sensitive data masking in logs

### Network Security
- Firewall rules for Nessus communication
- VPN requirements for external access
- Regular security assessments

## 🐛 Known Issues & Limitations

### Current Limitations
- Email notifications currently use test addresses (needs production configuration)
- Some UI phase updates may require manual refresh
- Console logging needs cleanup for production

### Planned Improvements
- Single Sign-On (SSO) integration
- Enhanced reporting capabilities
- Mobile-responsive design improvements
- API rate limiting and throttling

## 🤝 Contributing

### Development Setup
1. Follow installation instructions above
2. Create feature branches from `main`
3. Implement changes with appropriate testing
4. Submit pull requests with detailed descriptions

### Code Standards
- **Python**: Follow PEP 8 guidelines
- **JavaScript**: Use ESLint configuration
- **SQL**: Use consistent naming conventions
- **Documentation**: Update README for any new features

## 📞 Support

### Internal Support
- **Information Security Office**: security@utep.edu
- **Technical Support**: (915) 747-6324

### Documentation
- API documentation available in `/docs`
- Database schema documentation in `/database`
- User guides available in `/docs/user-guides`

## 📄 License

This project is proprietary software developed for UTEP Information Security Office. All rights reserved.

## 🏛️ About UTEP ISO

The University of Texas at El Paso Information Security Office is responsible for maintaining the cybersecurity posture of the university. This Vulnerability Management Program (VAMP) is a critical component of our security infrastructure.

**Contact Information:**
- Address: 500 W University Ave, El Paso, TX 79968
- Phone: (915) 747-6324
- Email: security@utep.edu
- Website: https://www.utep.edu/information-resources/iso/

---

*© 2024 UTEP Information Security Office. All rights reserved.*
