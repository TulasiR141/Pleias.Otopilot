using Microsoft.AspNetCore.Mvc;
using AudiologyChatBot.Core.Interfaces;
using AudiologyChatBot.Core.Models;

namespace ChatbotAPI.Controllers
{
    [ApiController]
    [Route("api")]
    public class AssessmentController : ControllerBase
    {
        private readonly ILogger<AssessmentController> _logger;
        private readonly IAssessmentService _assessmentService;

        public AssessmentController(ILogger<AssessmentController> logger, IAssessmentService assessmentService)
        {
            _logger = logger;
            _assessmentService = assessmentService;
        }

        // Get specific question from decision tree
        [HttpGet("assessment/question/{nodeId}")]
        public async Task<IActionResult> GetQuestion(string nodeId)
        {
            try
            {
                _logger.LogInformation("Attempting to get question for nodeId: {NodeId}", nodeId);

                var node = await _assessmentService.GetQuestionAsync(nodeId);

                if (node == null)
                {
                    _logger.LogError("Node {NodeId} not found in decision tree", nodeId);
                    return NotFound($"Question node '{nodeId}' not found in decision tree");
                }

                _logger.LogInformation("Found node {NodeId}: Question='{Question}', Next='{Next}', Action='{Action}'",
                    nodeId, node.Question, node.Next, node.Action);

                // Determine node type based on content
                string nodeType = DetermineNodeType(node);

                // Return all node data with node type classification
                var result = new
                {
                    nodeId = nodeId,
                    nodeType = nodeType, // Add node type for frontend logic
                    question = node.Question,
                    description = node.Description,
                    module = node.Module,
                    conditions = node.Conditions,
                    action = node.Action,
                    next = node.Next,
                    database_filters = node.GetDatabaseFilters(), // Use helper method
                    isEndNode = nodeType == "terminal" // Only terminal nodes are end nodes
                };

                _logger.LogInformation("Successfully returning question data for node {NodeId} of type {NodeType}", nodeId, nodeType);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving question {NodeId}", nodeId);
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // Helper method to determine node type
        private string DetermineNodeType(dynamic node)
        {
            bool hasQuestion = !string.IsNullOrEmpty(node.Question);
            bool hasAction = !string.IsNullOrEmpty(node.Action);
            bool hasNext = !string.IsNullOrEmpty(node.Next);
            bool hasConditions = false;

            // Safe check for conditions
            try
            {
                hasConditions = node.Conditions != null &&
                               ((IDictionary<string, string>)node.Conditions).Count > 0;
            }
            catch
            {
                // If casting fails, try alternative approaches
                try
                {
                    hasConditions = node.Conditions != null &&
                                   node.Conditions.ToString() != "{}";
                }
                catch
                {
                    hasConditions = false;
                }
            }

            // Terminal node: no next node AND no conditions (may have action)
            if (!hasNext && !hasConditions)
            {
                return "terminal";
            }

            // Root node: no question, no action, has next
            if (!hasQuestion && !hasAction && hasNext)
            {
                return "root";
            }

            // Question node: has question (may or may not have action, conditions, or next)
            if (hasQuestion)
            {
                return "question";
            }

            // Flag/Action node: no question, has action, has next or conditions
            if (!hasQuestion && hasAction && (hasNext || hasConditions))
            {
                return "flag";
            }

            // Default fallback
            return "unknown";
        }

        // UPDATED: Save an answer to an assessment question (now includes database filters and patientId validation)
        [HttpPost("patient/{patientId}/assessment/answer")]
        public async Task<IActionResult> SaveAnswer(int patientId, [FromBody] SaveAnswerRequest request)
        {
            try
            {
                // Log the incoming request for debugging
                _logger.LogInformation("SaveAnswer called for patient {PatientId} with request: {@Request}",
                    patientId, new
                    {
                        request.QuestionId,
                        request.Answer,
                        request.NodeType,
                        FilterCount = request.DatabaseFilters?.Count ?? 0
                    });

                // Validate request
                if (string.IsNullOrEmpty(request.QuestionId))
                {
                    return BadRequest("QuestionId is required");
                }

                if (string.IsNullOrEmpty(request.Answer))
                {
                    return BadRequest("Answer is required");
                }

                // Validate that the patientId in URL matches the one in request body (if provided)
                if (request.PatientId != 0 && request.PatientId != patientId)
                {
                    _logger.LogWarning("PatientId mismatch: URL={UrlPatientId}, Body={BodyPatientId}",
                        patientId, request.PatientId);
                    return BadRequest("PatientId in URL does not match PatientId in request body");
                }

                // Ensure the request has the correct patientId
                request.PatientId = patientId;

                var success = await _assessmentService.SaveAnswerAsync(patientId, request);

                if (!success)
                {
                    _logger.LogError("SaveAnswerAsync returned false for patient {PatientId}, question {QuestionId}",
                        patientId, request.QuestionId);
                    return StatusCode(500, "Failed to save answer");
                }

                // Log both answer and commentary/filters if provided
                var logMessage = "Saved answer for patient {PatientId}, question {QuestionId}: {Answer}";
                if (!string.IsNullOrEmpty(request.Commentary))
                {
                    logMessage += " with commentary";
                }
                if (request.DatabaseFilters?.Count > 0)
                {
                    logMessage += " with {FilterCount} database filters";
                }

                _logger.LogInformation(logMessage, patientId, request.QuestionId, request.Answer, request.DatabaseFilters?.Count ?? 0);

                return Ok(new { message = "Answer saved successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving answer for patient {PatientId}. Request: {@Request}",
                    patientId, new
                    {
                        request?.QuestionId,
                        request?.Answer,
                        request?.NodeType
                    });
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // Delete a specific answer (for going back functionality)
        [HttpDelete("patient/{patientId}/assessment/answer/{questionId}")]
        public async Task<IActionResult> DeleteAnswer(int patientId, string questionId)
        {
            try
            {
                var success = await _assessmentService.DeleteAnswerAsync(patientId, questionId);

                if (!success)
                {
                    return NotFound("Answer not found or could not be deleted");
                }

                _logger.LogInformation("Deleted answer for patient {PatientId}, question {QuestionId}", patientId, questionId);

                return Ok(new { message = "Answer deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting answer for patient {PatientId}, question {QuestionId}", patientId, questionId);
                return StatusCode(500, "Internal server error");
            }
        }

        // Complete an assessment
        [HttpPost("patient/{patientId}/assessment/complete")]
        public async Task<IActionResult> CompleteAssessment(int patientId, [FromBody] CompleteAssessmentRequest request)
        {
            try
            {
                var completedAssessment = await _assessmentService.CompleteAssessmentAsync(patientId, request);

                _logger.LogInformation("Completed assessment for patient {PatientId} with {TotalQuestions} questions, final node: {FinalNode}",
                    patientId, completedAssessment.TotalQuestions, completedAssessment.FinalNodeId);

                return Ok(completedAssessment);
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error completing assessment for patient {PatientId}", patientId);
                return StatusCode(500, "Internal server error");
            }
        }

        // Get existing assessment for a patient - now returns rich data
        [HttpGet("patient/{patientId}/assessment")]
        public async Task<IActionResult> GetPatientAssessment(int patientId)
        {
            try
            {
                var assessment = await _assessmentService.GetPatientAssessmentAsync(patientId);

                if (assessment == null)
                {
                    return NotFound("No completed assessment found for this patient");
                }

                // Generate rich results for completed assessments
                var enrichedData = await _assessmentService.GetEnrichedAssessmentDataAsync(patientId, assessment);

                return Ok(new
                {
                    id = assessment.Id,
                    patientId = assessment.PatientId,
                    status = assessment.Status,
                    date = assessment.CompletedDate ?? assessment.StartDate,
                    completedDate = assessment.CompletedDate,
                    totalQuestions = assessment.TotalQuestions,
                    finalNodeId = assessment.FinalNodeId,
                    finalAction = assessment.FinalAction,
                    answers = assessment.Answers,
                    // Include rich data
                    finalRecommendation = enrichedData.FinalRecommendation,
                    keyFindings = enrichedData.KeyFindings,
                    nextSteps = enrichedData.NextSteps,
                    currentModule = enrichedData.CurrentModule
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving assessment for patient {PatientId}", patientId);
                return StatusCode(500, "Internal server error");
            }
        }

        // Get assessment results with hearing aid recommendations
        [HttpGet("patient/{patientId}/assessment/recommendations")]
        public async Task<IActionResult> GetAssessmentWithRecommendations(int patientId)
        {
            try
            {
                var assessmentWithRecommendations = await _assessmentService.GetAssessmentWithRecommendationsAsync(patientId);

                return Ok(new
                {
                    assessment = new
                    {
                        id = assessmentWithRecommendations.Assessment.Id,
                        patientId = assessmentWithRecommendations.Assessment.PatientId,
                        status = assessmentWithRecommendations.Assessment.Status,
                        completedDate = assessmentWithRecommendations.Assessment.CompletedDate,
                        totalQuestions = assessmentWithRecommendations.Assessment.TotalQuestions,
                        finalRecommendation = assessmentWithRecommendations.Assessment.FinalRecommendation,
                        keyFindings = assessmentWithRecommendations.Assessment.KeyFindings,
                        nextSteps = assessmentWithRecommendations.Assessment.NextSteps,
                        currentModule = assessmentWithRecommendations.Assessment.CurrentModule
                    },
                    hearingAidRecommendations = assessmentWithRecommendations.RecommendedHearingAids.Select(ha => new
                    {
                        id = ha.Id,
                        hearingAidName = ha.HearingAidName,
                        manufacturer = ha.Manufacturer,
                        description = ha.Description,
                        descriptionProductLine = ha.DescriptionProductLine,
                        hearingAidStyle = ha.HearingAidStyle,
                        maxGainHearingLossCompatibility = ha.MaxGainHearingLossCompatibility,
                        batterySize = ha.BatterySize,
                        maxOutputDbSpl = ha.MaxOutputDbSpl,
                        styleFormFactor = ha.StyleFormFactor,
                        tinnitusManagementFeatures = ha.TinnitusManagementFeatures,
                        cochlearImplantCompatible = ha.CochlearImplantCompatible
                    }),
                    filterInfo = new
                    {
                        appliedFilters = assessmentWithRecommendations.AppliedFilters.Select(f => new
                        {
                            field = f.Field,
                            operator_ = f.Operator,
                            values = f.Values,
                            reason = f.Reason
                        }),
                        filterSummary = assessmentWithRecommendations.FilterSummary,
                        totalAvailableOptions = assessmentWithRecommendations.TotalAvailableOptions,
                        recommendedCount = assessmentWithRecommendations.RecommendedHearingAids.Count
                    }
                });
            }
            catch (InvalidOperationException ex)
            {
                return NotFound(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving assessment with recommendations for patient {PatientId}", patientId);
                return StatusCode(500, "Internal server error");
            }
        }

        // Get all answers for a patient (now includes commentaries and filters)
        [HttpGet("patient/{patientId}/assessment/answers")]
        public async Task<IActionResult> GetPatientAnswers(int patientId)
        {
            try
            {
                var assessment = await _assessmentService.GetPatientAnswersAsync(patientId);

                if (assessment == null)
                {
                    return NotFound("No assessment found for this patient");
                }

                return Ok(new
                {
                    patientId = patientId,
                    status = assessment.Status,
                    startDate = assessment.StartDate,
                    completedDate = assessment.CompletedDate,
                    totalAnswers = assessment.Answers.Count,
                    finalNodeId = assessment.FinalNodeId,
                    finalAction = assessment.FinalAction,
                    answers = assessment.Answers.Select(a => new
                    {
                        sequenceNumber = a.SequenceNumber,
                        questionId = a.QuestionId,
                        questionText = a.QuestionText,
                        answer = a.Answer,
                        commentary = a.Commentary, // Include commentary in response
                        databaseFilters = a.GetDatabaseFilters(), // Include database filters in response
                        nodeType = a.NodeType,
                        timestamp = a.Timestamp
                    })
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving answers for patient {PatientId}", patientId);
                return StatusCode(500, "Internal server error");
            }
        }

        // Test endpoint to check if decision tree file can be read
        [HttpGet("assessment/test")]
        public async Task<IActionResult> TestDecisionTree()
        {
            try
            {
                _logger.LogInformation("Testing decision tree file access");

                var testResult = await _assessmentService.TestDecisionTreeAsync();

                return Ok(testResult);
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    success = false,
                    message = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        [HttpPost("assessment/debug/save")]
        public async Task<IActionResult> DebugSave([FromBody] SaveAnswerRequest request)
        {
            try
            {
                _logger.LogInformation("Debug save attempt with request: {@Request}", request);

                // Test the save operation with detailed error handling
                var success = await _assessmentService.SaveAnswerAsync(1, request); // Use patient ID 1 for testing

                return Ok(new
                {
                    success = success,
                    message = success ? "Save successful" : "Save failed",
                    request = request
                });
            }
            catch (Exception ex)
            {
                return Ok(new
                {
                    success = false,
                    error = ex.Message,
                    innerError = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace?.Split('\n').Take(5).ToArray()
                });
            }
        }
    }
}