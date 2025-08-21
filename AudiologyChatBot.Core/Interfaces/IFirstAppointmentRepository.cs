using AudiologyChatBot.Core.Models;

namespace AudiologyChatBot.Core.Interfaces
{
    public interface IFirstAppointmentRepository
    {
        // Basic CRUD operations
        Task<FirstAppointment?> GetByIdAsync(int id);
        Task<FirstAppointment?> GetByPatientIdAsync(int patientId);
        Task<int> CreateAsync(FirstAppointment appointment);
        Task<bool> UpdateAsync(FirstAppointment appointment);
        Task<bool> DeleteAsync(int id);
        
        // Specific operations
        Task<List<FirstAppointment>> GetAppointmentsByStatusAsync(string status);
        Task<FirstAppointment?> GetAppointmentWithAssessmentAsync(int appointmentId);
    }
    
    public interface IFirstAppointmentService
    {
        // Pre-appointment flow
        Task<FirstAppointment> CreateAppointmentAsync(CreateFirstAppointmentRequest request);
        Task<FirstAppointment> StartAppointmentAsync(StartFirstAppointmentRequest request);
        Task<FirstAppointment> CompleteAppointmentAsync(CompleteFirstAppointmentRequest request);
        
        // Get operations
        Task<FirstAppointment?> GetAppointmentAsync(int appointmentId);
        Task<FirstAppointment?> GetPatientAppointmentAsync(int patientId);
        Task<FirstAppointment?> GetAppointmentWithAssessmentAsync(int appointmentId);
        
        // Status operations
        Task<bool> UpdateAppointmentStatusAsync(int appointmentId, string status);
    }
}
