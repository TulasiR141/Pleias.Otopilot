-- Add column to store database filters as JSON in AssessmentAnswers table 
-- execute line by line
ALTER TABLE AssessmentAnswers 
ADD DatabaseFilters NVARCHAR(MAX) NULL;



-- Add index for better performance when querying filters
CREATE INDEX IX_AssessmentAnswers_DatabaseFilters 
ON AssessmentAnswers (PatientAssessmentId) 
WHERE DatabaseFilters IS NOT NULL;

ALTER TABLE AssessmentAnswers ADD NodeType NVARCHAR(50);