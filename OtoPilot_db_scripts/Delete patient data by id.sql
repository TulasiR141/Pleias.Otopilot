
-- ==============================================
-- SCRIPT 2: DELETE SPECIFIC PATIENT AND RELATED DATA
-- ==============================================

DECLARE @PatientId INT = 3; -- Change this to the desired patient ID

-- Delete in reverse dependency order for specific patient

-- 1. Delete ToneThresholdPoints for this patient
DELETE ttp FROM [dbo].[ToneThresholdPoints] ttp
INNER JOIN [dbo].[Audiograms] a ON ttp.[AudiogramId] = a.[Id]
WHERE a.[PatientId] = @PatientId;

-- 2. Delete SpeechDiscriminationPoints for this patient
DELETE sdp FROM [dbo].[SpeechDiscriminationPoints] sdp
INNER JOIN [dbo].[Audiograms] a ON sdp.[AudiogramId] = a.[Id]
WHERE a.[PatientId] = @PatientId;

-- 3. Delete HearingInstrumentFittings for this patient
DELETE hif FROM [dbo].[HearingInstrumentFittings] hif
INNER JOIN [dbo].[HearingInstruments] hi ON hif.[HearingInstrumentId] = hi.[Id]
WHERE hi.[PatientId] = @PatientId;

-- 4. Delete HearingInstruments for this patient
DELETE FROM [dbo].[HearingInstruments] 
WHERE [PatientId] = @PatientId;

-- 5. Delete Audiograms for this patient
DELETE FROM [dbo].[Audiograms] 
WHERE [PatientId] = @PatientId;

-- 6. Delete TinnitusMeasurements for this patient
DELETE FROM [dbo].[TinnitusMeasurements] 
WHERE [PatientId] = @PatientId;

-- 7. Delete PatientActions for this patient
DELETE FROM [dbo].[PatientActions] 
WHERE [PatientId] = @PatientId;

-- 8. Delete the Patient record
DELETE FROM [dbo].[Patients] 
WHERE [Id] = @PatientId;

