using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace ChatbotAPI.Controllers
{
    [ApiController]
    [Route("api")]
    public class AssessmentController : ControllerBase
    {
        private readonly ILogger<AssessmentController> _logger;
        private readonly string _decisionTreePath;
        
        // Simple in-memory storage for patient assessments (will be replaced with database later)
        private static readonly Dictionary<int, PatientAssessmentData> _patientAssessments = new();

        public AssessmentController(ILogger<AssessmentController> logger, IWebHostEnvironment env)
        {
            _logger = logger;
            _decisionTreePath = Path.Combine(env.ContentRootPath, "data", "decisionTree.json");
        }

        // Get specific question from decision tree
        [HttpGet("assessment/question/{nodeId}")]
        public async Task<IActionResult> GetQuestion(string nodeId)
        {
            try
            {
                _logger.LogInformation("Attempting to get question for nodeId: {NodeId}", nodeId);

                if (!System.IO.File.Exists(_decisionTreePath))
                {
                    _logger.LogError("Decision tree file not found at path: {Path}", _decisionTreePath);
                    return NotFound($"Decision tree file not found at: {_decisionTreePath}");
                }

                var jsonContent = await System.IO.File.ReadAllTextAsync(_decisionTreePath);
                var decisionTree = JsonSerializer.Deserialize<DecisionTree>(jsonContent, new JsonSerializerOptions 
                { 
                    PropertyNameCaseInsensitive = true 
                });

                if (decisionTree?.Nodes == null)
                {
                    _logger.LogError("Failed to deserialize decision tree or nodes are null");
                    return BadRequest("Invalid decision tree format");
                }

                if (!decisionTree.Nodes.ContainsKey(nodeId))
                {
                    _logger.LogError("Node {NodeId} not found in decision tree", nodeId);
                    return NotFound($"Question node '{nodeId}' not found in decision tree");
                }

                var node = decisionTree.Nodes[nodeId];
                _logger.LogInformation("Found node {NodeId}: Question='{Question}', Next='{Next}', Action='{Action}'", 
                    nodeId, node.Question, node.Next, node.Action);
                
                // If this node has no question but has a "next" node, redirect to the next node
                if (string.IsNullOrEmpty(node.Question) && !string.IsNullOrEmpty(node.Next))
                {
                    _logger.LogInformation("Node {NodeId} has no question but has next node {NextNode}, redirecting", nodeId, node.Next);
                    
                    // Log any action if present
                    if (!string.IsNullOrEmpty(node.Action))
                    {
                        _logger.LogInformation("Action at node {NodeId}: {Action}", nodeId, node.Action);
                    }
                    
                    // Recursively get the next question
                    return await GetQuestion(node.Next);
                }
                
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
            catch (JsonException jsonEx)
            {
                _logger.LogError(jsonEx, "JSON deserialization error for nodeId {NodeId}", nodeId);
                return BadRequest($"Invalid JSON format in decision tree: {jsonEx.Message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving question {NodeId}", nodeId);
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // Save an answer to an assessment question (store in memory list)
        [HttpPost("patient/{patientId}/assessment/answer")]
        public IActionResult SaveAnswer(int patientId, [FromBody] SaveAnswerRequest request)
        {
            try
            {
                // Initialize patient assessment if it doesn't exist
                if (!_patientAssessments.ContainsKey(patientId))
                {
                    _patientAssessments[patientId] = new PatientAssessmentData
                    {
                        PatientId = patientId,
                        StartDate = DateTime.UtcNow,
                        Status = "In Progress",
                        Answers = new List<AssessmentAnswerData>()
                    };
                }

                var assessment = _patientAssessments[patientId];
                
                // Add the answer to the list
                var answer = new AssessmentAnswerData
                {
                    QuestionId = request.QuestionId,
                    QuestionText = request.QuestionText,
                    Answer = request.Answer,
                    Timestamp = DateTime.UtcNow,
                    SequenceNumber = assessment.Answers.Count + 1
                };

                assessment.Answers.Add(answer);
                assessment.CurrentNodeId = request.QuestionId;

                _logger.LogInformation("Saved answer for patient {PatientId}, question {QuestionId}: {Answer}", 
                    patientId, request.QuestionId, request.Answer);

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
        public IActionResult CompleteAssessment(int patientId, [FromBody] CompleteAssessmentRequest request)
        {
            try
            {
                if (!_patientAssessments.ContainsKey(patientId))
                {
                    return NotFound("No active assessment found for this patient");
                }

                var assessment = _patientAssessments[patientId];
                assessment.Status = "Completed";
                assessment.CompletedDate = DateTime.UtcNow;
                assessment.TotalQuestions = request.TotalQuestions;
                assessment.FinalNodeId = request.FinalNodeId;
                assessment.FinalAction = request.FinalAction;

                // Generate key findings based on the assessment path
                var keyFindings = GenerateKeyFindings(assessment);

                var completedAssessment = new
                {
                    id = patientId, // Using patientId as temporary ID
                    patientId = patientId,
                    status = assessment.Status,
                    completedDate = assessment.CompletedDate,
                    totalQuestions = assessment.TotalQuestions,
                    keyFindings = keyFindings,
                    finalRecommendation = GenerateFinalRecommendation(assessment),
                    nextSteps = GenerateNextSteps(assessment),
                    currentModule = "Assessment Complete",
                    finalNodeId = assessment.FinalNodeId,
                    finalAction = assessment.FinalAction
                };

                _logger.LogInformation("Completed assessment for patient {PatientId} with {AnswerCount} answers, final node: {FinalNode}", 
                    patientId, assessment.Answers.Count, assessment.FinalNodeId);

                return Ok(completedAssessment);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error completing assessment for patient {PatientId}", patientId);
                return StatusCode(500, "Internal server error");
            }
        }

        // Get existing assessment for a patient
        [HttpGet("patient/{patientId}/assessment")]
        public IActionResult GetPatientAssessment(int patientId)
        {
            try
            {
                if (!_patientAssessments.ContainsKey(patientId) || 
                    _patientAssessments[patientId].Status != "Completed")
                {
                    return NotFound("No completed assessment found for this patient");
                }

                var assessment = _patientAssessments[patientId];

                return Ok(new
                {
                    id = patientId,
                    patientId = assessment.PatientId,
                    status = assessment.Status,
                    date = assessment.CompletedDate ?? assessment.StartDate,
                    completedDate = assessment.CompletedDate,
                    totalQuestions = assessment.TotalQuestions,
                    keyFindings = GenerateKeyFindings(assessment),
                    finalRecommendation = GenerateFinalRecommendation(assessment),
                    nextSteps = GenerateNextSteps(assessment),
                    currentModule = "Assessment Complete",
                    finalNodeId = assessment.FinalNodeId,
                    finalAction = assessment.FinalAction
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving assessment for patient {PatientId}", patientId);
                return StatusCode(500, "Internal server error");
            }
        }

        // Get all answers for a patient (for debugging/testing)
        [HttpGet("patient/{patientId}/assessment/answers")]
        public IActionResult GetPatientAnswers(int patientId)
        {
            try
            {
                if (!_patientAssessments.ContainsKey(patientId))
                {
                    return NotFound("No assessment found for this patient");
                }

                var assessment = _patientAssessments[patientId];
                
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
                _logger.LogInformation("File path: {Path}", _decisionTreePath);
                _logger.LogInformation("File exists: {Exists}", System.IO.File.Exists(_decisionTreePath));

                if (!System.IO.File.Exists(_decisionTreePath))
                {
                    return Ok(new { 
                        success = false, 
                        message = "Decision tree file not found",
                        path = _decisionTreePath,
                        currentDirectory = Directory.GetCurrentDirectory()
                    });
                }

                var jsonContent = await System.IO.File.ReadAllTextAsync(_decisionTreePath);
                var decisionTree = JsonSerializer.Deserialize<DecisionTree>(jsonContent, new JsonSerializerOptions 
                { 
                    PropertyNameCaseInsensitive = true 
                });

                return Ok(new { 
                    success = true, 
                    message = "Decision tree loaded successfully",
                    nodeCount = decisionTree?.Nodes?.Count ?? 0,
                    hasRootNode = decisionTree?.Nodes?.ContainsKey("root") ?? false,
                    firstFewNodes = decisionTree?.Nodes?.Keys.Take(5).ToArray()
                });
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

        // Helper methods
        private string[] GenerateKeyFindings(PatientAssessmentData assessment)
        {
            var findings = new List<string>();
            
            findings.Add($"Assessment completed with {assessment.Answers.Count} questions answered");
            
            if (!string.IsNullOrEmpty(assessment.FinalNodeId))
            {
                findings.Add($"Assessment path concluded at node: {assessment.FinalNodeId}");
            }
            
            // Check for urgent/important actions in the final recommendation
            if (!string.IsNullOrEmpty(assessment.FinalAction))
            {
                if (assessment.FinalAction.Contains("URGENT") || assessment.FinalAction.Contains("EMERGENCY"))
                {
                    findings.Add("⚠️ URGENT ACTION REQUIRED - Immediate medical attention needed");
                }
                else if (assessment.FinalAction.Contains("REFERRAL") || assessment.FinalAction.Contains("ENT"))
                {
                    findings.Add("📋 Medical referral recommended based on responses");
                }
                else if (assessment.FinalAction.Contains("CONTRAINDICATION") || assessment.FinalAction.Contains("absolute contraindication"))
                {
                    findings.Add("⚠️ Contraindications identified - Special considerations needed");
                }
                else if (assessment.FinalAction.Contains("cochlear implant"))
                {
                    findings.Add("⚠️ Cochlear implant detected - Traditional hearing aids contraindicated");
                }
                else
                {
                    findings.Add("✅ Assessment completed with specific recommendations");
                }
            }
            else
            {
                findings.Add("✅ Assessment completed successfully - Ready for next phase");
            }

            // Add completion timestamp
            if (assessment.CompletedDate.HasValue)
            {
                findings.Add($"Completed on: {assessment.CompletedDate.Value:yyyy-MM-dd HH:mm}");
            }

            return findings.ToArray();
        }

        private string GenerateFinalRecommendation(PatientAssessmentData assessment)
        {
            if (!string.IsNullOrEmpty(assessment.FinalAction))
            {
                // Extract key recommendation from the action text
                if (assessment.FinalAction.Contains("URGENT") || assessment.FinalAction.Contains("EMERGENCY"))
                {
                    return "URGENT: Immediate medical evaluation required. Do not proceed with hearing aid fitting until medical clearance is obtained.";
                }
                else if (assessment.FinalAction.Contains("ENT") || assessment.FinalAction.Contains("REFERRAL"))
                {
                    return "Medical referral recommended. Schedule ENT consultation before proceeding with hearing aid evaluation.";
                }
                else if (assessment.FinalAction.Contains("CONTRAINDICATION") || assessment.FinalAction.Contains("absolute contraindication"))
                {
                    return "CONTRAINDICATION IDENTIFIED: Traditional hearing aids are not suitable. Specialized consultation required.";
                }
                else if (assessment.FinalAction.Contains("cochlear implant"))
                {
                    return "COCHLEAR IMPLANT DETECTED: Patient has existing cochlear implant. Traditional hearing aid fitting contraindicated.";
                }
                else
                {
                    return "Assessment completed with specific clinical recommendations. Review action items before proceeding.";
                }
            }
            
            return "Assessment completed successfully. Ready to proceed with comprehensive hearing aid evaluation.";
        }

        private string GenerateNextSteps(PatientAssessmentData assessment)
        {
            if (!string.IsNullOrEmpty(assessment.FinalAction))
            {
                if (assessment.FinalAction.Contains("URGENT") || assessment.FinalAction.Contains("EMERGENCY"))
                {
                    return "1. URGENT medical referral (within 24-48 hours)\n2. Postpone hearing aid evaluation until medical clearance\n3. Document all findings for medical provider\n4. Follow up after medical treatment";
                }
                else if (assessment.FinalAction.Contains("ENT") || assessment.FinalAction.Contains("REFERRAL"))
                {
                    return "1. Schedule ENT consultation\n2. Obtain medical clearance\n3. Request detailed medical report\n4. Return for hearing aid evaluation after clearance";
                }
                else if (assessment.FinalAction.Contains("CONTRAINDICATION") || assessment.FinalAction.Contains("absolute contraindication"))
                {
                    return "1. Do not proceed with traditional hearing aid fitting\n2. Explore alternative communication solutions\n3. Consider specialized consultation\n4. Document contraindication reasons";
                }
                else if (assessment.FinalAction.Contains("cochlear implant"))
                {
                    return "1. Refer to cochlear implant audiologist for programming/maintenance\n2. Consider contralateral hearing aid only if appropriate\n3. Provide cochlear implant-specific resources\n4. Document existing implant details";
                }
            }
            
            return "1. Schedule comprehensive audiometric testing\n2. Discuss hearing aid options and technology levels\n3. Begin hearing aid fitting process\n4. Plan follow-up appointments";
        }
    }

    // Simplified data models for in-memory storage
    public class PatientAssessmentData
    {
        public int PatientId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? CompletedDate { get; set; }
        public string Status { get; set; } = "In Progress";
        public string CurrentNodeId { get; set; } = "root";
        public int TotalQuestions { get; set; }
        public string? FinalNodeId { get; set; }
        public string? FinalAction { get; set; }
        public List<AssessmentAnswerData> Answers { get; set; } = new();
    }

    public class AssessmentAnswerData
    {
        public string QuestionId { get; set; } = "";
        public string QuestionText { get; set; } = "";
        public string Answer { get; set; } = "";
        public DateTime Timestamp { get; set; }
        public int SequenceNumber { get; set; }
    }

    // Request/Response models
    public class DecisionTree
    {
        public Dictionary<string, DecisionNode> Nodes { get; set; } = new();
        public Dictionary<string, object> Modules { get; set; } = new();
    }

    public class DecisionNode
    {
        public string Module { get; set; } = "";
        public string Description { get; set; } = "";
        public string? Question { get; set; }
        public Dictionary<string, string>? Conditions { get; set; }
        public string? Action { get; set; }
        public string? Next { get; set; }
    }

    public class SaveAnswerRequest
    {
        public int PatientId { get; set; }
        public string QuestionId { get; set; } = "";
        public string QuestionText { get; set; } = "";
        public string Answer { get; set; } = "";
    }

    public class CompleteAssessmentRequest
    {
        public int PatientId { get; set; }
        public int TotalQuestions { get; set; }
        public string? FinalNodeId { get; set; }
        public string? FinalAction { get; set; }
    }
}