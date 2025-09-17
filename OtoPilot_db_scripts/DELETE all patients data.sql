-- DELETE SCRIPTS FOR PATIENT DATA
-- Execute in the exact order shown to respect foreign key constraints

-- ==============================================
-- SCRIPT 1: DELETE ALL PATIENTS AND RELATED DATA
-- ==============================================

-- Delete in reverse dependency order (deepest to shallowest)

-- 1. Delete ToneThresholdPoints (references Audiograms)
DELETE ttp FROM [dbo].[ToneThresholdPoints] ttp
INNER JOIN [dbo].[Audiograms] a ON ttp.[AudiogramId] = a.[Id];

-- 2. Delete SpeechDiscriminationPoints (references Audiograms)
DELETE sdp FROM [dbo].[SpeechDiscriminationPoints] sdp
INNER JOIN [dbo].[Audiograms] a ON sdp.[AudiogramId] = a.[Id];

-- 3. Delete HearingInstrumentFittings (references HearingInstruments)
DELETE hif FROM [dbo].[HearingInstrumentFittings] hif
INNER JOIN [dbo].[HearingInstruments] hi ON hif.[HearingInstrumentId] = hi.[Id];

-- 4. Delete HearingInstruments (references Patients)
DELETE FROM [dbo].[HearingInstruments];

-- 5. Delete Audiograms (references Patients)
DELETE FROM [dbo].[Audiograms];

-- 6. Delete TinnitusMeasurements (references Patients)
DELETE FROM [dbo].[TinnitusMeasurements];

-- 7. Delete PatientActions (references Patients)
DELETE FROM [dbo].[PatientActions];

-- 8. Delete Patients (main table)
DELETE FROM [dbo].[Patients];
