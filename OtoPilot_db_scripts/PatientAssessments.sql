-- Add these to your existing database
CREATE TABLE PatientAssessments (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    PatientId INT NOT NULL,
    Status NVARCHAR(500) NOT NULL DEFAULT 'In Progress',
    StartDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CompletedDate DATETIME2 NULL,
    TotalQuestions INT NOT NULL DEFAULT 0,
    FinalNodeId NVARCHAR(1000) NULL,
    FinalAction NVARCHAR(5000) NULL,
    CurrentNodeId NVARCHAR(1000) NULL
);

