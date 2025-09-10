using System.Data;
using System.Data.SqlClient;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using Dapper;
using AudiologyChatBot.Core.Interfaces;
using AudiologyChatBot.Core.Models;

namespace AudiologyChatBot.Infrastructure.Repositories
{
    public class AssessmentRepository : IAssessmentRepository
    {
        private readonly DatabaseSettings _databaseSettings;
        private readonly ILogger<AssessmentRepository> _logger;

        public AssessmentRepository(IOptions<DatabaseSettings> databaseSettings, ILogger<AssessmentRepository> logger)
        {
            _databaseSettings = databaseSettings.Value;
            _logger = logger;
        }

        private IDbConnection CreateConnection()
        {
            return new SqlConnection(_databaseSettings.ConnectionString);
        }

        #region Patient Assessment Operations

        public async Task<PatientAssessmentData?> GetPatientAssessmentAsync(int patientId)
        {
            const string sql = @"
                SELECT TOP 1 * FROM PatientAssessments 
                WHERE PatientId = @PatientId AND Status = 'Completed'
                ORDER BY CompletedDate DESC";

            const string answersSql = @"
                SELECT * FROM AssessmentAnswers 
                WHERE PatientAssessmentId = @AssessmentId
                ORDER BY SequenceNumber";

            using var connection = CreateConnection();

            var assessment = await connection.QueryFirstOrDefaultAsync<PatientAssessmentData>(sql, new { PatientId = patientId });

            if (assessment != null)
            {
                var answers = await connection.QueryAsync<AssessmentAnswerData>(answersSql, new { AssessmentId = assessment.Id });
                assessment.Answers = answers.ToList();
            }

            return assessment;
        }

        public async Task<PatientAssessmentData?> GetActiveAssessmentAsync(int patientId)
        {
            const string sql = @"
                SELECT * FROM PatientAssessments 
                WHERE PatientId = @PatientId AND Status = 'In Progress'";

            const string answersSql = @"
                SELECT * FROM AssessmentAnswers 
                WHERE PatientAssessmentId = @AssessmentId
                ORDER BY SequenceNumber";

            using var connection = CreateConnection();

            var assessment = await connection.QueryFirstOrDefaultAsync<PatientAssessmentData>(sql, new { PatientId = patientId });

            if (assessment != null)
            {
                var answers = await connection.QueryAsync<AssessmentAnswerData>(answersSql, new { AssessmentId = assessment.Id });
                assessment.Answers = answers.ToList();
            }

            return assessment;
        }

        public async Task<PatientAssessmentData?> GetAssessmentByIdAsync(int assessmentId)
        {
            const string sql = @"
                SELECT * FROM PatientAssessments 
                WHERE Id = @AssessmentId";

            const string answersSql = @"
                SELECT * FROM AssessmentAnswers 
                WHERE PatientAssessmentId = @AssessmentId
                ORDER BY SequenceNumber";

            using var connection = CreateConnection();

            var assessment = await connection.QueryFirstOrDefaultAsync<PatientAssessmentData>(sql, new { AssessmentId = assessmentId });

            if (assessment != null)
            {
                var answers = await connection.QueryAsync<AssessmentAnswerData>(answersSql, new { AssessmentId = assessmentId });
                assessment.Answers = answers.ToList();
            }

            return assessment;
        }

        public async Task<int> CreateAssessmentAsync(PatientAssessmentData assessment)
        {
            const string sql = @"
                INSERT INTO PatientAssessments (PatientId, Status, StartDate, CurrentNodeId)
                OUTPUT INSERTED.Id
                VALUES (@PatientId, @Status, @StartDate, @CurrentNodeId)";

            using var connection = CreateConnection();

            var assessmentId = await connection.QuerySingleAsync<int>(sql, new
            {
                assessment.PatientId,
                assessment.Status,
                StartDate = DateTime.UtcNow,
                assessment.CurrentNodeId
            });

            assessment.Id = assessmentId;
            return assessmentId;
        }

        public async Task<bool> UpdateAssessmentAsync(PatientAssessmentData assessment)
        {
            const string sql = @"
                UPDATE PatientAssessments 
                SET Status = @Status,
                    CompletedDate = @CompletedDate,
                    TotalQuestions = @TotalQuestions,
                    FinalNodeId = @FinalNodeId,
                    FinalAction = @FinalAction,
                    CurrentNodeId = @CurrentNodeId
                WHERE Id = @Id";

            using var connection = CreateConnection();

            var rowsAffected = await connection.ExecuteAsync(sql, assessment);
            return rowsAffected > 0;
        }

        public async Task<bool> DeleteAssessmentAsync(int assessmentId)
        {
            const string deleteAnswersSql = "DELETE FROM AssessmentAnswers WHERE PatientAssessmentId = @AssessmentId";
            const string deleteAssessmentSql = "DELETE FROM PatientAssessments WHERE Id = @AssessmentId";

            using var connection = CreateConnection();
            using var transaction = connection.BeginTransaction();

            try
            {
                await connection.ExecuteAsync(deleteAnswersSql, new { AssessmentId = assessmentId }, transaction);
                var rowsAffected = await connection.ExecuteAsync(deleteAssessmentSql, new { AssessmentId = assessmentId }, transaction);

                transaction.Commit();
                return rowsAffected > 0;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public async Task<List<PatientAssessmentData>> GetPatientAssessmentHistoryAsync(int patientId)
        {
            const string sql = @"
                SELECT * FROM PatientAssessments 
                WHERE PatientId = @PatientId
                ORDER BY StartDate DESC";

            using var connection = CreateConnection();

            var assessments = await connection.QueryAsync<PatientAssessmentData>(sql, new { PatientId = patientId });

            // Load answers for each assessment
            foreach (var assessment in assessments)
            {
                const string answersSql = @"
                    SELECT * FROM AssessmentAnswers 
                    WHERE PatientAssessmentId = @AssessmentId
                    ORDER BY SequenceNumber";

                var answers = await connection.QueryAsync<AssessmentAnswerData>(answersSql, new { AssessmentId = assessment.Id });
                assessment.Answers = answers.ToList();
            }

            return assessments.ToList();
        }

        #endregion

        #region Assessment Answer Operations

        // UPDATED: SaveAnswerAsync to include NodeType and enhanced error handling
        public async Task<int> SaveAnswerAsync(AssessmentAnswerData answer)
        {
            try
            {
                const string sql = @"
                    INSERT INTO AssessmentAnswers (PatientAssessmentId, QuestionId, QuestionText, Answer, Commentary, DatabaseFilters, NodeType, Timestamp, SequenceNumber)
                    OUTPUT INSERTED.Id
                    VALUES (@PatientAssessmentId, @QuestionId, @QuestionText, @Answer, @Commentary, @DatabaseFilters, @NodeType, @Timestamp, @SequenceNumber)";

                using var connection = CreateConnection();

                _logger.LogInformation("Saving answer: PatientAssessmentId={PatientAssessmentId}, QuestionId={QuestionId}, Answer={Answer}, NodeType={NodeType}",
                    answer.PatientAssessmentId, answer.QuestionId, answer.Answer, answer.NodeType);

                var answerId = await connection.QuerySingleAsync<int>(sql, new
                {
                    answer.PatientAssessmentId,
                    answer.QuestionId,
                    answer.QuestionText,
                    answer.Answer,
                    answer.Commentary,
                    answer.DatabaseFilters,
                    answer.NodeType,
                    Timestamp = DateTime.UtcNow,
                    answer.SequenceNumber
                });

                answer.Id = answerId;
                _logger.LogInformation("Successfully saved answer with ID: {AnswerId}", answerId);
                return answerId;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving answer for PatientAssessmentId={PatientAssessmentId}, QuestionId={QuestionId}",
                    answer.PatientAssessmentId, answer.QuestionId);
                throw;
            }
        }

        public async Task<List<AssessmentAnswerData>> GetAssessmentAnswersAsync(int assessmentId)
        {
            const string sql = @"
                SELECT * FROM AssessmentAnswers 
                WHERE PatientAssessmentId = @AssessmentId
                ORDER BY SequenceNumber";

            using var connection = CreateConnection();

            var answers = await connection.QueryAsync<AssessmentAnswerData>(sql, new { AssessmentId = assessmentId });
            return answers.ToList();
        }

        public async Task<AssessmentAnswerData?> GetAnswerByQuestionAsync(int assessmentId, string questionId)
        {
            const string sql = @"
                SELECT * FROM AssessmentAnswers 
                WHERE PatientAssessmentId = @AssessmentId AND QuestionId = @QuestionId";

            using var connection = CreateConnection();

            return await connection.QueryFirstOrDefaultAsync<AssessmentAnswerData>(sql,
                new { AssessmentId = assessmentId, QuestionId = questionId });
        }

        public async Task<bool> UpdateAnswerAsync(AssessmentAnswerData answer)
        {
            // UPDATED: Include NodeType and DatabaseFilters in the UPDATE statement
            const string sql = @"
                UPDATE AssessmentAnswers 
                SET QuestionText = @QuestionText,
                    Answer = @Answer,
                    Commentary = @Commentary,
                    DatabaseFilters = @DatabaseFilters,
                    NodeType = @NodeType,
                    Timestamp = @Timestamp
                WHERE Id = @Id";

            using var connection = CreateConnection();

            var rowsAffected = await connection.ExecuteAsync(sql, new
            {
                answer.Id,
                answer.QuestionText,
                answer.Answer,
                answer.Commentary,
                answer.DatabaseFilters,
                answer.NodeType,
                Timestamp = DateTime.UtcNow
            });

            return rowsAffected > 0;
        }

        // Method to get all database filters for an assessment
        public async Task<List<DatabaseFilter>> GetAssessmentFiltersAsync(int assessmentId)
        {
            const string sql = @"
                SELECT DatabaseFilters 
                FROM AssessmentAnswers 
                WHERE PatientAssessmentId = @AssessmentId 
                  AND DatabaseFilters IS NOT NULL
                ORDER BY SequenceNumber";

            using var connection = CreateConnection();

            var filterJsonList = await connection.QueryAsync<string>(sql, new { AssessmentId = assessmentId });
            var allFilters = new List<DatabaseFilter>();

            foreach (var filterJson in filterJsonList)
            {
                try
                {
                    var filtersContainer = System.Text.Json.JsonSerializer.Deserialize<DatabaseFilters>(filterJson);
                    if (filtersContainer?.Filters != null)
                    {
                        allFilters.AddRange(filtersContainer.Filters);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to deserialize database filters from assessment {AssessmentId}", assessmentId);
                }
            }

            return allFilters;
        }

        public async Task<bool> DeleteAssessmentAnswersAsync(int assessmentId)
        {
            const string sql = "DELETE FROM AssessmentAnswers WHERE PatientAssessmentId = @AssessmentId";

            using var connection = CreateConnection();

            var rowsAffected = await connection.ExecuteAsync(sql, new { AssessmentId = assessmentId });
            return rowsAffected > 0;
        }

        // ENHANCED: Delete answer by patient and question ID with better error handling
        public async Task<bool> DeleteAnswerAsync(int patientId, string questionId)
        {
            try
            {
                const string sql = @"
                    DELETE FROM AssessmentAnswers 
                    WHERE PatientAssessmentId IN (
                        SELECT Id FROM PatientAssessments WHERE PatientId = @PatientId
                    ) AND QuestionId = @QuestionId";

                using var connection = CreateConnection();

                _logger.LogInformation("Attempting to delete answer for patient {PatientId}, question {QuestionId}", patientId, questionId);

                var rowsAffected = await connection.ExecuteAsync(sql, new { PatientId = patientId, QuestionId = questionId });

                if (rowsAffected > 0)
                {
                    _logger.LogInformation("Successfully deleted {RowsAffected} answer(s) for patient {PatientId}, question {QuestionId}",
                        rowsAffected, patientId, questionId);
                }
                else
                {
                    _logger.LogWarning("No answers found to delete for patient {PatientId}, question {QuestionId}", patientId, questionId);
                }

                return rowsAffected > 0;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting answer for patient {PatientId}, question {QuestionId}", patientId, questionId);
                throw;
            }
        }

        #endregion
    }
}