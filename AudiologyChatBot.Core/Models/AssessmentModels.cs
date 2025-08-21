using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace AudiologyChatBot.Core.Models
{
    // Patient Assessment Data Model
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
    }

    // Assessment Answer Data Model
    public class AssessmentAnswerData
    {
        public int Id { get; set; }
        public int PatientAssessmentId { get; set; }
        public string QuestionId { get; set; }
        public string? QuestionText { get; set; }
        public string Answer { get; set; }
        public DateTime Timestamp { get; set; }
        public int SequenceNumber { get; set; }
        // NEW: Add commentary field
        public string? Commentary { get; set; }
    }

    // Assessment Configuration Model
    public class AssessmentConfiguration
    {
        public string Key { get; set; }
        public string Value { get; set; }
        public string? Description { get; set; }
        public string Category { get; set; }
        public bool IsActive { get; set; } = true;
    }

    // Action Template Model
    public class ActionTemplate
    {
        public string ActionKey { get; set; }
        public string Title { get; set; }
        public string Template { get; set; }
        public string Category { get; set; }
        public int Priority { get; set; }
        public List<string> Keywords { get; set; } = new List<string>();
        public string NextStepsTemplate { get; set; } = "";
        public bool IsActive { get; set; } = true;
    }

    // Assessment Settings Model (loaded from JSON)
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
        public string ConnectionString { get; set; }
        public string DatabaseType { get; set; } = "SqlServer"; // SqlServer, SQLite, MySQL, etc.
        public int CommandTimeout { get; set; } = 30;
        public bool EnableRetry { get; set; } = true;
        public int MaxRetryAttempts { get; set; } = 3;
    }
    public class RecommendationTemplate
    {
        [JsonPropertyName("recommendation")]
        public string Recommendation { get; set; } = "";

        [JsonPropertyName("nextSteps")]
        public string NextSteps { get; set; } = "";

        [JsonPropertyName("keyFinding")]
        public string KeyFinding { get; set; } = "";
    }

   

    // Add modules support to DecisionTree
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