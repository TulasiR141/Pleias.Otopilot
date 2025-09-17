using AudiologyChatBot.Core.Models;
using AudiologyChatBot.Core.Interfaces;

namespace AudiologyChatBot.Infrastructure.Services
{
    public class PatientService : IPatientService
    {
        private readonly IPatientRepository _patientRepository;

        public PatientService(IPatientRepository patientRepository)
        {
            _patientRepository = patientRepository;
            Console.WriteLine("=== PatientService: Using DATABASE repository ===");
        }

        public List<PatientModel> GetAllPatients()
        {
            try
            {
                Console.WriteLine("=== PatientService: Fetching patients from DATABASE ===");
                var result = _patientRepository.GetAllPatientsAsync().GetAwaiter().GetResult();
                Console.WriteLine($"=== PatientService: Found {result.Count} patients in DATABASE ===");
                
                if (result.Count == 0)
                {
                    Console.WriteLine("=== WARNING: No patients found in database ===");
                }
                
                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"=== DATABASE ERROR: {ex.Message} ===");
                Console.WriteLine($"=== FULL ERROR: {ex} ===");
                
                // Return empty list instead of crashing
                return new List<PatientModel>();
            }
        }
    }
}