using Microsoft.AspNetCore.Mvc;
using ChatbotAPI.Services;

namespace ChatbotAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PatientController : ControllerBase
    {
        private readonly PatientService _service;

        // Dependency injection is a better practice than newing up the service
        public PatientController(PatientService service)
        {
            _service = service;
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
    }
}