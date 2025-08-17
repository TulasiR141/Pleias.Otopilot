-- Create FirstAppointments table (appointment-specific data only)
CREATE TABLE FirstAppointments (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    PatientId INT NOT NULL,
    AssessmentId INT NULL, -- Link to PatientAssessments table
    AppointmentDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    Status NVARCHAR(50) NOT NULL DEFAULT 'Scheduled', -- Scheduled, In Progress, Completed
    Duration INT NULL, -- in minutes
    PreAppointmentComments NVARCHAR(2000) NULL, -- Comments entered before starting
    AppointmentNotes NVARCHAR(2000) NULL, -- Notes during appointment
    
    -- Hearing Aid Selection (appointment outcome)
    RecommendedModel NVARCHAR(200) NULL,
    RecommendedFeatures NVARCHAR(500) NULL,
    NextSteps NVARCHAR(1000) NULL,
    
    CreatedDate DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    UpdatedDate DATETIME2 NULL,
    
    -- Foreign keys
    CONSTRAINT FK_FirstAppointments_Patients 
        FOREIGN KEY (PatientId) REFERENCES Patients(Id),
    CONSTRAINT FK_FirstAppointments_Assessments 
        FOREIGN KEY (AssessmentId) REFERENCES PatientAssessments(Id),
    
    -- Indexes
    INDEX IX_FirstAppointments_PatientId (PatientId),
    INDEX IX_FirstAppointments_Status (Status)
);