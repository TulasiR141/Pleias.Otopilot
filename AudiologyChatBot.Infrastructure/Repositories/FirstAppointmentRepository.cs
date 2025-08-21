using System.Data;
using System.Data.SqlClient;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using Dapper;
using AudiologyChatBot.Core.Interfaces;
using AudiologyChatBot.Core.Models;

namespace AudiologyChatBot.Infrastructure.Repositories
{
    public class FirstAppointmentRepository : IFirstAppointmentRepository
    {
        private readonly DatabaseSettings _databaseSettings;
        private readonly ILogger<FirstAppointmentRepository> _logger;

        public FirstAppointmentRepository(IOptions<DatabaseSettings> databaseSettings, ILogger<FirstAppointmentRepository> logger)
        {
            _databaseSettings = databaseSettings.Value;
            _logger = logger;
        }

        private IDbConnection CreateConnection()
        {
            return new SqlConnection(_databaseSettings.ConnectionString);
        }

        public async Task<FirstAppointment?> GetByIdAsync(int id)
        {
            const string sql = @"
                SELECT * FROM FirstAppointments 
                WHERE Id = @Id";

            using var connection = CreateConnection();
            return await connection.QueryFirstOrDefaultAsync<FirstAppointment>(sql, new { Id = id });
        }

        public async Task<FirstAppointment?> GetByPatientIdAsync(int patientId)
        {
            const string sql = @"
                SELECT TOP 1 * FROM FirstAppointments 
                WHERE PatientId = @PatientId 
                ORDER BY CreatedDate DESC";

            using var connection = CreateConnection();
            return await connection.QueryFirstOrDefaultAsync<FirstAppointment>(sql, new { PatientId = patientId });
        }

        public async Task<int> CreateAsync(FirstAppointment appointment)
        {
            const string sql = @"
                INSERT INTO FirstAppointments (PatientId, AssessmentId, AppointmentDate, Status, PreAppointmentComments, CreatedDate)
                OUTPUT INSERTED.Id
                VALUES (@PatientId, @AssessmentId, @AppointmentDate, @Status, @PreAppointmentComments, @CreatedDate)";

            using var connection = CreateConnection();
            
            var appointmentId = await connection.QuerySingleAsync<int>(sql, new
            {
                appointment.PatientId,
                appointment.AssessmentId,
                appointment.AppointmentDate,
                appointment.Status,
                appointment.PreAppointmentComments,
                CreatedDate = DateTime.UtcNow
            });

            appointment.Id = appointmentId;
            return appointmentId;
        }

        public async Task<bool> UpdateAsync(FirstAppointment appointment)
        {
            const string sql = @"
                UPDATE FirstAppointments 
                SET Status = @Status,
                    Duration = @Duration,
                    AppointmentNotes = @AppointmentNotes,
                    RecommendedModel = @RecommendedModel,
                    RecommendedFeatures = @RecommendedFeatures,
                    NextSteps = @NextSteps,
                    UpdatedDate = @UpdatedDate
                WHERE Id = @Id";

            using var connection = CreateConnection();
            
            var rowsAffected = await connection.ExecuteAsync(sql, new
            {
                appointment.Id,
                appointment.Status,
                appointment.Duration,
                appointment.AppointmentNotes,
                appointment.RecommendedModel,
                appointment.RecommendedFeatures,
                appointment.NextSteps,
                UpdatedDate = DateTime.UtcNow
            });

            return rowsAffected > 0;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            const string sql = "DELETE FROM FirstAppointments WHERE Id = @Id";

            using var connection = CreateConnection();
            var rowsAffected = await connection.ExecuteAsync(sql, new { Id = id });
            return rowsAffected > 0;
        }

        public async Task<List<FirstAppointment>> GetAppointmentsByStatusAsync(string status)
        {
            const string sql = @"
                SELECT * FROM FirstAppointments 
                WHERE Status = @Status 
                ORDER BY AppointmentDate";

            using var connection = CreateConnection();
            var appointments = await connection.QueryAsync<FirstAppointment>(sql, new { Status = status });
            return appointments.ToList();
        }

        public async Task<FirstAppointment?> GetAppointmentWithAssessmentAsync(int appointmentId)
        {
            const string sql = @"
                SELECT fa.*, pa.* 
                FROM FirstAppointments fa
                LEFT JOIN PatientAssessments pa ON fa.AssessmentId = pa.Id
                WHERE fa.Id = @AppointmentId";

            using var connection = CreateConnection();
            
            var appointmentDict = new Dictionary<int, FirstAppointment>();
            
            var result = await connection.QueryAsync<FirstAppointment, PatientAssessmentData, FirstAppointment>(
                sql,
                (appointment, assessment) =>
                {
                    if (!appointmentDict.TryGetValue(appointment.Id, out var existingAppointment))
                    {
                        existingAppointment = appointment;
                        existingAppointment.Assessment = assessment;
                        appointmentDict.Add(appointment.Id, existingAppointment);
                    }
                    return existingAppointment;
                },
                new { AppointmentId = appointmentId },
                splitOn: "Id"
            );

            return result.FirstOrDefault();
        }
    }
}
