-- 1. Rename the otopilot Patients table to patient
EXEC sp_rename 'Patients', 'Patient';


-- Drop existing tables if they exist (in reverse dependency order)
IF OBJECT_ID('dbo.TinnitusMeasurements', 'U') IS NOT NULL DROP TABLE dbo.TinnitusMeasurements;
IF OBJECT_ID('dbo.SpeechDiscriminationPoints', 'U') IS NOT NULL DROP TABLE dbo.SpeechDiscriminationPoints;
IF OBJECT_ID('dbo.ToneThresholdPoints', 'U') IS NOT NULL DROP TABLE dbo.ToneThresholdPoints;
IF OBJECT_ID('dbo.Audiograms', 'U') IS NOT NULL DROP TABLE dbo.Audiograms;
IF OBJECT_ID('dbo.HearingInstrumentFittings', 'U') IS NOT NULL DROP TABLE dbo.HearingInstrumentFittings;
IF OBJECT_ID('dbo.HearingInstruments', 'U') IS NOT NULL DROP TABLE dbo.HearingInstruments;
IF OBJECT_ID('dbo.PatientActions', 'U') IS NOT NULL DROP TABLE dbo.PatientActions;
IF OBJECT_ID('dbo.Patients', 'U') IS NOT NULL DROP TABLE dbo.Patients;

-- 1. Enhanced Patients table
CREATE TABLE [dbo].[Patients](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [NOAHPatientId] [int] NULL,
    [NOAHPatientGUID] [uniqueidentifier] NULL,
    [NOAHPatientNumber] [nvarchar](50) NULL,
    [FirstName] [nvarchar](100) NOT NULL,
    [LastName] [nvarchar](100) NOT NULL,
    [MiddleName] [nvarchar](100) NULL,
    [Gender] [nvarchar](20) NOT NULL,
    [DateOfBirth] [date] NULL,
    [Age] AS (DATEDIFF(year, [DateOfBirth], GETDATE())),
    [ActivePatient] [bit] NOT NULL DEFAULT 1,
    [CreatedBy] [nvarchar](100) NULL,
    [UserId] [int] NULL,
    [Address1] [nvarchar](255) NULL,
    [Address2] [nvarchar](255) NULL,
    [Address3] [nvarchar](255) NULL,
    [City] [nvarchar](100) NULL,
    [Province] [nvarchar](100) NULL,
    [Country] [nvarchar](100) NULL,
    [Zip] [nvarchar](20) NULL,
    [Email] [nvarchar](255) NULL,
    [HomePhone] [nvarchar](50) NULL,
    [WorkPhone] [nvarchar](50) NULL,
    [MobilePhone] [nvarchar](50) NULL,
    [Insurance1] [nvarchar](100) NULL,
    [Insurance2] [nvarchar](100) NULL,
    [Physician] [nvarchar](200) NULL,
    [Referral] [nvarchar](200) NULL,
    [Other1] [nvarchar](255) NULL,
    [Other2] [nvarchar](255) NULL,
    [CreatedDate] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    [UpdatedDate] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [PK_Patients] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [IX_Patients_NOAHPatientGUID] UNIQUE ([NOAHPatientGUID])
);

-- 2. Patient Actions (visits/sessions)
CREATE TABLE [dbo].[PatientActions](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [PatientId] [int] NOT NULL,
    [TypeOfData] [nvarchar](100) NOT NULL,
    [Description] [nvarchar](500) NULL,
    [ActionDate] [datetime2](7) NOT NULL,
    [LastModifiedDate] [datetime2](7) NOT NULL,
    [PublicDataXML] [xml] NULL,
    [CreatedDate] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [PK_PatientActions] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_PatientActions_Patients] FOREIGN KEY ([PatientId]) REFERENCES [dbo].[Patients]([Id]) ON DELETE CASCADE
);

-- 3. Hearing Instruments
CREATE TABLE [dbo].[HearingInstruments](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [PatientId] [int] NOT NULL,
    [ActionId] [int] NOT NULL,
    [InstrumentTypeName] [nvarchar](200) NOT NULL,
    [SerialNumber] [nvarchar](100) NULL,
    [Ear] [nvarchar](10) NOT NULL, -- 'Left', 'Right'
    [DeviceCategoryTypeCode] [int] NULL,
    [VentType] [int] NULL,
    [EarMoldForm] [int] NULL,
    [SoundCanalType] [int] NULL,
    [BatteryTypeCode] [int] NULL,
    [SelectionDate] [datetime2](7) NOT NULL,
    [CreatedDate] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [PK_HearingInstruments] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_HearingInstruments_Patients] FOREIGN KEY ([PatientId]) REFERENCES [dbo].[Patients]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_HearingInstruments_Actions] FOREIGN KEY ([ActionId]) REFERENCES [dbo].[PatientActions]([Id]),
    CONSTRAINT [CHK_HearingInstruments_Ear] CHECK ([Ear] IN ('Left', 'Right'))
);

-- 4. Hearing Instrument Fittings
CREATE TABLE [dbo].[HearingInstrumentFittings](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [HearingInstrumentId] [int] NOT NULL,
    [PatientId] [int] NOT NULL,
    [ActionId] [int] NOT NULL,
    [FittingDate] [datetime2](7) NOT NULL,
    [FittingNotes] [nvarchar](1000) NULL,
    [CreatedDate] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [PK_HearingInstrumentFittings] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_HearingInstrumentFittings_Instruments] FOREIGN KEY ([HearingInstrumentId]) REFERENCES [dbo].[HearingInstruments]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_HearingInstrumentFittings_Patients] FOREIGN KEY ([PatientId]) REFERENCES [dbo].[Patients]([Id]),
    CONSTRAINT [FK_HearingInstrumentFittings_Actions] FOREIGN KEY ([ActionId]) REFERENCES [dbo].[PatientActions]([Id])
);

-- 5. Audiograms (main audiogram session)
CREATE TABLE [dbo].[Audiograms](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [PatientId] [int] NOT NULL,
    [ActionId] [int] NOT NULL,
    [TestDate] [datetime2](7) NOT NULL,
    [TestType] [nvarchar](100) NULL, -- 'ToneThreshold', 'SpeechDiscrimination', etc.
    [Ear] [nvarchar](10) NOT NULL, -- 'Left', 'Right', 'Both'
    [StimulusSignalType] [nvarchar](50) NULL,
    [StimulusSignalOutput] [nvarchar](100) NULL,
    [MaskingSignalType] [nvarchar](50) NULL,
    [MaskingSignalOutput] [nvarchar](100) NULL,
    [StimulusdBWeighting] [nvarchar](10) NULL,
    [MaskingdBWeighting] [nvarchar](10) NULL,
    [StimulusPresentationType] [nvarchar](50) NULL,
    [MaskingPresentationType] [nvarchar](50) NULL,
    [StimulusTransducerType] [nvarchar](50) NULL,
    [MaskingTransducerType] [nvarchar](50) NULL,
    [HearingInstrument1Condition] [nvarchar](50) NULL,
    [HearingInstrument2Condition] [nvarchar](50) NULL,
    [SpeechThresholdType] [nvarchar](50) NULL,
    [StimulusAuxiliary] [nvarchar](100) NULL,
    [CreatedDate] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [PK_Audiograms] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Audiograms_Patients] FOREIGN KEY ([PatientId]) REFERENCES [dbo].[Patients]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Audiograms_Actions] FOREIGN KEY ([ActionId]) REFERENCES [dbo].[PatientActions]([Id]),
    CONSTRAINT [CHK_Audiograms_Ear] CHECK ([Ear] IN ('Left', 'Right', 'Both', 'Binaural'))
);

-- 6. Tone Threshold Points (individual frequency measurements)
CREATE TABLE [dbo].[ToneThresholdPoints](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [AudiogramId] [int] NOT NULL,
    [StimulusFrequency] [int] NOT NULL,
    [StimulusLevel] [decimal](5,1) NOT NULL,
    [MaskingFrequency] [int] NULL,
    [MaskingLevel] [decimal](5,1) NULL,
    [TonePointStatus] [nvarchar](50) NOT NULL,
    [AdditionalStimulusLevel] [decimal](5,1) NULL,
    [AdditionalMaskingLevel] [decimal](5,1) NULL,
    [CreatedDate] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [PK_ToneThresholdPoints] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_ToneThresholdPoints_Audiograms] FOREIGN KEY ([AudiogramId]) REFERENCES [dbo].[Audiograms]([Id]) ON DELETE CASCADE
);

-- 7. Speech Discrimination Points
CREATE TABLE [dbo].[SpeechDiscriminationPoints](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [AudiogramId] [int] NOT NULL,
    [StimulusLevel] [decimal](5,1) NOT NULL,
    [ScorePercent] [decimal](5,1) NOT NULL,
    [NumberOfWords] [int] NOT NULL,
    [SpeechPointStatus] [nvarchar](50) NOT NULL,
    [CreatedDate] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [PK_SpeechDiscriminationPoints] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_SpeechDiscriminationPoints_Audiograms] FOREIGN KEY ([AudiogramId]) REFERENCES [dbo].[Audiograms]([Id]) ON DELETE CASCADE
);

-- 8. Tinnitus Measurements
CREATE TABLE [dbo].[TinnitusMeasurements](
    [Id] [int] IDENTITY(1,1) NOT NULL,
    [PatientId] [int] NOT NULL,
    [ActionId] [int] NOT NULL,
    [TestDate] [datetime2](7) NOT NULL,
    [MeasurementType] [nvarchar](50) NOT NULL, -- 'PitchMatch', 'LoudnessMatch'
    [Ear] [nvarchar](10) NOT NULL,
    [StimulusFrequency] [int] NULL,
    [StimulusIntensity] [decimal](5,1) NULL,
    [StimulusUnit] [nvarchar](10) NULL,
    [MaskingFrequency] [int] NULL,
    [MaskingIntensity] [decimal](5,1) NULL,
    [MaskingUnit] [nvarchar](10) NULL,
    [StimulusSignalType] [nvarchar](50) NULL,
    [MaskingSignalType] [nvarchar](50) NULL,
    [CreatedDate] [datetime2](7) NOT NULL DEFAULT GETDATE(),
    
    CONSTRAINT [PK_TinnitusMeasurements] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_TinnitusMeasurements_Patients] FOREIGN KEY ([PatientId]) REFERENCES [dbo].[Patients]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_TinnitusMeasurements_Actions] FOREIGN KEY ([ActionId]) REFERENCES [dbo].[PatientActions]([Id]),
    CONSTRAINT [CHK_TinnitusMeasurements_Ear] CHECK ([Ear] IN ('Left', 'Right'))
);

-- Create indexes for better performance
CREATE INDEX [IX_PatientActions_PatientId_ActionDate] ON [dbo].[PatientActions] ([PatientId], [ActionDate]);
CREATE INDEX [IX_Audiograms_PatientId_TestDate] ON [dbo].[Audiograms] ([PatientId], [TestDate]);
CREATE INDEX [IX_ToneThresholdPoints_AudiogramId_Frequency] ON [dbo].[ToneThresholdPoints] ([AudiogramId], [StimulusFrequency]);
CREATE INDEX [IX_HearingInstruments_PatientId_Date] ON [dbo].[HearingInstruments] ([PatientId], [SelectionDate]);

-- Add update triggers for UpdatedDate
CREATE TRIGGER [TR_Patients_UpdatedDate] 
ON [dbo].[Patients] 
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [dbo].[Patients] 
    SET [UpdatedDate] = GETDATE()
    FROM [dbo].[Patients] p
    INNER JOIN inserted i ON p.[Id] = i.[Id];
END;