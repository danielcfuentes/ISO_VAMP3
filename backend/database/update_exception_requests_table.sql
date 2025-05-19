-- Add new columns for approval process
ALTER TABLE VulnerabilityExceptionRequests
ADD ApprovalPhase VARCHAR(50) DEFAULT 'ISO_REVIEW',
    ISO_Status VARCHAR(50) DEFAULT 'PENDING',
    ISO_Comments TEXT,
    ISO_ReviewedBy VARCHAR(100),
    ISO_ReviewDate DATETIME,
    DeptHead_Status VARCHAR(50) DEFAULT 'PENDING',
    DeptHead_Comments TEXT,
    DeptHead_ReviewDate DATETIME,
    CISO_Status VARCHAR(50) DEFAULT 'PENDING',
    CISO_Comments TEXT,
    CISO_ReviewDate DATETIME,
    LastModifiedBy VARCHAR(100),
    Resubmitted BIT DEFAULT 0,
    RequestID VARCHAR(20);

-- Drop existing trigger and function if they exist
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_GenerateRequestID')
    DROP TRIGGER trg_GenerateRequestID;
GO

IF EXISTS (SELECT * FROM sys.objects WHERE name = 'GenerateRequestID' AND type = 'FN')
    DROP FUNCTION dbo.GenerateRequestID;
GO

-- Create an improved function to generate RequestID
CREATE FUNCTION dbo.GenerateRequestID()
RETURNS VARCHAR(20)
AS
BEGIN
    DECLARE @Year VARCHAR(4) = CAST(YEAR(GETDATE()) AS VARCHAR(4))
    DECLARE @Month VARCHAR(2) = RIGHT('0' + CAST(MONTH(GETDATE()) AS VARCHAR(2)), 2)
    DECLARE @Day VARCHAR(2) = RIGHT('0' + CAST(DAY(GETDATE()) AS VARCHAR(2)), 2)
    DECLARE @Counter VARCHAR(4)
    
    -- Get the count of requests for today
    SELECT @Counter = RIGHT('0000' + CAST(
        ISNULL(
            (SELECT MAX(CAST(RIGHT(RequestID, 4) AS INT))
            FROM VulnerabilityExceptionRequests
            WHERE RequestID LIKE 'REQ-' + @Year + @Month + @Day + '-%'),
            0
        ) + 1 AS VARCHAR(4)
    ), 4)
    
    RETURN 'REQ-' + @Year + @Month + @Day + '-' + @Counter
END
GO

-- Create a new table for server details
CREATE TABLE ExceptionRequestServers (
    ID INT IDENTITY(1,1) PRIMARY KEY,
    RequestID INT NOT NULL,
    ServerName VARCHAR(255) NOT NULL,
    Justification TEXT,
    Mitigation TEXT,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (RequestID) REFERENCES VulnerabilityExceptionRequests(ID) ON DELETE CASCADE
);

-- Add a new column to track if the request has multiple servers
ALTER TABLE VulnerabilityExceptionRequests
ADD HasMultipleServers BIT DEFAULT 0;

-- Create an index on the RequestID column for better performance
CREATE INDEX IX_ExceptionRequestServers_RequestID ON ExceptionRequestServers(RequestID);

-- Update the trigger to handle multiple servers
ALTER TRIGGER trg_GenerateRequestID
ON VulnerabilityExceptionRequests
INSTEAD OF INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    -- First insert into VulnerabilityExceptionRequests
    INSERT INTO VulnerabilityExceptionRequests (
        ServerName, RequesterFirstName, RequesterLastName, RequesterDepartment,
        RequesterJobDescription, RequesterEmail, RequesterPhone,
        DepartmentHeadUsername, DepartmentHeadFirstName, DepartmentHeadLastName,
        DepartmentHeadDepartment, DepartmentHeadJobDescription, DepartmentHeadEmail,
        DepartmentHeadPhone, ApproverUsername, DataClassification,
        ExceptionDurationType, ExpirationDate, UsersAffected, DataAtRisk,
        Vulnerabilities, Justification, Mitigation, TermsAccepted,
        Status, DeclineReason, RequestedBy, RequestedDate, CreatedAt, UpdatedAt,
        ExceptionType, RequestID, ApprovalPhase, HasMultipleServers,
        ISO_Status, ISO_Comments, ISO_ReviewedBy, ISO_ReviewDate,
        DeptHead_Status, DeptHead_Comments, DeptHead_ReviewDate,
        CISO_Status, CISO_Comments, CISO_ReviewDate,
        LastModifiedBy, Resubmitted
    )
    OUTPUT inserted.ID, inserted.ServerName, inserted.Justification, inserted.Mitigation
    INTO @ServerDetails (RequestID, ServerName, Justification, Mitigation)
    SELECT 
        i.ServerName, i.RequesterFirstName, i.RequesterLastName, i.RequesterDepartment,
        i.RequesterJobDescription, i.RequesterEmail, i.RequesterPhone,
        i.DepartmentHeadUsername, i.DepartmentHeadFirstName, i.DepartmentHeadLastName,
        i.DepartmentHeadDepartment, i.DepartmentHeadJobDescription, i.DepartmentHeadEmail,
        i.DepartmentHeadPhone, i.ApproverUsername, i.DataClassification,
        i.ExceptionDurationType, i.ExpirationDate, i.UsersAffected, i.DataAtRisk,
        i.Vulnerabilities, i.Justification, i.Mitigation, i.TermsAccepted,
        i.Status, i.DeclineReason, i.RequestedBy, i.RequestedDate, i.CreatedAt, i.UpdatedAt,
        i.ExceptionType, dbo.GenerateRequestID(), ISNULL(i.ApprovalPhase, 'ISO_REVIEW'),
        ISNULL(i.HasMultipleServers, 0),
        ISNULL(i.ISO_Status, 'PENDING'), i.ISO_Comments, i.ISO_ReviewedBy, i.ISO_ReviewDate,
        ISNULL(i.DeptHead_Status, 'PENDING'), i.DeptHead_Comments, i.DeptHead_ReviewDate,
        ISNULL(i.CISO_Status, 'PENDING'), i.CISO_Comments, i.CISO_ReviewDate,
        i.LastModifiedBy, ISNULL(i.Resubmitted, 0)
    FROM inserted i;

    -- Then insert server details if provided
    IF EXISTS (SELECT 1 FROM @ServerDetails)
    BEGIN
        INSERT INTO ExceptionRequestServers (RequestID, ServerName, Justification, Mitigation)
        SELECT RequestID, ServerName, Justification, Mitigation
        FROM @ServerDetails;
    END
END
GO

-- Create a view to easily get all server details for a request
CREATE VIEW vw_ExceptionRequestServers AS
SELECT 
    r.RequestID,
    r.ID as RequestID_Internal,
    s.ServerName,
    s.Justification,
    s.Mitigation,
    r.ExceptionType,
    r.Status,
    r.ApprovalPhase,
    r.CreatedAt,
    r.UpdatedAt
FROM VulnerabilityExceptionRequests r
LEFT JOIN ExceptionRequestServers s ON r.ID = s.RequestID
WHERE r.HasMultipleServers = 1
UNION ALL
SELECT 
    r.RequestID,
    r.ID as RequestID_Internal,
    r.ServerName,
    r.Justification,
    r.Mitigation,
    r.ExceptionType,
    r.Status,
    r.ApprovalPhase,
    r.CreatedAt,
    r.UpdatedAt
FROM VulnerabilityExceptionRequests r
WHERE r.HasMultipleServers = 0;
GO

-- Make sure RequestID is NOT NULL
IF EXISTS (SELECT * FROM sys.columns 
           WHERE object_id = OBJECT_ID('VulnerabilityExceptionRequests')
           AND name = 'RequestID'
           AND is_nullable = 1)
BEGIN
    -- Update any NULL RequestIDs first
    UPDATE VulnerabilityExceptionRequests
    SET RequestID = dbo.GenerateRequestID()
    WHERE RequestID IS NULL;

    -- Then alter the column to be NOT NULL
    ALTER TABLE VulnerabilityExceptionRequests
    ALTER COLUMN RequestID VARCHAR(20) NOT NULL;
END
GO 