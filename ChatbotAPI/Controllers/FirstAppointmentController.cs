using Microsoft.AspNetCore.Mvc;
using AudiologyChatBot.Core.Interfaces;
using AudiologyChatBot.Core.Models;

namespace ChatbotAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FirstAppointmentController : ControllerBase
    {
        private readonly IFirstAppointmentService _appointmentService;
        private readonly ILogger<FirstAppointmentController> _logger;

        public FirstAppointmentController(
            IFirstAppointmentService appointmentService,
            ILogger<FirstAppointmentController> logger)
        {
            _appointmentService = appointmentService;
            _logger = logger;
        }

        // Create appointment with pre-appointment comments
        [HttpPost("patient/{patientId}/create")]
        public async Task<IActionResult> CreateAppointment(int patientId, [FromBody] CreateFirstAppointmentRequest request)
        {
            try
            {
                request.PatientId = patientId;
                
                var appointment = await _appointmentService.CreateAppointmentAsync(request);
                
                _logger.LogInformation("Created appointment {AppointmentId} for patient {PatientId}", 
                    appointment.Id, patientId);

                return CreatedAtAction(
                    nameof(GetAppointment), 
                    new { id = appointment.Id }, 
                    appointment);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating appointment for patient {PatientId}", patientId);
                return StatusCode(500, "Internal server error");
            }
        }

        // Start appointment
        [HttpPost("{id}/start")]
        public async Task<IActionResult> StartAppointment(int id, [FromBody] StartFirstAppointmentRequest request)
        {
            try
            {
                request.AppointmentId = id;
                
                var appointment = await _appointmentService.StartAppointmentAsync(request);
                
                return Ok(appointment);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error starting appointment {AppointmentId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // Complete appointment
        [HttpPost("{id}/complete")]
        public async Task<IActionResult> CompleteAppointment(int id, [FromBody] CompleteFirstAppointmentRequest request)
        {
            try
            {
                request.AppointmentId = id;
                
                var appointment = await _appointmentService.CompleteAppointmentAsync(request);
                
                return Ok(appointment);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error completing appointment {AppointmentId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // Get appointment by ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetAppointment(int id)
        {
            try
            {
                var appointment = await _appointmentService.GetAppointmentAsync(id);
                
                if (appointment == null)
                {
                    return NotFound("Appointment not found");
                }

                return Ok(appointment);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving appointment {AppointmentId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // Get appointment by patient ID
        [HttpGet("patient/{patientId}")]
        public async Task<IActionResult> GetPatientAppointment(int patientId)
        {
            try
            {
                var appointment = await _appointmentService.GetPatientAppointmentAsync(patientId);
                
                if (appointment == null)
                {
                    return NotFound("No appointment found for this patient");
                }

                return Ok(appointment);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving appointment for patient {PatientId}", patientId);
                return StatusCode(500, "Internal server error");
            }
        }

        // Get appointment with assessment data
        [HttpGet("{id}/with-assessment")]
        public async Task<IActionResult> GetAppointmentWithAssessment(int id)
        {
            try
            {
                var appointment = await _appointmentService.GetAppointmentWithAssessmentAsync(id);
                
                if (appointment == null)
                {
                    return NotFound("Appointment not found");
                }

                return Ok(appointment);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving appointment with assessment {AppointmentId}", id);
                return StatusCode(500, "Internal server error");
            }
        }

        // Update appointment status
        [HttpPatch("{id}/status")]
        public async Task<IActionResult> UpdateAppointmentStatus(int id, [FromBody] string status)
        {
            try
            {
                var success = await _appointmentService.UpdateAppointmentStatusAsync(id, status);
                
                if (!success)
                {
                    return NotFound("Appointment not found");
                }

                return Ok(new { message = "Status updated successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating appointment status {AppointmentId}", id);
                return StatusCode(500, "Internal server error");
            }
        }
    }
}
