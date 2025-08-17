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
        public IActionResult GetPatientDetails(int patientId)
        {
            var patient = _service.GetAllPatients().FirstOrDefault(p => p.Id == patientId);

            if (patient == null)
            {
                return NotFound();
            }

            return Ok(patient);
        }

        [HttpPost]
        public async Task<IActionResult> CreatePatient([FromBody] Patient patient)
        {
            try
            {
                // Validate required fields
                if (string.IsNullOrWhiteSpace(patient.FullName) || 
                    string.IsNullOrWhiteSpace(patient.Phone))
                {
                    return BadRequest("Full Name and Phone are required fields");
                }

                // Set default values
                if (string.IsNullOrWhiteSpace(patient.Email))
                {
                    patient.Email = "no-email@example.com";
                }

                

                // Create patient in database
                var newPatientId = await _repository.CreatePatientAsync(patient);
                patient.Id = newPatientId;

                return CreatedAtAction(
                    nameof(GetPatientDetails), 
                    new { patientId = newPatientId }, 
                    patient
                );
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPut("{patientId}")]
        public async Task<IActionResult> UpdatePatient(int patientId, [FromBody] Patient patient)
        {
            try
            {
                if (patientId != patient.Id)
                {
                    return BadRequest("Patient ID mismatch");
                }

                var existingPatient = await _repository.GetPatientByIdAsync(patientId);
                if (existingPatient == null)
                {
                    return NotFound("Patient not found");
                }

                var success = await _repository.UpdatePatientAsync(patient);
                if (success)
                {
                    return Ok(patient);
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
}