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

        public async Task<List<Patient>> GetAllPatientsAsync()
        {
            var patients = new List<Patient>();
            
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();
            
            var query = @"
                SELECT  Id, FullName, Gender, Age, Address, Phone, Email, LastVisit 
                FROM Patients";
            
            using var command = new SqlCommand(query, connection);
            using var reader = await command.ExecuteReaderAsync();
            
            while (await reader.ReadAsync())
            {
                patients.Add(new Patient
                {
                    Id = reader.GetInt32(0), // Id
                    FullName = reader.GetString(1), // FullName
                    Gender = reader.GetString(2), // Gender
                    Age = reader.GetInt32(3), // Age
                    Address = reader.GetString(4), // Address
                    Phone = reader.GetString(5), // Phone
                    Email = reader.GetString(6), // Email
                    LastVisit = reader.GetString(7) // LastVisit
                });
            }
            
            return patients;
        }

        public async Task<Patient?> GetPatientByIdAsync(int id)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();
            
            var query = @"
                SELECT Id, FullName, Gender, Age, Address, Phone, Email, LastVisit 
                FROM Patients 
                WHERE Id = @Id";
            
            using var command = new SqlCommand(query, connection);
            command.Parameters.AddWithValue("@Id", id);
            
            using var reader = await command.ExecuteReaderAsync();
            
            if (await reader.ReadAsync())
            {
                return new Patient
                {
                    Id = reader.GetInt32(0), // Id
                    FullName = reader.GetString(1), // FullName
                    Gender = reader.GetString(2), // Gender
                    Age = reader.GetInt32(3), // Age
                    Address = reader.GetString(4), // Address
                    Phone = reader.GetString(5), // Phone
                    Email = reader.GetString(6), // Email
                    LastVisit = reader.GetString(7) // LastVisit
                };
            }
            
            return null;
        }

        public async Task<int> CreatePatientAsync(Patient patient)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();
            
            var query = @"
                INSERT INTO Patients (FullName, Gender, Age, Address, Phone, Email, LastVisit)
                VALUES (@FullName, @Gender, @Age, @Address, @Phone, @Email, @LastVisit);
                SELECT CAST(SCOPE_IDENTITY() as int);";
            
            using var command = new SqlCommand(query, connection);
            command.Parameters.AddWithValue("@FullName", patient.FullName);
            command.Parameters.AddWithValue("@Gender", patient.Gender);
            command.Parameters.AddWithValue("@Age", patient.Age);
            command.Parameters.AddWithValue("@Address", patient.Address);
            command.Parameters.AddWithValue("@Phone", patient.Phone);
            command.Parameters.AddWithValue("@Email", patient.Email);
            command.Parameters.AddWithValue("@LastVisit", patient.LastVisit);
            
            var result = await command.ExecuteScalarAsync();
            return Convert.ToInt32(result);
        }

        public async Task<bool> UpdatePatientAsync(Patient patient)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();
            
            var query = @"
                UPDATE Patients 
                SET FullName = @FullName, Gender = @Gender, Age = @Age, 
                    Address = @Address, Phone = @Phone, Email = @Email, LastVisit = @LastVisit
                WHERE Id = @Id";
            
            using var command = new SqlCommand(query, connection);
            command.Parameters.AddWithValue("@Id", patient.Id);
            command.Parameters.AddWithValue("@FullName", patient.FullName);
            command.Parameters.AddWithValue("@Gender", patient.Gender);
            command.Parameters.AddWithValue("@Age", patient.Age);
            command.Parameters.AddWithValue("@Address", patient.Address);
            command.Parameters.AddWithValue("@Phone", patient.Phone);
            command.Parameters.AddWithValue("@Email", patient.Email);
            command.Parameters.AddWithValue("@LastVisit", patient.LastVisit);
            
            var rowsAffected = await command.ExecuteNonQueryAsync();
            return rowsAffected > 0;
        }

        public async Task<bool> DeletePatientAsync(int id)
        {
            using var connection = new SqlConnection(_connectionString);
            await connection.OpenAsync();
            
            var query = "DELETE FROM Patients WHERE Id = @Id";
            
            using var command = new SqlCommand(query, connection);
            command.Parameters.AddWithValue("@Id", id);
            
            var rowsAffected = await command.ExecuteNonQueryAsync();
            return rowsAffected > 0;
        }
    }
}