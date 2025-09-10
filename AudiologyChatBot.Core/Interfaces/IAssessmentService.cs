// IAssessmentService.cs
using AudiologyChatBot.Core.Models;

namespace AudiologyChatBot.Core.Interfaces
{
    public interface IAssessmentService
    {
        Task<DecisionNode?> GetQuestionAsync(string nodeId);
        Task<bool> SaveAnswerAsync(int patientId, SaveAnswerRequest request);
        Task<CompletedAssessment> CompleteAssessmentAsync(int patientId, CompleteAssessmentRequest request);
        Task<PatientAssessmentData?> GetPatientAssessmentAsync(int patientId);
        Task<PatientAssessmentData?> GetPatientAnswersAsync(int patientId);
        Task<CompletedAssessment> GetEnrichedAssessmentDataAsync(int patientId, PatientAssessmentData assessment);
        Task<TestResult> TestDecisionTreeAsync();

        // NEW: Method to get assessment results with hearing aid recommendations
        Task<AssessmentResultsWithRecommendations> GetAssessmentWithRecommendationsAsync(int patientId);
        Task<bool> DeleteAnswerAsync(int patientId, string questionId);
    }
}