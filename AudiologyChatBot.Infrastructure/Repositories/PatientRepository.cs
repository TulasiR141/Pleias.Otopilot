using Microsoft.Data.SqlClient;
using AudiologyChatBot.Core.Models;
using AudiologyChatBot.Core.Interfaces;
using Microsoft.Extensions.Configuration;

namespace AudiologyChatBot.Infrastructure.Repositories
{
    public class PatientRepository : IPatientRepository
    {
        private readonly string _connectionString;

        public PatientRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string not found");
        }

        public async Task<List<PatientModel>> GetAllPatientsAsync()
        {
            var patients = new List<PatientModel>();

            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            var query = @"
                SELECT  Id, NOAHPatientId, NOAHPatientGUID, NOAHPatientNumber, 
                        FirstName, LastName, MiddleName, Gender, DateOfBirth,
                        ActivePatient, CreatedBy, UserId,
                        Address1, Address2, Address3, City, Province, Country, Zip,
                        Email, HomePhone, WorkPhone, MobilePhone,
                        Insurance1, Insurance2, Physician, Referral,
                        Other1, Other2, CreatedDate, UpdatedDate
                FROM Patients 
                WHERE ActivePatient = 1
                ORDER BY Id";

            using var command = new SqlCommand(query, connection);
            using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                patients.Add(new PatientModel
                {
                    Id = reader.GetInt32(0), // Id
                    NOAHPatientId = reader.IsDBNull(1) ? null : reader.GetInt32(1), // NOAHPatientId
                    NOAHPatientGUID = reader.IsDBNull(2) ? null : reader.GetGuid(2), // NOAHPatientGUID
                    NOAHPatientNumber = reader.IsDBNull(3) ? null : reader.GetString(3), // NOAHPatientNumber
                    FirstName = reader.GetString(4), // FirstName
                    LastName = reader.GetString(5), // LastName
                    MiddleName = reader.IsDBNull(6) ? null : reader.GetString(6), // MiddleName
                    Gender = reader.GetString(7), // Gender
                    DateOfBirth = reader.IsDBNull(8) ? null : reader.GetDateTime(8), // DateOfBirth
                    ActivePatient = reader.GetBoolean(9), // ActivePatient
                    CreatedBy = reader.IsDBNull(10) ? null : reader.GetString(10), // CreatedBy
                    UserId = reader.IsDBNull(11) ? null : reader.GetInt32(11), // UserId
                    Address1 = reader.IsDBNull(12) ? null : reader.GetString(12), // Address1
                    Address2 = reader.IsDBNull(13) ? null : reader.GetString(13), // Address2
                    Address3 = reader.IsDBNull(14) ? null : reader.GetString(14), // Address3
                    City = reader.IsDBNull(15) ? null : reader.GetString(15), // City
                    Province = reader.IsDBNull(16) ? null : reader.GetString(16), // Province
                    Country = reader.IsDBNull(17) ? null : reader.GetString(17), // Country
                    Zip = reader.IsDBNull(18) ? null : reader.GetString(18), // Zip
                    Email = reader.IsDBNull(19) ? null : reader.GetString(19), // Email
                    HomePhone = reader.IsDBNull(20) ? null : reader.GetString(20), // HomePhone
                    WorkPhone = reader.IsDBNull(21) ? null : reader.GetString(21), // WorkPhone
                    MobilePhone = reader.IsDBNull(22) ? null : reader.GetString(22), // MobilePhone
                    Insurance1 = reader.IsDBNull(23) ? null : reader.GetString(23), // Insurance1
                    Insurance2 = reader.IsDBNull(24) ? null : reader.GetString(24), // Insurance2
                    Physician = reader.IsDBNull(25) ? null : reader.GetString(25), // Physician
                    Referral = reader.IsDBNull(26) ? null : reader.GetString(26), // Referral
                    Other1 = reader.IsDBNull(27) ? null : reader.GetString(27), // Other1
                    Other2 = reader.IsDBNull(28) ? null : reader.GetString(28), // Other2
                    CreatedDate = reader.GetDateTime(29), // CreatedDate
                    UpdatedDate = reader.GetDateTime(30) // UpdatedDate
                });
            }

            return patients;
        }

        public async Task<PatientModel?> GetPatientByIdAsync(int id, bool includeRelatedData = false)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            if (!includeRelatedData)
            {
                var query = @"
            SELECT  Id, NOAHPatientId, NOAHPatientGUID, NOAHPatientNumber, 
                    FirstName, LastName, MiddleName, Gender, DateOfBirth,
                    ActivePatient, CreatedBy, UserId,
                    Address1, Address2, Address3, City, Province, Country, Zip,
                    Email, HomePhone, WorkPhone, MobilePhone,
                    Insurance1, Insurance2, Physician, Referral,
                    Other1, Other2, CreatedDate, UpdatedDate
            FROM Patients 
            WHERE Id = @Id AND ActivePatient = 1";

                using var command = new SqlCommand(query, connection);
                command.Parameters.AddWithValue("@Id", id);

                using var reader = await command.ExecuteReaderAsync();

                if (await reader.ReadAsync())
                {
                    return new PatientModel
                    {
                        Id = reader.GetInt32(0),
                        NOAHPatientId = reader.IsDBNull(1) ? null : reader.GetInt32(1),
                        NOAHPatientGUID = reader.IsDBNull(2) ? null : reader.GetGuid(2),
                        NOAHPatientNumber = reader.IsDBNull(3) ? null : reader.GetString(3),
                        FirstName = reader.GetString(4),
                        LastName = reader.GetString(5),
                        MiddleName = reader.IsDBNull(6) ? null : reader.GetString(6),
                        Gender = reader.GetString(7),
                        DateOfBirth = reader.IsDBNull(8) ? null : reader.GetDateTime(8),
                        ActivePatient = reader.GetBoolean(9),
                        CreatedBy = reader.IsDBNull(10) ? null : reader.GetString(10),
                        UserId = reader.IsDBNull(11) ? null : reader.GetInt32(11),
                        Address1 = reader.IsDBNull(12) ? null : reader.GetString(12),
                        Address2 = reader.IsDBNull(13) ? null : reader.GetString(13),
                        Address3 = reader.IsDBNull(14) ? null : reader.GetString(14),
                        City = reader.IsDBNull(15) ? null : reader.GetString(15),
                        Province = reader.IsDBNull(16) ? null : reader.GetString(16),
                        Country = reader.IsDBNull(17) ? null : reader.GetString(17),
                        Zip = reader.IsDBNull(18) ? null : reader.GetString(18),
                        Email = reader.IsDBNull(19) ? null : reader.GetString(19),
                        HomePhone = reader.IsDBNull(20) ? null : reader.GetString(20),
                        WorkPhone = reader.IsDBNull(21) ? null : reader.GetString(21),
                        MobilePhone = reader.IsDBNull(22) ? null : reader.GetString(22),
                        Insurance1 = reader.IsDBNull(23) ? null : reader.GetString(23),
                        Insurance2 = reader.IsDBNull(24) ? null : reader.GetString(24),
                        Physician = reader.IsDBNull(25) ? null : reader.GetString(25),
                        Referral = reader.IsDBNull(26) ? null : reader.GetString(26),
                        Other1 = reader.IsDBNull(27) ? null : reader.GetString(27),
                        Other2 = reader.IsDBNull(28) ? null : reader.GetString(28),
                        CreatedDate = reader.GetDateTime(29),
                        UpdatedDate = reader.GetDateTime(30)
                    };
                }
                return null;
            }
            else
            {
                // New behavior - return patient with all related data
                return await GetPatientWithRelatedDataAsync(id, connection);
            }
        }

        private async Task<PatientModel?> GetPatientWithRelatedDataAsync(int id, SqlConnection connection)
        {
            // First get the patient
            var patientQuery = @"
        SELECT  Id, NOAHPatientId, NOAHPatientGUID, NOAHPatientNumber, 
                FirstName, LastName, MiddleName, Gender, DateOfBirth,
                ActivePatient, CreatedBy, UserId,
                Address1, Address2, Address3, City, Province, Country, Zip,
                Email, HomePhone, WorkPhone, MobilePhone,
                Insurance1, Insurance2, Physician, Referral,
                Other1, Other2, CreatedDate, UpdatedDate
        FROM Patients 
        WHERE Id = @Id";

            using var patientCommand = new SqlCommand(patientQuery, connection);
            patientCommand.Parameters.AddWithValue("@Id", id);
            using var patientReader = await patientCommand.ExecuteReaderAsync();

            PatientModel? patient = null;
            if (await patientReader.ReadAsync())
            {
                patient = new PatientModel
                {
                    Id = patientReader.GetInt32(0),
                    NOAHPatientId = patientReader.IsDBNull(1) ? null : patientReader.GetInt32(1),
                    NOAHPatientGUID = patientReader.IsDBNull(2) ? null : patientReader.GetGuid(2),
                    NOAHPatientNumber = patientReader.IsDBNull(3) ? null : patientReader.GetString(3),
                    FirstName = patientReader.GetString(4),
                    LastName = patientReader.GetString(5),
                    MiddleName = patientReader.IsDBNull(6) ? null : patientReader.GetString(6),
                    Gender = patientReader.GetString(7),
                    DateOfBirth = patientReader.IsDBNull(8) ? null : patientReader.GetDateTime(8),
                    ActivePatient = patientReader.GetBoolean(9),
                    CreatedBy = patientReader.IsDBNull(10) ? null : patientReader.GetString(10),
                    UserId = patientReader.IsDBNull(11) ? null : patientReader.GetInt32(11),
                    Address1 = patientReader.IsDBNull(12) ? null : patientReader.GetString(12),
                    Address2 = patientReader.IsDBNull(13) ? null : patientReader.GetString(13),
                    Address3 = patientReader.IsDBNull(14) ? null : patientReader.GetString(14),
                    City = patientReader.IsDBNull(15) ? null : patientReader.GetString(15),
                    Province = patientReader.IsDBNull(16) ? null : patientReader.GetString(16),
                    Country = patientReader.IsDBNull(17) ? null : patientReader.GetString(17),
                    Zip = patientReader.IsDBNull(18) ? null : patientReader.GetString(18),
                    Email = patientReader.IsDBNull(19) ? null : patientReader.GetString(19),
                    HomePhone = patientReader.IsDBNull(20) ? null : patientReader.GetString(20),
                    WorkPhone = patientReader.IsDBNull(21) ? null : patientReader.GetString(21),
                    MobilePhone = patientReader.IsDBNull(22) ? null : patientReader.GetString(22),
                    Insurance1 = patientReader.IsDBNull(23) ? null : patientReader.GetString(23),
                    Insurance2 = patientReader.IsDBNull(24) ? null : patientReader.GetString(24),
                    Physician = patientReader.IsDBNull(25) ? null : patientReader.GetString(25),
                    Referral = patientReader.IsDBNull(26) ? null : patientReader.GetString(26),
                    Other1 = patientReader.IsDBNull(27) ? null : patientReader.GetString(27),
                    Other2 = patientReader.IsDBNull(28) ? null : patientReader.GetString(28),
                    CreatedDate = patientReader.GetDateTime(29),
                    UpdatedDate = patientReader.GetDateTime(30)
                };
            }
            await patientReader.CloseAsync();

            if (patient == null) return null;

            // Get PatientActions
            var actionsQuery = @"
        SELECT Id, PatientId, TypeOfData, Description, ActionDate, LastModifiedDate, PublicDataXML
        FROM PatientActions 
        WHERE PatientId = @PatientId
        ORDER BY ActionDate DESC";

            using var actionsCommand = new SqlCommand(actionsQuery, connection);
            actionsCommand.Parameters.AddWithValue("@PatientId", id);
            using var actionsReader = await actionsCommand.ExecuteReaderAsync();

            while (await actionsReader.ReadAsync())
            {
                var action = new PatientActionModel
                {
                    Id = actionsReader.GetInt32(0),
                    PatientId = actionsReader.GetInt32(1),
                    TypeOfData = actionsReader.IsDBNull(2) ? null : actionsReader.GetString(2),
                    Description = actionsReader.IsDBNull(3) ? null : actionsReader.GetString(3),
                    ActionDate = actionsReader.GetDateTime(4),
                    LastModifiedDate = actionsReader.GetDateTime(5),
                    PublicDataXML = actionsReader.IsDBNull(6) ? null : actionsReader.GetString(6)
                };
                patient.Actions.Add(action);
            }
            await actionsReader.CloseAsync();

            // Get all audiograms for this patient
            var audiogramsQuery = @"
        SELECT Id, PatientId, ActionId, TestDate, TestType, Ear, StimulusSignalType, StimulusSignalOutput,
               MaskingSignalType, MaskingSignalOutput, StimulusdBWeighting, MaskingdBWeighting,
               StimulusPresentationType, MaskingPresentationType, StimulusTransducerType, MaskingTransducerType,
               HearingInstrument1Condition, HearingInstrument2Condition, SpeechThresholdType, StimulusAuxiliary
        FROM Audiograms 
        WHERE PatientId = @PatientId
        ORDER BY TestDate DESC";

            using var audiogramsCommand = new SqlCommand(audiogramsQuery, connection);
            audiogramsCommand.Parameters.AddWithValue("@PatientId", id);
            using var audiogramsReader = await audiogramsCommand.ExecuteReaderAsync();

            var audiograms = new List<AudiogramModel>();
            while (await audiogramsReader.ReadAsync())
            {
                var audiogram = new AudiogramModel
                {
                    Id = audiogramsReader.GetInt32(0),
                    PatientId = audiogramsReader.GetInt32(1),
                    ActionId = audiogramsReader.GetInt32(2),
                    TestDate = audiogramsReader.GetDateTime(3),
                    TestType = audiogramsReader.IsDBNull(4) ? null : audiogramsReader.GetString(4),
                    Ear = audiogramsReader.IsDBNull(5) ? null : audiogramsReader.GetString(5),
                    StimulusSignalType = audiogramsReader.IsDBNull(6) ? null : audiogramsReader.GetString(6),
                    StimulusSignalOutput = audiogramsReader.IsDBNull(7) ? null : audiogramsReader.GetString(7),
                    MaskingSignalType = audiogramsReader.IsDBNull(8) ? null : audiogramsReader.GetString(8),
                    MaskingSignalOutput = audiogramsReader.IsDBNull(9) ? null : audiogramsReader.GetString(9),
                    StimulusdBWeighting = audiogramsReader.IsDBNull(10) ? null : audiogramsReader.GetString(10),
                    MaskingdBWeighting = audiogramsReader.IsDBNull(11) ? null : audiogramsReader.GetString(11),
                    StimulusPresentationType = audiogramsReader.IsDBNull(12) ? null : audiogramsReader.GetString(12),
                    MaskingPresentationType = audiogramsReader.IsDBNull(13) ? null : audiogramsReader.GetString(13),
                    StimulusTransducerType = audiogramsReader.IsDBNull(14) ? null : audiogramsReader.GetString(14),
                    MaskingTransducerType = audiogramsReader.IsDBNull(15) ? null : audiogramsReader.GetString(15),
                    HearingInstrument1Condition = audiogramsReader.IsDBNull(16) ? null : audiogramsReader.GetString(16),
                    HearingInstrument2Condition = audiogramsReader.IsDBNull(17) ? null : audiogramsReader.GetString(17),
                    SpeechThresholdType = audiogramsReader.IsDBNull(18) ? null : audiogramsReader.GetString(18),
                    StimulusAuxiliary = audiogramsReader.IsDBNull(19) ? null : audiogramsReader.GetString(19)
                };
                audiograms.Add(audiogram);
            }
            await audiogramsReader.CloseAsync();

            // For each audiogram, get tone threshold points and speech discrimination points
            foreach (var audiogram in audiograms)
            {
                // Get tone threshold points
                var tonePointsQuery = @"
            SELECT Id, AudiogramId, StimulusFrequency, StimulusLevel, MaskingFrequency, MaskingLevel,
                   TonePointStatus, AdditionalStimulusLevel, AdditionalMaskingLevel
            FROM ToneThresholdPoints 
            WHERE AudiogramId = @AudiogramId
            ORDER BY StimulusFrequency";

                using var toneCommand = new SqlCommand(tonePointsQuery, connection);
                toneCommand.Parameters.AddWithValue("@AudiogramId", audiogram.Id);
                using var toneReader = await toneCommand.ExecuteReaderAsync();

                while (await toneReader.ReadAsync())
                {
                    var tonePoint = new ToneThresholdPointModel
                    {
                        Id = toneReader.GetInt32(0),
                        AudiogramId = toneReader.GetInt32(1),
                        StimulusFrequency = toneReader.GetInt32(2),
                        StimulusLevel = toneReader.GetDecimal(3),
                        MaskingFrequency = toneReader.IsDBNull(4) ? null : toneReader.GetInt32(4),
                        MaskingLevel = toneReader.IsDBNull(5) ? null : toneReader.GetDecimal(5),
                        TonePointStatus = toneReader.IsDBNull(6) ? null : toneReader.GetString(6),
                        AdditionalStimulusLevel = toneReader.IsDBNull(7) ? null : toneReader.GetDecimal(7),
                        AdditionalMaskingLevel = toneReader.IsDBNull(8) ? null : toneReader.GetDecimal(8)
                    };
                    audiogram.TonePoints.Add(tonePoint);
                }
                await toneReader.CloseAsync();

                // Get speech discrimination points
                var speechPointsQuery = @"
            SELECT Id, AudiogramId, StimulusLevel, ScorePercent, NumberOfWords, SpeechPointStatus
            FROM SpeechDiscriminationPoints 
            WHERE AudiogramId = @AudiogramId
            ORDER BY StimulusLevel";

                using var speechCommand = new SqlCommand(speechPointsQuery, connection);
                speechCommand.Parameters.AddWithValue("@AudiogramId", audiogram.Id);
                using var speechReader = await speechCommand.ExecuteReaderAsync();

                while (await speechReader.ReadAsync())
                {
                    var speechPoint = new SpeechDiscriminationPointModel
                    {
                        Id = speechReader.GetInt32(0),
                        AudiogramId = speechReader.GetInt32(1),
                        StimulusLevel = speechReader.GetDecimal(2),
                        ScorePercent = speechReader.GetDecimal(3),
                        NumberOfWords = speechReader.GetInt32(4),
                        SpeechPointStatus = speechReader.IsDBNull(5) ? null : speechReader.GetString(5)
                    };
                    audiogram.SpeechPoints.Add(speechPoint);
                }
                await speechReader.CloseAsync();

                // Add audiogram to the appropriate action
                var action = patient.Actions.FirstOrDefault(a => a.Id == audiogram.ActionId);
                action?.Audiograms.Add(audiogram);
            }

            // Get hearing instruments
            var instrumentsQuery = @"
        SELECT Id, PatientId, ActionId, InstrumentTypeName, SerialNumber, Ear, SelectionDate,
               DeviceCategoryTypeCode, VentType, EarMoldForm, SoundCanalType, BatteryTypeCode
        FROM HearingInstruments 
        WHERE PatientId = @PatientId
        ORDER BY SelectionDate DESC";

            using var instrumentsCommand = new SqlCommand(instrumentsQuery, connection);
            instrumentsCommand.Parameters.AddWithValue("@PatientId", id);
            using var instrumentsReader = await instrumentsCommand.ExecuteReaderAsync();

            var instruments = new List<HearingInstrumentModel>();
            while (await instrumentsReader.ReadAsync())
            {
                var instrument = new HearingInstrumentModel
                {
                    Id = instrumentsReader.GetInt32(0),
                    PatientId = instrumentsReader.GetInt32(1),
                    ActionId = instrumentsReader.GetInt32(2),
                    InstrumentTypeName = instrumentsReader.IsDBNull(3) ? null : instrumentsReader.GetString(3),
                    SerialNumber = instrumentsReader.IsDBNull(4) ? null : instrumentsReader.GetString(4),
                    Ear = instrumentsReader.IsDBNull(5) ? null : instrumentsReader.GetString(5),
                    SelectionDate = instrumentsReader.GetDateTime(6),
                    DeviceCategoryTypeCode = instrumentsReader.IsDBNull(7) ? null : instrumentsReader.GetInt32(7),
                    VentType = instrumentsReader.IsDBNull(8) ? null : instrumentsReader.GetInt32(8),
                    EarMoldForm = instrumentsReader.IsDBNull(9) ? null : instrumentsReader.GetInt32(9),
                    SoundCanalType = instrumentsReader.IsDBNull(10) ? null : instrumentsReader.GetInt32(10),
                    BatteryTypeCode = instrumentsReader.IsDBNull(11) ? null : instrumentsReader.GetInt32(11)
                };
                instruments.Add(instrument);

                // Add to appropriate action
                var action = patient.Actions.FirstOrDefault(a => a.Id == instrument.ActionId);
                action?.HearingInstruments.Add(instrument);
            }
            await instrumentsReader.CloseAsync();

            // Get hearing instrument fittings
            foreach (var instrument in instruments)
            {
                var fittingsQuery = @"
            SELECT Id, HearingInstrumentId, PatientId, ActionId, FittingDate, FittingNotes
            FROM HearingInstrumentFittings 
            WHERE HearingInstrumentId = @InstrumentId
            ORDER BY FittingDate DESC";

                using var fittingsCommand = new SqlCommand(fittingsQuery, connection);
                fittingsCommand.Parameters.AddWithValue("@InstrumentId", instrument.Id);
                using var fittingsReader = await fittingsCommand.ExecuteReaderAsync();

                while (await fittingsReader.ReadAsync())
                {
                    var fitting = new HearingInstrumentFittingModel
                    {
                        Id = fittingsReader.GetInt32(0),
                        HearingInstrumentId = fittingsReader.GetInt32(1),
                        PatientId = fittingsReader.GetInt32(2),
                        ActionId = fittingsReader.GetInt32(3),
                        FittingDate = fittingsReader.GetDateTime(4),
                        FittingNotes = fittingsReader.IsDBNull(5) ? null : fittingsReader.GetString(5)
                    };

                    // Add to appropriate action
                    var action = patient.Actions.FirstOrDefault(a => a.Id == fitting.ActionId);
                    action?.HearingInstrumentFittings.Add(fitting);
                }
                await fittingsReader.CloseAsync();
            }

            // Get tinnitus measurements
            var tinnitusQuery = @"
        SELECT Id, PatientId, ActionId, TestDate, MeasurementType, Ear, StimulusFrequency, StimulusIntensity,
               StimulusUnit, MaskingFrequency, MaskingIntensity, MaskingUnit, StimulusSignalType, MaskingSignalType
        FROM TinnitusMeasurements 
        WHERE PatientId = @PatientId
        ORDER BY TestDate DESC";

            using var tinnitusCommand = new SqlCommand(tinnitusQuery, connection);
            tinnitusCommand.Parameters.AddWithValue("@PatientId", id);
            using var tinnitusReader = await tinnitusCommand.ExecuteReaderAsync();

            while (await tinnitusReader.ReadAsync())
            {
                var tinnitus = new TinnitusMeasurementModel
                {
                    Id = tinnitusReader.GetInt32(0),
                    PatientId = tinnitusReader.GetInt32(1),
                    ActionId = tinnitusReader.GetInt32(2),
                    TestDate = tinnitusReader.GetDateTime(3),
                    MeasurementType = tinnitusReader.GetString(4),
                    Ear = tinnitusReader.GetString(5),
                    StimulusFrequency = tinnitusReader.IsDBNull(6) ? null : tinnitusReader.GetInt32(6),
                    StimulusIntensity = tinnitusReader.IsDBNull(7) ? null : tinnitusReader.GetDecimal(7),
                    StimulusUnit = tinnitusReader.IsDBNull(8) ? null : tinnitusReader.GetString(8),
                    MaskingFrequency = tinnitusReader.IsDBNull(9) ? null : tinnitusReader.GetInt32(9),
                    MaskingIntensity = tinnitusReader.IsDBNull(10) ? null : tinnitusReader.GetDecimal(10),
                    MaskingUnit = tinnitusReader.IsDBNull(11) ? null : tinnitusReader.GetString(11),
                    StimulusSignalType = tinnitusReader.IsDBNull(12) ? null : tinnitusReader.GetString(12),
                    MaskingSignalType = tinnitusReader.IsDBNull(13) ? null : tinnitusReader.GetString(13)
                };

                var action = patient.Actions.FirstOrDefault(a => a.Id == tinnitus.ActionId);
                action?.TinnitusMeasurements.Add(tinnitus);
            }
            await tinnitusReader.CloseAsync();

            return patient;
        }

        public async Task<int> CreatePatientAsync(PatientModel patient)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            var query = @"
                INSERT INTO Patients (
                    FirstName, LastName, Gender, DateOfBirth, ActivePatient,
                    Address1, City, Province, Email, MobilePhone,
                    CreatedDate, UpdatedDate
                )
                VALUES (
                    @FirstName, @LastName, @Gender, @DateOfBirth, @ActivePatient,
                    @Address1, @City, @Province, @Email, @MobilePhone,
                    GETDATE(), GETDATE()
                );
                SELECT CAST(SCOPE_IDENTITY() as int);";

            using var command = new SqlCommand(query, connection);
            command.Parameters.AddWithValue("@FirstName", patient.FirstName ?? "");
            command.Parameters.AddWithValue("@LastName", patient.LastName ?? "");
            command.Parameters.AddWithValue("@Gender", patient.Gender ?? "");
            command.Parameters.AddWithValue("@DateOfBirth", patient.DateOfBirth ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@ActivePatient", patient.ActivePatient);
            command.Parameters.AddWithValue("@Address1", patient.Address1 ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@City", patient.City ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@Province", patient.Province ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@Email", patient.Email ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@MobilePhone", patient.MobilePhone ?? (object)DBNull.Value);

            var result = await command.ExecuteScalarAsync();
            return Convert.ToInt32(result);
        }

        public async Task<bool> UpdatePatientAsync(PatientModel patient)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            var query = @"
                UPDATE Patients 
                SET FirstName = @FirstName, 
                    LastName = @LastName, 
                    Gender = @Gender, 
                    DateOfBirth = @DateOfBirth,
                    Address1 = @Address1, 
                    City = @City, 
                    Province = @Province,
                    Email = @Email, 
                    MobilePhone = @MobilePhone,
                    UpdatedDate = GETDATE()
                WHERE Id = @Id";

            using var command = new SqlCommand(query, connection);
            command.Parameters.AddWithValue("@Id", patient.Id);
            command.Parameters.AddWithValue("@FirstName", patient.FirstName ?? "");
            command.Parameters.AddWithValue("@LastName", patient.LastName ?? "");
            command.Parameters.AddWithValue("@Gender", patient.Gender ?? "");
            command.Parameters.AddWithValue("@DateOfBirth", patient.DateOfBirth ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@Address1", patient.Address1 ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@City", patient.City ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@Province", patient.Province ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@Email", patient.Email ?? (object)DBNull.Value);
            command.Parameters.AddWithValue("@MobilePhone", patient.MobilePhone ?? (object)DBNull.Value);

            var rowsAffected = await command.ExecuteNonQueryAsync();
            return rowsAffected > 0;
        }

        public async Task<bool> DeletePatientAsync(int id)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            // Soft delete - set ActivePatient to false instead of actual deletion
            var query = @"
                UPDATE Patients 
                SET ActivePatient = 0, UpdatedDate = GETDATE() 
                WHERE Id = @Id";

            using var command = new SqlCommand(query, connection);
            command.Parameters.AddWithValue("@Id", id);

            var rowsAffected = await command.ExecuteNonQueryAsync();
            return rowsAffected > 0;
        }
    }
}