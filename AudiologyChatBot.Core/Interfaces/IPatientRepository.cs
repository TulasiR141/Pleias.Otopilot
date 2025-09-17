using AudiologyChatBot.Core.Models;

namespace AudiologyChatBot.Core.Interfaces
{
    public interface IPatientRepository
    {
        Task<List<PatientModel>> GetAllPatientsAsync();
        Task<PatientModel?> GetPatientByIdAsync(int id);
        Task<int> CreatePatientAsync(PatientModel patient);
        Task<bool> UpdatePatientAsync(PatientModel patient);
        Task<bool> DeletePatientAsync(int id);
    }
}