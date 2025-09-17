using Microsoft.AspNetCore.Mvc;
using AudiologyChatBot.Core.Interfaces;
using AudiologyChatBot.Core.Models;

namespace ChatbotAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PatientController : ControllerBase
    {
        private readonly IPatientService _service;
        private readonly IPatientRepository _repository;

        public PatientController(IPatientService service, IPatientRepository repository)
        {
            _service = service;
            _repository = repository;
        }

        [HttpGet]
        public IActionResult GetAllPatients()
        {
            var patients = _service.GetAllPatients();
            return Ok(patients);
        }

        [HttpGet("{patientId}")]
        public async Task<IActionResult> GetPatientDetails(int patientId)
        {
            try
            {
                var patient = await _repository.GetPatientByIdAsync(patientId);
                if (patient == null)
                {
                    return NotFound($"Patient with ID {patientId} not found");
                }
                return Ok(patient);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<IActionResult> CreatePatient([FromBody] CreatePatientRequest request)
        {
            try
            {
                // Validate required fields
                if (string.IsNullOrWhiteSpace(request.FullName) ||
                    string.IsNullOrWhiteSpace(request.Phone))
                {
                    return BadRequest("Full Name and Phone are required fields");
                }

                // Create PatientModel from request
                var patient = new PatientModel
                {
                    Gender = request.Gender ?? "",
                    DateOfBirth = request.Age.HasValue ? DateTime.Now.AddYears(-request.Age.Value) : null,
                    Email = string.IsNullOrWhiteSpace(request.Email) ? "no-email@example.com" : request.Email,
                    ActivePatient = true
                };

                // Use helper methods to parse the incoming data
                patient.SetFullName(request.FullName);
                patient.SetPhone(request.Phone);
                patient.SetAddress(request.Address ?? "");

                // Create patient in database
                var newPatientId = await _repository.CreatePatientAsync(patient);

                // Get the created patient to return complete data
                var createdPatient = await _repository.GetPatientByIdAsync(newPatientId);

                return CreatedAtAction(
                    nameof(GetPatientDetails),
                    new { patientId = newPatientId },
                    createdPatient
                );
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{patientId}")]
        public async Task<IActionResult> UpdatePatient(int patientId, [FromBody] UpdatePatientRequest request)
        {
            try
            {
                if (patientId != request.Id)
                {
                    return BadRequest("Patient ID mismatch");
                }

                var existingPatient = await _repository.GetPatientByIdAsync(patientId);
                if (existingPatient == null)
                {
                    return NotFound("Patient not found");
                }

                // Update the patient model
                existingPatient.Email = request.Email;
                existingPatient.Gender = request.Gender ?? "";

                // Handle name parsing for FullName
                if (!string.IsNullOrWhiteSpace(request.FullName))
                {
                    existingPatient.SetFullName(request.FullName);
                }

                // Handle age to date of birth conversion
                if (request.Age.HasValue)
                {
                    existingPatient.DateOfBirth = DateTime.Now.AddYears(-request.Age.Value);
                }

                // Update phone and address
                if (!string.IsNullOrWhiteSpace(request.Phone))
                {
                    existingPatient.SetPhone(request.Phone);
                }

                if (!string.IsNullOrWhiteSpace(request.Address))
                {
                    existingPatient.SetAddress(request.Address);
                }

                var success = await _repository.UpdatePatientAsync(existingPatient);
                if (success)
                {
                    // Return the updated patient
                    var updatedPatient = await _repository.GetPatientByIdAsync(patientId);
                    return Ok(updatedPatient);
                }

                return StatusCode(500, "Failed to update patient");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpDelete("{patientId}")]
        public async Task<IActionResult> DeletePatient(int patientId)
        {
            try
            {
                var existingPatient = await _repository.GetPatientByIdAsync(patientId);
                if (existingPatient == null)
                {
                    return NotFound("Patient not found");
                }

                var success = await _repository.DeletePatientAsync(patientId);
                if (success)
                {
                    return NoContent();
                }

                return StatusCode(500, "Failed to delete patient");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }
    }

    // Request DTOs for better API design
    public class CreatePatientRequest
    {
        public string FullName { get; set; } = string.Empty;
        public string? Gender { get; set; }
        public int? Age { get; set; }
        public string? Address { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
    }

    public class UpdatePatientRequest
    {
        public int Id { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Gender { get; set; }
        public int? Age { get; set; }
        public string? Address { get; set; }
        public string Phone { get; set; } = string.Empty;
        public string? Email { get; set; }
        public string? LastVisit { get; set; }
    }
}