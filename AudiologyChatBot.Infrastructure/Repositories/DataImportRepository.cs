using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using AudiologyChatBot.Core.Models;
using AudiologyChatBot.Core.Interfaces;

namespace AudiologyChatBot.Infrastructure.Repositories
{
    public class DataImportRepository : IDataImportRepository
    {
        private readonly string _connectionString;

        public DataImportRepository(IConfiguration configuration)
        {
            _connectionString = configuration.GetConnectionString("DefaultConnection")
                ?? throw new ArgumentNullException("Connection string not found");
        }

        #region Helpers

        private object DbValue(object? value) => value ?? DBNull.Value;

        /// <summary>
        /// Delete all child records for a patient (but keep patient row).
        /// </summary>
        private async Task DeletePatientDataAsync(int patientId, SqlConnection connection, SqlTransaction transaction)
        {
            var deleteCmd = new SqlCommand(@"
                -- Delete in correct order to respect foreign key constraints
                DELETE FROM HearingInstrumentFittings WHERE PatientId=@PatientId;
                DELETE FROM HearingInstruments WHERE PatientId=@PatientId;
                DELETE FROM TinnitusMeasurements WHERE PatientId=@PatientId;
                DELETE FROM ToneThresholdPoints WHERE AudiogramId IN (SELECT Id FROM Audiograms WHERE PatientId=@PatientId);
                DELETE FROM SpeechDiscriminationPoints WHERE AudiogramId IN (SELECT Id FROM Audiograms WHERE PatientId=@PatientId);
                DELETE FROM Audiograms WHERE PatientId=@PatientId;
                DELETE FROM PatientActions WHERE PatientId=@PatientId;", connection, transaction);

            deleteCmd.Parameters.AddWithValue("@PatientId", patientId);
            await deleteCmd.ExecuteNonQueryAsync();
        }

        #endregion

        #region Patient

        public async Task<(int patientId, bool wasExisting)> UpsertPatientAsync(PatientModel patient)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();
            using var transaction = connection.BeginTransaction();

            try
            {
                // Check if patient exists
                var checkCmd = new SqlCommand("SELECT Id FROM Patients WHERE NOAHPatientGUID=@GUID", connection, transaction);
                checkCmd.Parameters.AddWithValue("@GUID", patient.NOAHPatientGUID);
                var existingIdObj = await checkCmd.ExecuteScalarAsync();

                int patientId;
                bool wasExisting;

                if (existingIdObj != null)
                {
                    patientId = Convert.ToInt32(existingIdObj);
                    wasExisting = true;

                    // Wipe child records first
                    await DeletePatientDataAsync(patientId, connection, transaction);

                    // Update patient with all available fields
                    var updateCmd = new SqlCommand(@"
                        UPDATE Patients
                        SET NOAHPatientId=@NOAHPatientId,
                            NOAHPatientNumber=@NOAHPatientNumber,
                            FirstName=@FirstName,
                            LastName=@LastName,
                            MiddleName=@MiddleName,
                            Gender=@Gender,
                            DateOfBirth=@DateOfBirth,
                            ActivePatient=@ActivePatient,
                            CreatedBy=@CreatedBy,
                            UserId=@UserId,
                            CreatedDate=@CreatedDate
                        WHERE Id=@Id", connection, transaction);

                    updateCmd.Parameters.AddWithValue("@NOAHPatientId", patient.NOAHPatientId);
                    updateCmd.Parameters.AddWithValue("@NOAHPatientNumber", DbValue(patient.NOAHPatientNumber));
                    updateCmd.Parameters.AddWithValue("@FirstName", DbValue(patient.FirstName));
                    updateCmd.Parameters.AddWithValue("@LastName", DbValue(patient.LastName));
                    updateCmd.Parameters.AddWithValue("@MiddleName", DbValue(patient.MiddleName));
                    updateCmd.Parameters.AddWithValue("@Gender", DbValue(patient.Gender));
                    updateCmd.Parameters.AddWithValue("@DateOfBirth", DbValue(patient.DateOfBirth));
                    updateCmd.Parameters.AddWithValue("@ActivePatient", patient.ActivePatient);
                    updateCmd.Parameters.AddWithValue("@CreatedBy", DbValue(patient.CreatedBy));
                    updateCmd.Parameters.AddWithValue("@UserId", DbValue(patient.UserId));
                    updateCmd.Parameters.AddWithValue("@CreatedDate", patient.CreatedDate);
                    updateCmd.Parameters.AddWithValue("@Id", patientId);

                    await updateCmd.ExecuteNonQueryAsync();
                }
                else
                {
                    wasExisting = false;

                    // Insert new patient with all fields
                    var insertCmd = new SqlCommand(@"
                        INSERT INTO Patients 
                            (NOAHPatientId, NOAHPatientGUID, NOAHPatientNumber, FirstName, LastName, MiddleName, 
                             Gender, DateOfBirth, ActivePatient, CreatedBy, UserId, CreatedDate)
                        OUTPUT INSERTED.Id
                        VALUES 
                            (@NOAHPatientId, @NOAHPatientGUID, @NOAHPatientNumber, @FirstName, @LastName, @MiddleName,
                             @Gender, @DateOfBirth, @ActivePatient, @CreatedBy, @UserId, @CreatedDate);",
                        connection, transaction);

                    insertCmd.Parameters.AddWithValue("@NOAHPatientId", patient.NOAHPatientId);
                    insertCmd.Parameters.AddWithValue("@NOAHPatientGUID", patient.NOAHPatientGUID);
                    insertCmd.Parameters.AddWithValue("@NOAHPatientNumber", DbValue(patient.NOAHPatientNumber));
                    insertCmd.Parameters.AddWithValue("@FirstName", DbValue(patient.FirstName));
                    insertCmd.Parameters.AddWithValue("@LastName", DbValue(patient.LastName));
                    insertCmd.Parameters.AddWithValue("@MiddleName", DbValue(patient.MiddleName));
                    insertCmd.Parameters.AddWithValue("@Gender", DbValue(patient.Gender));
                    insertCmd.Parameters.AddWithValue("@DateOfBirth", DbValue(patient.DateOfBirth));
                    insertCmd.Parameters.AddWithValue("@ActivePatient", patient.ActivePatient);
                    insertCmd.Parameters.AddWithValue("@CreatedBy", DbValue(patient.CreatedBy));
                    insertCmd.Parameters.AddWithValue("@UserId", DbValue(patient.UserId));
                    insertCmd.Parameters.AddWithValue("@CreatedDate", patient.CreatedDate);

                    patientId = Convert.ToInt32(await insertCmd.ExecuteScalarAsync() ?? throw new InvalidOperationException("Failed to insert patient"));
                }

                transaction.Commit();
                return (patientId, wasExisting);
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        #endregion

        #region Patient Actions

        public async Task<int> InsertActionAsync(int patientId, PatientActionModel action)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            var cmd = new SqlCommand(@"
                INSERT INTO PatientActions 
                    (PatientId, TypeOfData, Description, ActionDate, LastModifiedDate, PublicDataXML)
                OUTPUT INSERTED.Id
                VALUES 
                    (@PatientId, @TypeOfData, @Description, @ActionDate, @LastModifiedDate, @PublicDataXML);",
                connection);

            cmd.Parameters.AddWithValue("@PatientId", patientId);
            cmd.Parameters.AddWithValue("@TypeOfData", DbValue(action.TypeOfData));
            cmd.Parameters.AddWithValue("@Description", DbValue(action.Description));
            cmd.Parameters.AddWithValue("@ActionDate", action.ActionDate);
            cmd.Parameters.AddWithValue("@LastModifiedDate", action.LastModifiedDate);
            cmd.Parameters.AddWithValue("@PublicDataXML", DbValue(action.PublicDataXML));

            var result = await cmd.ExecuteScalarAsync();
            return Convert.ToInt32(result ?? throw new InvalidOperationException("Failed to insert action"));
        }

        #endregion

        #region Audiograms

        public async Task<int> InsertAudiogramAsync(int patientId, int actionId, AudiogramModel audiogram)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            var cmd = new SqlCommand(@"
                INSERT INTO Audiograms 
                    (PatientId, ActionId, TestDate, TestType, Ear)
                OUTPUT INSERTED.Id
                VALUES 
                    (@PatientId, @ActionId, @TestDate, @TestType, @Ear);", connection);

            cmd.Parameters.AddWithValue("@PatientId", patientId);
            cmd.Parameters.AddWithValue("@ActionId", actionId);
            cmd.Parameters.AddWithValue("@TestDate", audiogram.TestDate);
            cmd.Parameters.AddWithValue("@TestType", DbValue(audiogram.TestType));
            cmd.Parameters.AddWithValue("@Ear", DbValue(audiogram.Ear));

            var result = await cmd.ExecuteScalarAsync();
            return Convert.ToInt32(result ?? throw new InvalidOperationException("Failed to insert audiogram"));
        }

        public async Task InsertToneThresholdPointAsync(int audiogramId, ToneThresholdPointModel tonePoint)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            var cmd = new SqlCommand(@"
                INSERT INTO ToneThresholdPoints 
                    (AudiogramId, StimulusFrequency, StimulusLevel, MaskingFrequency, MaskingLevel, TonePointStatus)
                VALUES 
                    (@AudiogramId, @StimulusFrequency, @StimulusLevel, @MaskingFrequency, @MaskingLevel, @TonePointStatus);", connection);

            cmd.Parameters.AddWithValue("@AudiogramId", audiogramId);
            cmd.Parameters.AddWithValue("@StimulusFrequency", tonePoint.StimulusFrequency);
            cmd.Parameters.AddWithValue("@StimulusLevel", tonePoint.StimulusLevel);
            cmd.Parameters.AddWithValue("@MaskingFrequency", DbValue(tonePoint.MaskingFrequency));
            cmd.Parameters.AddWithValue("@MaskingLevel", DbValue(tonePoint.MaskingLevel));
            cmd.Parameters.AddWithValue("@TonePointStatus", DbValue(tonePoint.TonePointStatus));

            await cmd.ExecuteNonQueryAsync();
        }

        public async Task InsertSpeechDiscriminationPointAsync(int audiogramId, SpeechDiscriminationPointModel speechPoint)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            var cmd = new SqlCommand(@"
                INSERT INTO SpeechDiscriminationPoints 
                    (AudiogramId, StimulusLevel, ScorePercent, NumberOfWords, SpeechPointStatus)
                VALUES 
                    (@AudiogramId, @StimulusLevel, @ScorePercent, @NumberOfWords, @SpeechPointStatus);", connection);

            cmd.Parameters.AddWithValue("@AudiogramId", audiogramId);
            cmd.Parameters.AddWithValue("@StimulusLevel", speechPoint.StimulusLevel);
            cmd.Parameters.AddWithValue("@ScorePercent", speechPoint.ScorePercent);
            cmd.Parameters.AddWithValue("@NumberOfWords", speechPoint.NumberOfWords);
            cmd.Parameters.AddWithValue("@SpeechPointStatus", DbValue(speechPoint.SpeechPointStatus));

            await cmd.ExecuteNonQueryAsync();
        }

        #endregion

        #region Tinnitus

        public async Task InsertTinnitusMeasurementAsync(int patientId, int actionId, TinnitusMeasurementModel tinnitus)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            var cmd = new SqlCommand(@"
                INSERT INTO TinnitusMeasurements
                    (PatientId, ActionId, TestDate, MeasurementType, Ear, StimulusFrequency, StimulusIntensity, StimulusUnit, 
                     MaskingFrequency, MaskingIntensity, MaskingUnit, StimulusSignalType, MaskingSignalType, CreatedDate)
                VALUES
                    (@PatientId, @ActionId, @TestDate, @MeasurementType, @Ear, @StimulusFrequency, @StimulusIntensity, @StimulusUnit,
                     @MaskingFrequency, @MaskingIntensity, @MaskingUnit, @StimulusSignalType, @MaskingSignalType, @CreatedDate);", connection);

            cmd.Parameters.AddWithValue("@PatientId", patientId);
            cmd.Parameters.AddWithValue("@ActionId", actionId);
            cmd.Parameters.AddWithValue("@TestDate", tinnitus.TestDate);
            cmd.Parameters.AddWithValue("@MeasurementType", DbValue(tinnitus.MeasurementType));
            cmd.Parameters.AddWithValue("@Ear", DbValue(tinnitus.Ear));
            cmd.Parameters.AddWithValue("@StimulusFrequency", DbValue(tinnitus.StimulusFrequency));
            cmd.Parameters.AddWithValue("@StimulusIntensity", DbValue(tinnitus.StimulusIntensity));
            cmd.Parameters.AddWithValue("@StimulusUnit", DbValue(tinnitus.StimulusUnit));
            cmd.Parameters.AddWithValue("@MaskingFrequency", DbValue(tinnitus.MaskingFrequency));
            cmd.Parameters.AddWithValue("@MaskingIntensity", DbValue(tinnitus.MaskingIntensity));
            cmd.Parameters.AddWithValue("@MaskingUnit", DbValue(tinnitus.MaskingUnit));
            cmd.Parameters.AddWithValue("@StimulusSignalType", DbValue(tinnitus.StimulusSignalType));
            cmd.Parameters.AddWithValue("@MaskingSignalType", DbValue(tinnitus.MaskingSignalType));
            cmd.Parameters.AddWithValue("@CreatedDate", tinnitus.CreatedDate);

            await cmd.ExecuteNonQueryAsync();
        }

        #endregion

        #region Hearing Instruments & Fittings

        public async Task<int> InsertHearingInstrumentAsync(int patientId, int actionId, HearingInstrumentModel instrument)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            var cmd = new SqlCommand(@"
                INSERT INTO HearingInstruments
                    (PatientId, ActionId, InstrumentTypeName, SerialNumber, Ear, SelectionDate)
                OUTPUT INSERTED.Id
                VALUES
                    (@PatientId, @ActionId, @InstrumentTypeName, @SerialNumber, @Ear, @SelectionDate);", connection);

            cmd.Parameters.AddWithValue("@PatientId", patientId);
            cmd.Parameters.AddWithValue("@ActionId", actionId);
            cmd.Parameters.AddWithValue("@InstrumentTypeName", DbValue(instrument.InstrumentTypeName));
            cmd.Parameters.AddWithValue("@SerialNumber", DbValue(instrument.SerialNumber));
            cmd.Parameters.AddWithValue("@Ear", DbValue(instrument.Ear));
            cmd.Parameters.AddWithValue("@SelectionDate", instrument.SelectionDate);

            var result = await cmd.ExecuteScalarAsync();
            return Convert.ToInt32(result ?? throw new InvalidOperationException("Failed to insert hearing instrument"));
        }

        public async Task InsertHearingInstrumentFittingAsync(int patientId, int actionId, int instrumentId, HearingInstrumentFittingModel fitting)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();

            var cmd = new SqlCommand(@"
                INSERT INTO HearingInstrumentFittings
                    (HearingInstrumentId, PatientId, ActionId, FittingDate, FittingNotes, CreatedDate)
                VALUES
                    (@HearingInstrumentId, @PatientId, @ActionId, @FittingDate, @FittingNotes, @CreatedDate);", connection);

            cmd.Parameters.AddWithValue("@HearingInstrumentId", instrumentId);
            cmd.Parameters.AddWithValue("@PatientId", patientId);
            cmd.Parameters.AddWithValue("@ActionId", actionId);
            cmd.Parameters.AddWithValue("@FittingDate", fitting.FittingDate);
            cmd.Parameters.AddWithValue("@FittingNotes", DbValue(fitting.FittingNotes));
            cmd.Parameters.AddWithValue("@CreatedDate", fitting.CreatedDate);

            await cmd.ExecuteNonQueryAsync();
        }

        #endregion
    }
}