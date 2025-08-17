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

        public async Task<int> SaveAnswerAsync(AssessmentAnswerData answer)
        {
            // UPDATED: Added Commentary to the INSERT statement
            const string sql = @"
                INSERT INTO AssessmentAnswers (PatientAssessmentId, QuestionId, QuestionText, Answer, Commentary, Timestamp, SequenceNumber)
                OUTPUT INSERTED.Id
                VALUES (@PatientAssessmentId, @QuestionId, @QuestionText, @Answer, @Commentary, @Timestamp, @SequenceNumber)";

            using var connection = CreateConnection();
            
            var answerId = await connection.QuerySingleAsync<int>(sql, new
            {
                answer.PatientAssessmentId,
                answer.QuestionId,
                answer.QuestionText,
                answer.Answer,
                answer.Commentary, // NEW: Include commentary in the insert
                Timestamp = DateTime.UtcNow,
                answer.SequenceNumber
            });

            answer.Id = answerId;
            return answerId;
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
            // UPDATED: Added Commentary to the UPDATE statement
            const string sql = @"
                UPDATE AssessmentAnswers 
                SET QuestionText = @QuestionText,
                    Answer = @Answer,
                    Commentary = @Commentary,
                    Timestamp = @Timestamp
                WHERE Id = @Id";

            using var connection = CreateConnection();
            
            var rowsAffected = await connection.ExecuteAsync(sql, new
            {
                answer.Id,
                answer.QuestionText,
                answer.Answer,
                answer.Commentary, // NEW: Include commentary in the update
                Timestamp = DateTime.UtcNow
            });

            return rowsAffected > 0;
        }

        public async Task<bool> SaveMultipleAnswersAsync(List<AssessmentAnswerData> answers)
        {
            // UPDATED: Added Commentary to the bulk INSERT statement
            const string sql = @"
                INSERT INTO AssessmentAnswers (PatientAssessmentId, QuestionId, QuestionText, Answer, Commentary, Timestamp, SequenceNumber)
                VALUES (@PatientAssessmentId, @QuestionId, @QuestionText, @Answer, @Commentary, @Timestamp, @SequenceNumber)";

            using var connection = CreateConnection();
            using var transaction = connection.BeginTransaction();

            try
            {
                foreach (var answer in answers)
                {
                    answer.Timestamp = DateTime.UtcNow;
                }

                var rowsAffected = await connection.ExecuteAsync(sql, answers, transaction);
                transaction.Commit();
                
                return rowsAffected == answers.Count;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public async Task<bool> DeleteAssessmentAnswersAsync(int assessmentId)
        {
            const string sql = "DELETE FROM AssessmentAnswers WHERE PatientAssessmentId = @AssessmentId";

            using var connection = CreateConnection();
            
            var rowsAffected = await connection.ExecuteAsync(sql, new { AssessmentId = assessmentId });
            return rowsAffected > 0;
        }

        #endregion
    }
}