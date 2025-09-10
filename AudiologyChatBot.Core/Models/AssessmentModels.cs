using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using System.Text.Json;

namespace AudiologyChatBot.Core.Models
{
    // Database Filter Models
    public class DatabaseFilter
    {
        [JsonPropertyName("field")]
        public string Field { get; set; } = "";

        [JsonPropertyName("operator")]
        public string Operator { get; set; } = "";

        [JsonPropertyName("values")]
        public List<string> Values { get; set; } = new List<string>();

        [JsonPropertyName("reason")]
        public string? Reason { get; set; }
    }

    public class DatabaseFilters
    {
        [JsonPropertyName("filters")]
        public List<DatabaseFilter> Filters { get; set; } = new List<DatabaseFilter>();
    }

    // Hearing Aid Filter Model (for the HEARING_AID_FILTERS table)
    public class HearingAidFilter
    {
        public int Id { get; set; }
        public string? HearingAidGuid { get; set; }
        public string? HearingAidName { get; set; }
        public string? Manufacturer { get; set; }
        public string? Description { get; set; }
        public string? DescriptionProductLine { get; set; }
        public int? MaxOutputDbSpl { get; set; }
        public string? CochlearImplantCompatible { get; set; }
        public string? TinnitusManagementFeatures { get; set; }
        public string? BatterySize { get; set; }
        public string? HearingAidStyle { get; set; }
        public string? MaxGainHearingLossCompatibility { get; set; }
        public string? StyleFormFactor { get; set; }
        public int? SourceFilesLoaded { get; set; }
        public string? SourceFiles { get; set; }
        public DateTime CreatedDate { get; set; }
        public string CreatedBy { get; set; } = "";
        public DateTime? UpdatedDate { get; set; }
        public string? UpdatedBy { get; set; }
    }

    // Assessment results with hearing aid recommendations
    public class AssessmentResultsWithRecommendations
    {
        public CompletedAssessment Assessment { get; set; } = new CompletedAssessment();
        public List<HearingAidFilter> RecommendedHearingAids { get; set; } = new List<HearingAidFilter>();
        public List<DatabaseFilter> AppliedFilters { get; set; } = new List<DatabaseFilter>();
        public int TotalAvailableOptions { get; set; }
        public string FilterSummary { get; set; } = "";
    }

    // UPDATED: Patient Assessment Data Model - Add helper method for filters
    public class PatientAssessmentData
    {
        public int Id { get; set; }
        public int PatientId { get; set; }
        public string Status { get; set; } = "In Progress";
        public DateTime StartDate { get; set; }
        public DateTime? CompletedDate { get; set; }
        public int TotalQuestions { get; set; }
        public string? FinalNodeId { get; set; }
        public string? FinalAction { get; set; }
        public string? CurrentNodeId { get; set; }
        public List<AssessmentAnswerData> Answers { get; set; } = new List<AssessmentAnswerData>();

        // Helper method to get all database filters from answers
        public List<DatabaseFilter> GetAllDatabaseFilters()
        {
            var allFilters = new List<DatabaseFilter>();

            foreach (var answer in Answers)
            {
                var answerFilters = answer.GetDatabaseFilters();
                allFilters.AddRange(answerFilters);
            }

            return allFilters;
        }
    }

    // UPDATED: Assessment Answer Data Model - Add database filters support
    public class AssessmentAnswerData
    {
        public int Id { get; set; }
        public int PatientAssessmentId { get; set; }
        public string QuestionId { get; set; } = "";
        public string? QuestionText { get; set; }
        public string Answer { get; set; } = "";
        public DateTime Timestamp { get; set; }
        public int SequenceNumber { get; set; }
        public string? Commentary { get; set; }
        public string? NodeType { get; set; }

        // Add database filters support
        public string? DatabaseFilters { get; set; }

        // Helper method to get parsed database filters
        public List<DatabaseFilter> GetDatabaseFilters()
        {
            if (string.IsNullOrEmpty(DatabaseFilters))
                return new List<DatabaseFilter>();

            try
            {
                var filtersContainer = JsonSerializer.Deserialize<DatabaseFilters>(DatabaseFilters);
                return filtersContainer?.Filters ?? new List<DatabaseFilter>();
            }
            catch
            {
                return new List<DatabaseFilter>();
            }
        }

        // Helper method to set database filters
        public void SetDatabaseFilters(List<DatabaseFilter> filters)
        {
            if (filters?.Count > 0)
            {
                var filtersContainer = new DatabaseFilters { Filters = filters };
                DatabaseFilters = JsonSerializer.Serialize(filtersContainer);
            }
            else
            {
                DatabaseFilters = null;
            }
        }
    }

    // Assessment Configuration Model
    public class AssessmentConfiguration
    {
        public string Key { get; set; } = "";
        public string Value { get; set; } = "";
        public string Category { get; set; } = "";
        public string? Description { get; set; }
        public bool IsActive { get; set; } = true;
    }

    // Action Template Model
    public class ActionTemplate
    {
        public string ActionKey { get; set; } = "";
        public string Title { get; set; } = "";
        public string Template { get; set; } = "";
        public string Category { get; set; } = "";
        public int Priority { get; set; }
        public List<string> Keywords { get; set; } = new List<string>();
        public string NextStepsTemplate { get; set; } = "";
        public bool IsActive { get; set; } = true;
    }

    // Assessment Settings Model
    public class AssessmentSettings
    {
        public string DefaultStatus { get; set; } = "In Progress";
        public string CompletedStatus { get; set; } = "Completed";
        public int MaxQuestionsPerAssessment { get; set; } = 50;
        public bool EnableAutoSave { get; set; } = true;
        public int AutoSaveIntervalMinutes { get; set; } = 5;
        public List<AssessmentConfiguration> Configurations { get; set; } = new List<AssessmentConfiguration>();
        public List<ActionTemplate> ActionTemplates { get; set; } = new List<ActionTemplate>();
        [JsonPropertyName("templates")]
        public Dictionary<string, RecommendationTemplate>? Templates { get; set; }
    }

    // Database Connection Settings
    public class DatabaseSettings
    {
        public string ConnectionString { get; set; } = "";
        public string DatabaseType { get; set; } = "SqlServer";
        public int CommandTimeout { get; set; } = 30;
        public bool EnableRetry { get; set; } = true;
        public int MaxRetryAttempts { get; set; } = 3;
    }

    // Recommendation Template
    public class RecommendationTemplate
    {
        [JsonPropertyName("recommendation")]
        public string Recommendation { get; set; } = "";

        [JsonPropertyName("nextSteps")]
        public string NextSteps { get; set; } = "";

        [JsonPropertyName("keyFinding")]
        public string KeyFinding { get; set; } = "";
    }

    // Decision Module
    public class DecisionModule
    {
        [JsonPropertyName("name")]
        public string? Name { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("entry_point")]
        public string? EntryPoint { get; set; }
    }
}