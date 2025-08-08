using System.Text.Json;
using ChatbotAPI.Models;

namespace ChatbotAPI.Services
{
    public class PatientService
    {
        private readonly string _jsonPath = "data/patients.json";

        public List<Patient> GetAllPatients()
        {
            if (!File.Exists(_jsonPath))
                return new List<Patient>();

            var json = File.ReadAllText(_jsonPath);
            var patients = JsonSerializer.Deserialize<List<Patient>>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return patients ?? new List<Patient>();
        }
    }
}
