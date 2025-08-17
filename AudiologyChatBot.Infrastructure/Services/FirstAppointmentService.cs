using AudiologyChatBot.Core.Models;
using AudiologyChatBot.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace AudiologyChatBot.Infrastructure.Services
{
    public class FirstAppointmentService : IFirstAppointmentService
    {
        private readonly IFirstAppointmentRepository _appointmentRepository;
        private readonly IAssessmentRepository _assessmentRepository;
        private readonly ILogger<FirstAppointmentService> _logger;

        public FirstAppointmentService(
            IFirstAppointmentRepository appointmentRepository,
            IAssessmentRepository assessmentRepository,
            ILogger<FirstAppointmentService> logger)
        {
            _appointmentRepository = appointmentRepository;
            _assessmentRepository = assessmentRepository;
            _logger = logger;
        }

        public async Task<FirstAppointment> CreateAppointmentAsync(CreateFirstAppointmentRequest request)
        {
            try
            {
                // Check if patient already has an appointment
                var existingAppointment = await _appointmentRepository.GetByPatientIdAsync(request.PatientId);
                if (existingAppointment != null)
                {
                    throw new InvalidOperationException("Patient already has a first appointment scheduled");
                }

                // Get the latest completed assessment for this patient
                var assessment = await _assessmentRepository.GetPatientAssessmentAsync(request.PatientId);

                var appointment = new FirstAppointment
                {
                    PatientId = request.PatientId,
                    AssessmentId = assessment?.Id,
                    AppointmentDate = request.AppointmentDate ?? DateTime.UtcNow,
                    Status = "Scheduled",
                    PreAppointmentComments = request.PreAppointmentComments,
                    CreatedDate = DateTime.UtcNow
                };

                var appointmentId = await _appointmentRepository.CreateAsync(appointment);
                appointment.Id = appointmentId;

                _logger.LogInformation("Created first appointment {AppointmentId} for patient {PatientId}", 
                    appointmentId, request.PatientId);

                return appointment;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create appointment for patient {PatientId}", request.PatientId);
                throw;
            }
        }

        public async Task<FirstAppointment> StartAppointmentAsync(StartFirstAppointmentRequest request)
        {
            try
            {
                var appointment = await _appointmentRepository.GetByIdAsync(request.AppointmentId);
                if (appointment == null)
                {
                    throw new InvalidOperationException("Appointment not found");
                }

                if (appointment.Status != "Scheduled")
                {
                    throw new InvalidOperationException("Appointment cannot be started - current status: " + appointment.Status);
                }

                appointment.Status = "In Progress";
                appointment.AppointmentNotes = request.AppointmentNotes;

                await _appointmentRepository.UpdateAsync(appointment);

                _logger.LogInformation("Started appointment {AppointmentId}", request.AppointmentId);

                return appointment;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to start appointment {AppointmentId}", request.AppointmentId);
                throw;
            }
        }

        public async Task<FirstAppointment> CompleteAppointmentAsync(CompleteFirstAppointmentRequest request)
        {
            try
            {
                var appointment = await _appointmentRepository.GetByIdAsync(request.AppointmentId);
                if (appointment == null)
                {
                    throw new InvalidOperationException("Appointment not found");
                }

                if (appointment.Status != "In Progress")
                {
                    throw new InvalidOperationException("Appointment cannot be completed - current status: " + appointment.Status);
                }

                appointment.Status = "Completed";
                appointment.Duration = request.Duration;
                appointment.RecommendedModel = request.RecommendedModel;
                appointment.RecommendedFeatures = request.RecommendedFeatures;
                appointment.NextSteps = request.NextSteps;
                
                if (!string.IsNullOrEmpty(request.AppointmentNotes))
                {
                    appointment.AppointmentNotes = request.AppointmentNotes;
                }

                await _appointmentRepository.UpdateAsync(appointment);

                _logger.LogInformation("Completed appointment {AppointmentId} with duration {Duration} minutes", 
                    request.AppointmentId, request.Duration);

                return appointment;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to complete appointment {AppointmentId}", request.AppointmentId);
                throw;
            }
        }

        public async Task<FirstAppointment?> GetAppointmentAsync(int appointmentId)
        {
            try
            {
                return await _appointmentRepository.GetByIdAsync(appointmentId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get appointment {AppointmentId}", appointmentId);
                return null;
            }
        }

        public async Task<FirstAppointment?> GetPatientAppointmentAsync(int patientId)
        {
            try
            {
                return await _appointmentRepository.GetByPatientIdAsync(patientId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get appointment for patient {PatientId}", patientId);
                return null;
            }
        }

        public async Task<FirstAppointment?> GetAppointmentWithAssessmentAsync(int appointmentId)
        {
            try
            {
                return await _appointmentRepository.GetAppointmentWithAssessmentAsync(appointmentId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get appointment with assessment {AppointmentId}", appointmentId);
                return null;
            }
        }

        public async Task<bool> UpdateAppointmentStatusAsync(int appointmentId, string status)
        {
            try
            {
                var appointment = await _appointmentRepository.GetByIdAsync(appointmentId);
                if (appointment == null)
                {
                    return false;
                }

                appointment.Status = status;
                return await _appointmentRepository.UpdateAsync(appointment);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update appointment status {AppointmentId}", appointmentId);
                return false;
            }
        }
    }
}
