using System.Text.Json.Serialization;
namespace AudiologyChatBot.Core.Models
{
    // Decision Tree Models
    public class DecisionTree
    {
        public Dictionary<string, DecisionNode>? Nodes { get; set; }
        [JsonPropertyName("modules")]
        public Dictionary<string, DecisionModule>? Modules { get; set; }
    }

    // UPDATED: Decision Node - Add database filters support
    public class DecisionNode
    {
        public string? Question { get; set; }
        public string? Description { get; set; }
        public string? Module { get; set; }
        public Dictionary<string, string>? Conditions { get; set; }
        public string? Action { get; set; }
        public string? Next { get; set; }

        // UPDATED: Support both property names for compatibility
        [JsonPropertyName("database_filters")]
        public DatabaseFilters? DatabaseFilters { get; set; }

        // Alternative property name for flexibility
        [JsonPropertyName("DatabaseFilters")]
        public DatabaseFilters? DatabaseFiltersAlt { get; set; }

        // Helper method to get filters regardless of property name used
        public DatabaseFilters? GetDatabaseFilters()
        {
            return DatabaseFilters ?? DatabaseFiltersAlt;
        }
    }
    // Request Models
    // UPDATED: Save Answer Request - Add PatientId and ensure all properties are included
    public class SaveAnswerRequest
    {
        public int PatientId { get; set; } // ADDED: PatientId for validation
        public string QuestionId { get; set; } = "";
        public string Answer { get; set; } = "";
        public string QuestionText { get; set; } = "";
        public string? Commentary { get; set; }
        public string? NodeType { get; set; }
        public List<DatabaseFilter>? DatabaseFilters { get; set; }
    }

    // Complete Assessment Request (UNCHANGED)
    public class CompleteAssessmentRequest
    {
        public int TotalQuestions { get; set; }
        public int PatientId { get; set; }
        public string? FinalNodeId { get; set; }
        public string? FinalAction { get; set; }
    }

    // Response Models (UNCHANGED)
    public class CompletedAssessment
    {
        public int Id { get; set; }
        public int PatientId { get; set; }
        public string Status { get; set; } = "";
        public DateTime? CompletedDate { get; set; }
        public int TotalQuestions { get; set; }
        public string[] KeyFindings { get; set; } = new string[0];
        public string FinalRecommendation { get; set; } = "";
        public string NextSteps { get; set; } = "";
        public string CurrentModule { get; set; } = "";
        public string? FinalNodeId { get; set; }
        public string? FinalAction { get; set; }
    }

    public class TestResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = "";
        public string? StackTrace { get; set; }
        public int NodeCount { get; set; }
        public bool HasRootNode { get; set; }
        public string[]? FirstFewNodes { get; set; }
    }

    // First Appointment Models (UNCHANGED)
    public class FirstAppointment
    {
        public int Id { get; set; }
        public int PatientId { get; set; }
        public int? AssessmentId { get; set; }
        public DateTime AppointmentDate { get; set; }
        public string Status { get; set; } = "Scheduled";
        public int? Duration { get; set; }
        public string? PreAppointmentComments { get; set; }
        public string? AppointmentNotes { get; set; }
        public string? RecommendedModel { get; set; }
        public string? RecommendedFeatures { get; set; }
        public string? NextSteps { get; set; }
        public DateTime CreatedDate { get; set; }
        public DateTime? UpdatedDate { get; set; }

        // Navigation properties (populated from joins)
        public PatientAssessmentData? Assessment { get; set; }
    }

    // Request Models for FirstAppointment (UNCHANGED)
    public class CreateFirstAppointmentRequest
    {
        public int PatientId { get; set; }
        public string? PreAppointmentComments { get; set; }
        public DateTime? AppointmentDate { get; set; }
    }

    public class StartFirstAppointmentRequest
    {
        public int AppointmentId { get; set; }
        public string? AppointmentNotes { get; set; }
    }

    public class CompleteFirstAppointmentRequest
    {
        public int AppointmentId { get; set; }
        public int Duration { get; set; }
        public string? RecommendedModel { get; set; }
        public string? RecommendedFeatures { get; set; }
        public string? NextSteps { get; set; }
        public string? AppointmentNotes { get; set; }
    }
}