CREATE TABLE AssessmentAnswers (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    PatientAssessmentId INT NOT NULL,
    QuestionId NVARCHAR(100) NOT NULL,
    QuestionText NVARCHAR(1000) NULL,
    Answer NVARCHAR(5000) NOT NULL,
    Timestamp DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    SequenceNumber INT NOT NULL,
    CONSTRAINT FK_AssessmentAnswers_PatientAssessments 
        FOREIGN KEY (PatientAssessmentId) 
        REFERENCES PatientAssessments(Id) 
        ON DELETE CASCADE
);