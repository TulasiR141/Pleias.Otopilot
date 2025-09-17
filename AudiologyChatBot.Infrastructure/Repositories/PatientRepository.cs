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

        public async Task<PatientModel?> GetPatientByIdAsync(int id)
        {
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
                WHERE Id = @Id AND ActivePatient = 1";

            using var command = new SqlCommand(query, connection);
            command.Parameters.AddWithValue("@Id", id);

            using var reader = await command.ExecuteReaderAsync();

            if (await reader.ReadAsync())
            {
                return new PatientModel
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
                };
            }

            return null;
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