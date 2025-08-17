using AudiologyChatBot.Core.Models;

namespace AudiologyChatBot.Core.Interfaces
{
    public interface IAssessmentRepository
    {
        // Patient Assessment operations
        Task<PatientAssessmentData?> GetPatientAssessmentAsync(int patientId);
        Task<PatientAssessmentData?> GetActiveAssessmentAsync(int patientId);
        Task<PatientAssessmentData?> GetAssessmentByIdAsync(int assessmentId);
        Task<int> CreateAssessmentAsync(PatientAssessmentData assessment);
        Task<bool> UpdateAssessmentAsync(PatientAssessmentData assessment);
        Task<bool> DeleteAssessmentAsync(int assessmentId);
        Task<List<PatientAssessmentData>> GetPatientAssessmentHistoryAsync(int patientId);

        // Assessment Answer operations
        Task<int> SaveAnswerAsync(AssessmentAnswerData answer);
        Task<List<AssessmentAnswerData>> GetAssessmentAnswersAsync(int assessmentId);
        Task<AssessmentAnswerData?> GetAnswerByQuestionAsync(int assessmentId, string questionId);
        Task<bool> UpdateAnswerAsync(AssessmentAnswerData answer);

        // Bulk operations for performance
        Task<bool> SaveMultipleAnswersAsync(List<AssessmentAnswerData> answers);
        Task<bool> DeleteAssessmentAnswersAsync(int assessmentId);
    }

    public interface IAssessmentConfigurationService
    {
        // Configuration management
        Task<string?> GetConfigurationValueAsync(string key, string? defaultValue = null);
        Task<T?> GetConfigurationAsync<T>(string key) where T : class;
        Task<AssessmentSettings> GetAssessmentSettingsAsync();
        Task<ActionTemplate?> GetActionTemplateAsync(string actionKey);
        Task<List<ActionTemplate>> GetActionTemplatesByCategoryAsync(string category);
        Task<string> GenerateRecommendationAsync(string actionKey, PatientAssessmentData assessment);
        Task<string> GenerateNextStepsAsync(string actionKey, PatientAssessmentData assessment);
        Task<List<string>> GenerateKeyFindingsAsync(PatientAssessmentData assessment);
        Task ReloadConfigurationAsync();
    }

    public interface IFileStorageService
    {
        Task<T?> ReadJsonFileAsync<T>(string filePath) where T : class;
        Task<bool> WriteJsonFileAsync<T>(string filePath, T data) where T : class;
        Task<bool> FileExistsAsync(string filePath);
        Task<string> ReadTextFileAsync(string filePath);
        Task<bool> WriteTextFileAsync(string filePath, string content);
    }
}