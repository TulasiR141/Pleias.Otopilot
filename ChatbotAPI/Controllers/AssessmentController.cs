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

                // If this node has no question and no next node, it's a terminal action node
                if (string.IsNullOrEmpty(node.Question) && string.IsNullOrEmpty(node.Next))
                {
                    _logger.LogInformation("Node {NodeId} is a terminal node - end of assessment path", nodeId);

                    return Ok(new
                    {
                        nodeId = nodeId,
                        question = (string?)null,
                        description = node.Description,
                        module = node.Module,
                        conditions = (Dictionary<string, string>?)null,
                        action = node.Action,
                        next = node.Next,
                        isEndNode = true,
                        endReason = "Terminal node reached - no next question available"
                    });
                }

                // Regular question node - has a question
                var result = new
                {
                    nodeId = nodeId,
                    question = node.Question,
                    description = node.Description,
                    module = node.Module,
                    conditions = node.Conditions,
                    action = node.Action,
                    next = node.Next,
                    isEndNode = false
                };

                _logger.LogInformation("Successfully returning question data for node {NodeId}", nodeId);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving question {NodeId}", nodeId);
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // Save an answer to an assessment question (now includes commentary)
        [HttpPost("patient/{patientId}/assessment/answer")]
        public async Task<IActionResult> SaveAnswer(int patientId, [FromBody] SaveAnswerRequest request)
        {
            try
            {
                var success = await _assessmentService.SaveAnswerAsync(patientId, request);
                
                if (!success)
                {
                    return StatusCode(500, "Failed to save answer");
                }

                // Log both answer and commentary if provided
                var logMessage = "Saved answer for patient {PatientId}, question {QuestionId}: {Answer}";
                if (!string.IsNullOrEmpty(request.Commentary))
                {
                    logMessage += " with commentary";
                }
                
                _logger.LogInformation(logMessage, patientId, request.QuestionId, request.Answer);

                return Ok(new { message = "Answer saved successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving answer for patient {PatientId}", patientId);
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

        // FIXED: Get existing assessment for a patient - now returns rich data
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

                // ENHANCED: Generate rich results for completed assessments
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
                    // NEW: Include rich data
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

        // Get all answers for a patient (now includes commentaries)
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
                        commentary = a.Commentary, // NEW: Include commentary in response
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
                return Ok(new { 
                    success = false, 
                    message = ex.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }
    }
}