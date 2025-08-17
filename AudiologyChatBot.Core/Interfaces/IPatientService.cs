using AudiologyChatBot.Core.Models;

namespace AudiologyChatBot.Core.Interfaces
{
    public interface IPatientService
    {
        List<Patient> GetAllPatients();
    }
}
