using AudiologyChatBot.Core.Models;
using AudiologyChatBot.Core.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System.Text.Json;

namespace AudiologyChatBot.Infrastructure.Services
{
    public class AssessmentService : IAssessmentService
    {
        private readonly IDecisionTreeService _decisionTreeService;
        private readonly IAssessmentRepository _assessmentRepository;
        private readonly IHearingAidFilterRepository _hearingAidFilterRepository;
        private readonly ILogger<AssessmentService> _logger;
        private readonly string _settingsPath;
        private AssessmentSettings? _cachedSettings;

        public AssessmentService(
            IDecisionTreeService decisionTreeService,
            IAssessmentRepository assessmentRepository,
            IHearingAidFilterRepository hearingAidFilterRepository,
            ILogger<AssessmentService> logger,
            IConfiguration configuration)
        {
            _decisionTreeService = decisionTreeService;
            _assessmentRepository = assessmentRepository;
            _hearingAidFilterRepository = hearingAidFilterRepository;
            _logger = logger;

            _settingsPath = Path.Combine(Directory.GetCurrentDirectory(), "data", "assessment-settings.json");
        }

        private async Task<AssessmentSettings> GetSettingsAsync()
        {
            if (_cachedSettings != null) return _cachedSettings;

            try
            {
                if (!File.Exists(_settingsPath))
                {
                    _logger.LogWarning("Settings file not found at {Path}", _settingsPath);
                    return new AssessmentSettings();
                }

                var json = await File.ReadAllTextAsync(_settingsPath);
                var settings = JsonSerializer.Deserialize<AssessmentSettings>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                _cachedSettings = settings ?? new AssessmentSettings();
                return _cachedSettings;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load assessment settings");
                return new AssessmentSettings();
            }
        }

        public async Task<DecisionNode?> GetQuestionAsync(string nodeId)
        {
            var node = await _decisionTreeService.GetNodeAsync(nodeId);
            return node;
        }

        // ENHANCED: SaveAnswerAsync with comprehensive error handling and validation
        public async Task<bool> SaveAnswerAsync(int patientId, SaveAnswerRequest request)
        {
            try
            {
                _logger.LogInformation("SaveAnswerAsync called for patient {PatientId}, question {QuestionId}, nodeType {NodeType}",
                    patientId, request.QuestionId, request.NodeType);

                // Validate request
                if (string.IsNullOrEmpty(request.QuestionId))
                {
                    _logger.LogError("QuestionId is null or empty for patient {PatientId}", patientId);
                    return false;
                }

                if (string.IsNullOrEmpty(request.Answer))
                {
                    _logger.LogError("Answer is null or empty for patient {PatientId}, question {QuestionId}",
                        patientId, request.QuestionId);
                    return false;
                }

                var assessment = await _assessmentRepository.GetActiveAssessmentAsync(patientId);

                if (assessment == null)
                {
                    _logger.LogInformation("No active assessment found for patient {PatientId}, creating new assessment", patientId);

                    var settings = await GetSettingsAsync();
                    assessment = new PatientAssessmentData
                    {
                        PatientId = patientId,
                        StartDate = DateTime.UtcNow,
                        Status = settings.DefaultStatus,
                        CurrentNodeId = request.QuestionId,
                        Answers = new List<AssessmentAnswerData>()
                    };

                    var assessmentId = await _assessmentRepository.CreateAssessmentAsync(assessment);
                    assessment.Id = assessmentId;
                    _logger.LogInformation("Created new assessment with ID {AssessmentId} for patient {PatientId}",
                        assessmentId, patientId);
                }

                var answer = new AssessmentAnswerData
                {
                    PatientAssessmentId = assessment.Id,
                    QuestionId = request.QuestionId,
                    QuestionText = request.QuestionText ?? "",
                    Answer = request.Answer,
                    Commentary = request.Commentary,
                    NodeType = request.NodeType,
                    Timestamp = DateTime.UtcNow,
                    SequenceNumber = assessment.Answers.Count + 1
                };

                // Handle database filters if provided
                if (request.DatabaseFilters?.Count > 0)
                {
                    answer.SetDatabaseFilters(request.DatabaseFilters);
                    _logger.LogInformation("Saving answer with {FilterCount} database filters for patient {PatientId}, question {QuestionId}",
                        request.DatabaseFilters.Count, patientId, request.QuestionId);
                }

                await _assessmentRepository.SaveAnswerAsync(answer);
                assessment.CurrentNodeId = request.QuestionId;
                await _assessmentRepository.UpdateAssessmentAsync(assessment);

                _logger.LogInformation("Successfully saved answer for patient {PatientId}, question {QuestionId}",
                    patientId, request.QuestionId);

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save answer for patient {PatientId}, question {QuestionId}. Request: {@Request}",
                    patientId, request.QuestionId, new
                    {
                        request.Answer,
                        request.NodeType,
                        FilterCount = request.DatabaseFilters?.Count ?? 0
                    });
                return false;
            }
        }

        public async Task<CompletedAssessment> CompleteAssessmentAsync(int patientId, CompleteAssessmentRequest request)
        {
            var assessment = await _assessmentRepository.GetActiveAssessmentAsync(patientId);

            if (assessment == null)
            {
                throw new InvalidOperationException("No active assessment found for this patient");
            }

            var settings = await GetSettingsAsync();

            assessment.Status = settings.CompletedStatus;
            assessment.CompletedDate = DateTime.UtcNow;
            assessment.TotalQuestions = request.TotalQuestions;
            assessment.FinalNodeId = request.FinalNodeId;
            assessment.FinalAction = request.FinalAction;

            await _assessmentRepository.UpdateAssessmentAsync(assessment);

            // Collect all database filters from the assessment answers
            var allFilters = assessment.GetAllDatabaseFilters();
            if (allFilters.Count > 0)
            {
                _logger.LogInformation("Assessment {AssessmentId} completed with {FilterCount} database filters collected",
                    assessment.Id, allFilters.Count);

                // Log each filter for debugging
                foreach (var filter in allFilters)
                {
                    _logger.LogInformation("Filter: {Field} {Operator} [{Values}] - {Reason}",
                        filter.Field, filter.Operator, string.Join(", ", filter.Values), filter.Reason);
                }

                // Get hearing aid recommendations based on filters
                try
                {
                    var hearingAidRecommendations = await _hearingAidFilterRepository.GetFilteredHearingAidsAsync(allFilters);
                    _logger.LogInformation("Found {Count} hearing aid recommendations for assessment {AssessmentId}",
                        hearingAidRecommendations.Count, assessment.Id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to get hearing aid recommendations for assessment {AssessmentId}", assessment.Id);
                }
            }

            // Generate intelligent recommendations and key findings
            var (recommendation, nextSteps, keyFindings) = await GenerateAssessmentResultsAsync(assessment, request, settings);

            return new CompletedAssessment
            {
                Id = assessment.Id,
                PatientId = patientId,
                Status = assessment.Status,
                CompletedDate = assessment.CompletedDate,
                TotalQuestions = assessment.TotalQuestions,
                KeyFindings = keyFindings,
                FinalRecommendation = recommendation,
                NextSteps = nextSteps,
                CurrentModule = await GetModuleNameFromNodeIdAsync(request.FinalNodeId),
                FinalNodeId = assessment.FinalNodeId,
                FinalAction = assessment.FinalAction
            };
        }

        // Method to get hearing aid recommendations for a completed assessment
        public async Task<AssessmentResultsWithRecommendations> GetAssessmentWithRecommendationsAsync(int patientId)
        {
            var assessment = await _assessmentRepository.GetPatientAssessmentAsync(patientId);

            if (assessment == null)
            {
                throw new InvalidOperationException("No completed assessment found for this patient");
            }

            // Get all filters from the assessment
            var allFilters = assessment.GetAllDatabaseFilters();

            // Get hearing aid recommendations
            var hearingAidRecommendations = new List<HearingAidFilter>();
            var totalCount = 0;

            try
            {
                hearingAidRecommendations = await _hearingAidFilterRepository.GetFilteredHearingAidsAsync(allFilters);
                totalCount = await _hearingAidFilterRepository.GetTotalCountAsync();

                _logger.LogInformation("Retrieved {RecommendedCount} hearing aids out of {TotalCount} for patient {PatientId}",
                    hearingAidRecommendations.Count, totalCount, patientId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get hearing aid recommendations for patient {PatientId}", patientId);
            }

            // Get enriched assessment data
            var enrichedAssessment = await GetEnrichedAssessmentDataAsync(patientId, assessment);

            // Generate filter summary
            var filterSummary = GenerateFilterSummary(allFilters);

            return new AssessmentResultsWithRecommendations
            {
                Assessment = enrichedAssessment,
                RecommendedHearingAids = hearingAidRecommendations,
                AppliedFilters = allFilters,
                TotalAvailableOptions = totalCount,
                FilterSummary = filterSummary
            };
        }

        // Helper method to generate a readable filter summary
        private string GenerateFilterSummary(List<DatabaseFilter> filters)
        {
            if (filters.Count == 0)
            {
                return "No specific filters applied - showing all available hearing aids.";
            }

            var summaryParts = new List<string>();

            foreach (var filter in filters)
            {
                var operatorText = filter.Operator switch
                {
                    "not_in" => "excluding",
                    "in" => "including only",
                    "equals" => "equal to",
                    "not_equals" => "not equal to",
                    "contains" => "containing",
                    "not_contains" => "not containing",
                    "less_than_or_equal" => "≤",
                    "greater_than_or_equal" => "≥",
                    _ => filter.Operator
                };

                var valueText = string.Join(", ", filter.Values);
                summaryParts.Add($"{filter.Field} {operatorText} {valueText}");
            }

            return $"Applied filters: {string.Join("; ", summaryParts)}.";
        }

        // Method to get enriched assessment data for retrieval
        public async Task<CompletedAssessment> GetEnrichedAssessmentDataAsync(int patientId, PatientAssessmentData assessment)
        {
            try
            {
                // Create a mock request to regenerate the rich data
                var mockRequest = new CompleteAssessmentRequest
                {
                    PatientId = patientId,
                    TotalQuestions = assessment.TotalQuestions,
                    FinalNodeId = assessment.FinalNodeId,
                    FinalAction = assessment.FinalAction
                };

                var settings = await GetSettingsAsync();
                var (recommendation, nextSteps, keyFindings) = await GenerateAssessmentResultsAsync(assessment, mockRequest, settings);

                return new CompletedAssessment
                {
                    Id = assessment.Id,
                    PatientId = patientId,
                    Status = assessment.Status,
                    CompletedDate = assessment.CompletedDate,
                    TotalQuestions = assessment.TotalQuestions,
                    KeyFindings = keyFindings,
                    FinalRecommendation = recommendation,
                    NextSteps = nextSteps,
                    CurrentModule = await GetModuleNameFromNodeIdAsync(assessment.FinalNodeId),
                    FinalNodeId = assessment.FinalNodeId,
                    FinalAction = assessment.FinalAction
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error enriching assessment data for patient {PatientId}", patientId);

                // Return basic data if enrichment fails
                return new CompletedAssessment
                {
                    Id = assessment.Id,
                    PatientId = patientId,
                    Status = assessment.Status,
                    CompletedDate = assessment.CompletedDate,
                    TotalQuestions = assessment.TotalQuestions,
                    KeyFindings = new[] { $"Assessment completed with {assessment.TotalQuestions} questions answered" },
                    FinalRecommendation = "Assessment completed successfully. Ready to proceed with comprehensive hearing aid evaluation.",
                    NextSteps = "Proceed to hearing aid consultation and fitting process.",
                    CurrentModule = "Assessment Complete",
                    FinalNodeId = assessment.FinalNodeId,
                    FinalAction = assessment.FinalAction
                };
            }
        }

        private async Task<(string recommendation, string nextSteps, string[] keyFindings)> GenerateAssessmentResultsAsync(
            PatientAssessmentData assessment,
            CompleteAssessmentRequest request,
            AssessmentSettings settings)
        {
            try
            {
                // Get the final node to understand what recommendation template to use
                var finalNode = await _decisionTreeService.GetNodeAsync(request.FinalNodeId);

                // Determine the template type based on final node and actions
                var templateType = await DetermineTemplateTypeAsync(assessment, finalNode, request.FinalAction);

                // Get the appropriate template
                var template = GetRecommendationTemplate(settings, templateType);

                // Generate detailed key findings based on assessment path
                var keyFindings = await GenerateKeyFindingsAsync(assessment, finalNode, template);

                // Enhance next steps with assessment-specific information
                var nextSteps = await EnhanceNextStepsAsync(template.NextSteps, assessment);

                return (template.Recommendation, nextSteps, keyFindings);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating assessment results for patient {PatientId}", assessment.PatientId);

                // Use fallback from templates or create minimal fallback
                var fallbackTemplate = GetRecommendationTemplate(settings, "normal");
                var basicFindings = GenerateBasicKeyFindings(assessment);

                return (fallbackTemplate.Recommendation, fallbackTemplate.NextSteps, basicFindings);
            }
        }

        private async Task<string> DetermineTemplateTypeAsync(PatientAssessmentData assessment, DecisionNode? finalNode, string? finalAction)
        {
            // Check final node ID patterns
            if (!string.IsNullOrEmpty(finalNode?.Description))
            {
                var nodeDescription = finalNode.Description.ToLower();

                if (nodeDescription.Contains("urgent") || nodeDescription.Contains("emergency"))
                    return "urgent";

                if (nodeDescription.Contains("contraindication"))
                    return "contraindication";

                if (nodeDescription.Contains("cochlear implant"))
                    return "cochlear_implant";

                if (nodeDescription.Contains("ent") || nodeDescription.Contains("medical referral"))
                    return "ent_referral";
            }

            // Check final action content
            if (!string.IsNullOrEmpty(finalAction))
            {
                var actionLower = finalAction.ToLower();

                if (actionLower.Contains("urgent") || actionLower.Contains("emergency") ||
                    actionLower.Contains("immediate") || actionLower.Contains("24-48 hours") ||
                    actionLower.Contains("24 hours"))
                    return "urgent";

                if (actionLower.Contains("contraindication") || actionLower.Contains("not suitable") ||
                    actionLower.Contains("absolute contraindication"))
                    return "contraindication";

                if (actionLower.Contains("cochlear implant"))
                    return "cochlear_implant";

                if (actionLower.Contains("ent referral") || actionLower.Contains("medical referral") ||
                    actionLower.Contains("refer to ent") || actionLower.Contains("medical evaluation"))
                    return "ent_referral";
            }

            // Check node action content
            if (!string.IsNullOrEmpty(finalNode?.Action))
            {
                var nodeActionLower = finalNode.Action.ToLower();

                if (nodeActionLower.Contains("urgent") || nodeActionLower.Contains("emergency"))
                    return "urgent";

                if (nodeActionLower.Contains("contraindication"))
                    return "contraindication";

                if (nodeActionLower.Contains("cochlear implant"))
                    return "cochlear_implant";

                if (nodeActionLower.Contains("ent referral") || nodeActionLower.Contains("medical referral"))
                    return "ent_referral";
            }

            // Check assessment path for patterns
            var pathIndicators = await AnalyzeAssessmentPathAsync(assessment);
            if (!string.IsNullOrEmpty(pathIndicators))
                return pathIndicators;

            return "normal";
        }

        private async Task<string?> AnalyzeAssessmentPathAsync(PatientAssessmentData assessment)
        {
            // Look for specific answer patterns that might indicate template type
            var answers = assessment.Answers ?? new List<AssessmentAnswerData>();

            foreach (var answer in answers)
            {
                if (answer.Answer?.ToLower().Contains("cochlear") == true)
                    return "cochlear_implant";

                // Check for other patterns based on your decision tree
                if (answer.Answer?.ToLower() == "hearing_aids" && answer.QuestionId == "q3_previous_hearing_aids")
                    continue; // Normal hearing aids experience

                if (answer.Answer?.ToLower() == "cochlear_implants" && answer.QuestionId == "q3_previous_hearing_aids")
                    return "cochlear_implant";
            }

            return null;
        }

        private RecommendationTemplate GetRecommendationTemplate(AssessmentSettings settings, string templateType)
        {
            if (settings.Templates?.ContainsKey(templateType) == true)
            {
                return settings.Templates[templateType];
            }

            // If specific template not found, try normal template
            if (settings.Templates?.ContainsKey("normal") == true)
            {
                return settings.Templates["normal"];
            }

            // If no templates available at all, return empty template
            return new RecommendationTemplate
            {
                Recommendation = "",
                NextSteps = "",
                KeyFinding = ""
            };
        }

        private async Task<string[]> GenerateKeyFindingsAsync(PatientAssessmentData assessment, DecisionNode? finalNode, RecommendationTemplate template)
        {
            var findings = new List<string>();

            // Add the template key finding if available
            if (!string.IsNullOrEmpty(template.KeyFinding))
            {
                findings.Add(template.KeyFinding);
            }

            // Add findings from final node action if available
            if (!string.IsNullOrEmpty(finalNode?.Action))
            {
                var actionFindings = ExtractClinicalFindingsFromAction(finalNode.Action);
                findings.AddRange(actionFindings);
            }

            // Add findings from assessment path
            var pathFindings = await GenerateFindingsFromAssessmentPathAsync(assessment);
            findings.AddRange(pathFindings);

            return findings.Count > 0 ? findings.ToArray() : GenerateBasicKeyFindings(assessment);
        }

        private string[] GenerateBasicKeyFindings(PatientAssessmentData assessment)
        {
            var completionTime = assessment.CompletedDate?.ToString("yyyy-MM-dd HH:mm") ??
                               DateTime.Now.ToString("yyyy-MM-dd HH:mm");

            return new[]
            {
                $"Assessment completed with {assessment.Answers.Count} questions answered",
                $"Completed on: {completionTime}"
            };
        }

        private List<string> ExtractClinicalFindingsFromAction(string action)
        {
            var findings = new List<string>();

            // Split action text into meaningful segments
            var sentences = action.Split(new[] { ". ", "\n", "(1)", "(2)", "(3)", "(4)", "(5)", "(6)" },
                StringSplitOptions.RemoveEmptyEntries);

            foreach (var sentence in sentences)
            {
                var trimmed = sentence.Trim();
                if (trimmed.Length > 20 && !trimmed.ToUpper().StartsWith("ACTIONS") &&
                    !trimmed.ToUpper().StartsWith("DOCUMENT") && !trimmed.StartsWith("("))
                {
                    // Extract meaningful clinical findings
                    if (trimmed.Contains("Flag for") || trimmed.Contains("identified") ||
                        trimmed.Contains("suggests") || trimmed.Contains("indicates") ||
                        trimmed.Contains("URGENT") || trimmed.Contains("CONTRAINDICATION"))
                    {
                        findings.Add(trimmed);

                        // Only take first 2-3 meaningful findings to avoid overwhelming display
                        if (findings.Count >= 3) break;
                    }
                }
            }

            return findings;
        }

        private async Task<List<string>> GenerateFindingsFromAssessmentPathAsync(PatientAssessmentData assessment)
        {
            var findings = new List<string>();
            var answers = assessment.Answers ?? new List<AssessmentAnswerData>();

            // Add finding about number of questions
            findings.Add($"Assessment completed with {answers.Count} questions answered");

            // Add module progression information
            var moduleProgression = await GetModuleProgressionAsync(answers);
            if (!string.IsNullOrEmpty(moduleProgression))
            {
                findings.Add(moduleProgression);
            }

            // Add completion timestamp
            var completionTime = assessment.CompletedDate?.ToString("yyyy-MM-dd HH:mm") ??
                                DateTime.Now.ToString("yyyy-MM-dd HH:mm");
            findings.Add($"Completed on: {completionTime}");

            return findings;
        }

        private async Task<string> GetModuleProgressionAsync(List<AssessmentAnswerData> answers)
        {
            if (answers.Count == 0) return "";

            var decisionTree = await _decisionTreeService.LoadDecisionTreeAsync();
            if (decisionTree?.Modules == null) return "";

            var modules = new HashSet<string>();

            foreach (var answer in answers)
            {
                var node = await _decisionTreeService.GetNodeAsync(answer.QuestionId);
                if (!string.IsNullOrEmpty(node?.Module))
                {
                    modules.Add(node.Module);
                }
            }

            if (modules.Count > 0)
            {
                var moduleNames = new List<string>();
                foreach (var moduleKey in modules)
                {
                    if (decisionTree.Modules.ContainsKey(moduleKey))
                    {
                        moduleNames.Add(decisionTree.Modules[moduleKey].Name ?? moduleKey);
                    }
                    else
                    {
                        moduleNames.Add(moduleKey);
                    }
                }
                return $"Assessment path covered modules: {string.Join(", ", moduleNames)}";
            }

            return "";
        }

        private async Task<string> GetModuleNameFromNodeIdAsync(string? nodeId)
        {
            if (string.IsNullOrEmpty(nodeId)) return "Assessment Complete";

            var node = await _decisionTreeService.GetNodeAsync(nodeId);
            if (!string.IsNullOrEmpty(node?.Module))
            {
                var decisionTree = await _decisionTreeService.LoadDecisionTreeAsync();
                if (decisionTree?.Modules?.ContainsKey(node.Module) == true)
                {
                    return decisionTree.Modules[node.Module].Name ?? node.Module;
                }
                return node.Module;
            }

            return "Assessment Complete";
        }

        private async Task<string> EnhanceNextStepsAsync(string baseNextSteps, PatientAssessmentData assessment)
        {
            if (string.IsNullOrEmpty(baseNextSteps)) return "";

            var enhancedSteps = baseNextSteps;

            // Add assessment-specific information if not already present
            var completionDate = assessment.CompletedDate?.ToString("yyyy-MM-dd HH:mm") ??
                               DateTime.Now.ToString("yyyy-MM-dd HH:mm");

            // Only add completion info if not already present in the template
            if (!enhancedSteps.ToLower().Contains("completed") && !enhancedSteps.ToLower().Contains("assessment"))
            {
                enhancedSteps += $"\n• Assessment completed on: {completionDate}";
            }

            return enhancedSteps;
        }

        public async Task<PatientAssessmentData?> GetPatientAssessmentAsync(int patientId)
        {
            return await _assessmentRepository.GetPatientAssessmentAsync(patientId);
        }

        public async Task<PatientAssessmentData?> GetPatientAnswersAsync(int patientId)
        {
            return await _assessmentRepository.GetPatientAssessmentAsync(patientId)
                   ?? await _assessmentRepository.GetActiveAssessmentAsync(patientId);
        }

        public async Task<TestResult> TestDecisionTreeAsync()
        {
            try
            {
                var decisionTree = await _decisionTreeService.LoadDecisionTreeAsync();
                var settings = await GetSettingsAsync();

                if (decisionTree == null)
                {
                    return new TestResult
                    {
                        Success = false,
                        Message = "Decision tree file not found"
                    };
                }

                await _assessmentRepository.GetPatientAssessmentAsync(999999);

                return new TestResult
                {
                    Success = true,
                    Message = $"All systems working: database connected, config loaded from {_settingsPath}",
                    NodeCount = decisionTree.Nodes?.Count ?? 0,
                    HasRootNode = decisionTree.Nodes?.ContainsKey("root") ?? false,
                    FirstFewNodes = decisionTree.Nodes?.Keys.Take(5).ToArray()
                };
            }
            catch (Exception ex)
            {
                return new TestResult
                {
                    Success = false,
                    Message = ex.Message
                };
            }
        }

        // ENHANCED: DeleteAnswerAsync with better error handling and logging
        public async Task<bool> DeleteAnswerAsync(int patientId, string questionId)
        {
            try
            {
                _logger.LogInformation("Attempting to delete answer for patient {PatientId}, question {QuestionId}",
                    patientId, questionId);

                var success = await _assessmentRepository.DeleteAnswerAsync(patientId, questionId);

                if (success)
                {
                    _logger.LogInformation("Successfully deleted answer for patient {PatientId}, question {QuestionId}",
                        patientId, questionId);
                }
                else
                {
                    _logger.LogWarning("Failed to delete answer for patient {PatientId}, question {QuestionId} - not found",
                        patientId, questionId);
                }

                return success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting answer for patient {PatientId}, question {QuestionId}",
                    patientId, questionId);
                return false;
            }
        }
    }
}