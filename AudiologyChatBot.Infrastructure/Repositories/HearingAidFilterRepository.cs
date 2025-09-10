// HearingAidFilterRepository.cs
using System.Data;
using System.Data.SqlClient;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using Dapper;
using AudiologyChatBot.Core.Interfaces;
using AudiologyChatBot.Core.Models;

namespace AudiologyChatBot.Infrastructure.Repositories
{
    public class HearingAidFilterRepository : IHearingAidFilterRepository
    {
        private readonly DatabaseSettings _databaseSettings;
        private readonly ILogger<HearingAidFilterRepository> _logger;

        public HearingAidFilterRepository(IOptions<DatabaseSettings> databaseSettings, ILogger<HearingAidFilterRepository> logger)
        {
            _databaseSettings = databaseSettings.Value;
            _logger = logger;
        }

        private IDbConnection CreateConnection()
        {
            return new SqlConnection(_databaseSettings.ConnectionString);
        }

        public async Task<List<HearingAidFilter>> GetFilteredHearingAidsAsync(List<DatabaseFilter> filters)
        {
            try
            {
                var (sql, parameters) = BuildFilterQuery(filters);

                _logger.LogInformation("Executing hearing aid filter query: {Sql}", sql);
                _logger.LogInformation("With parameters: {@Parameters}", parameters);

                using var connection = CreateConnection();
                var results = await connection.QueryAsync<HearingAidFilter>(sql, parameters);

                _logger.LogInformation("Found {Count} hearing aids matching filters", results.Count());

                return results.ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error filtering hearing aids with {FilterCount} filters", filters.Count);
                throw;
            }
        }

        public async Task<int> GetTotalCountAsync()
        {
            const string sql = "SELECT COUNT(*) FROM HEARING_AID_FILTERS";

            using var connection = CreateConnection();
            return await connection.QuerySingleAsync<int>(sql);
        }

        public async Task<List<string>> GetDistinctValuesAsync(string fieldName)
        {
            // Sanitize field name to prevent SQL injection
            var allowedFields = new[]
            {
                "hearing_aid_style", "technology_level", "max_gain_hearing_loss_compatibility",
                "battery_size", "max_output_db_spl", "tinnitus_management_features",
                "cochlear_implant_compatible", "style_form_factor", "brand", "model"
            };

            if (!allowedFields.Contains(fieldName.ToLower()))
            {
                throw new ArgumentException($"Field '{fieldName}' is not allowed for distinct value queries");
            }

            var sql = $"SELECT DISTINCT [{fieldName}] FROM HEARING_AID_FILTERS WHERE [{fieldName}] IS NOT NULL ORDER BY [{fieldName}]";

            using var connection = CreateConnection();
            var results = await connection.QueryAsync<string>(sql);
            return results.ToList();
        }

        public async Task<bool> TestConnectionAsync()
        {
            try
            {
                using var connection = CreateConnection();
                await connection.QuerySingleAsync<int>("SELECT 1");
                return true;
            }
            catch
            {
                return false;
            }
        }

        private (string sql, DynamicParameters parameters) BuildFilterQuery(List<DatabaseFilter> filters)
        {
            var sql = new StringBuilder(@"SELECT 
                ID as Id,
                HEARING_AID_GUID as HearingAidGuid,
                HEARING_AID_NAME as HearingAidName,
                MANUFACTURER as Manufacturer,
                DESCRIPTION as Description,
                DESCRIPTION_PRODUCT_LINE as DescriptionProductLine,
                MAX_OUTPUT_DB_SPL as MaxOutputDbSpl,
                COCHLEAR_IMPLANT_COMPATIBLE as CochlearImplantCompatible,
                TINNITUS_MANAGEMENT_FEATURES as TinnitusManagementFeatures,
                BATTERY_SIZE as BatterySize,
                HEARING_AID_STYLE as HearingAidStyle,
                MAX_GAIN_HEARING_LOSS_COMPATIBILITY as MaxGainHearingLossCompatibility,
                STYLE_FORM_FACTOR as StyleFormFactor,
                SOURCE_FILES_LOADED as SourceFilesLoaded,
                SOURCE_FILES as SourceFiles,
                CREATED_DATE as CreatedDate,
                CREATED_BY as CreatedBy,
                UPDATED_DATE as UpdatedDate,
                UPDATED_BY as UpdatedBy
                FROM HEARING_AID_FILTERS");
            var parameters = new DynamicParameters();
            var whereConditions = new List<string>();

            if (filters?.Count > 0)
            {
                for (int i = 0; i < filters.Count; i++)
                {
                    var filter = filters[i];
                    var condition = BuildWhereCondition(filter, i, parameters);
                    if (!string.IsNullOrEmpty(condition))
                    {
                        whereConditions.Add(condition);
                    }
                }

                if (whereConditions.Count > 0)
                {
                    sql.Append(" WHERE ");
                    sql.Append(string.Join(" AND ", whereConditions));
                }
            }

            return (sql.ToString(), parameters);
        }

        private string BuildWhereCondition(DatabaseFilter filter, int index, DynamicParameters parameters)
        {
            if (string.IsNullOrEmpty(filter.Field) || filter.Values?.Count == 0)
            {
                return "";
            }

            // Sanitize field name
            var sanitizedField = $"[{filter.Field}]";
            var parameterPrefix = $"param_{index}";

            return filter.Operator.ToLower() switch
            {
                "equals" => BuildEqualsCondition(sanitizedField, filter.Values, parameterPrefix, parameters),
                "not_equals" => BuildNotEqualsCondition(sanitizedField, filter.Values, parameterPrefix, parameters),
                "in" => BuildInCondition(sanitizedField, filter.Values, parameterPrefix, parameters),
                "not_in" => BuildNotInCondition(sanitizedField, filter.Values, parameterPrefix, parameters),
                "contains" => BuildContainsCondition(sanitizedField, filter.Values, parameterPrefix, parameters),
                "not_contains" => BuildNotContainsCondition(sanitizedField, filter.Values, parameterPrefix, parameters),
                "greater_than" => BuildComparisonCondition(sanitizedField, filter.Values[0], ">", parameterPrefix, parameters),
                "greater_than_or_equal" => BuildComparisonCondition(sanitizedField, filter.Values[0], ">=", parameterPrefix, parameters),
                "less_than" => BuildComparisonCondition(sanitizedField, filter.Values[0], "<", parameterPrefix, parameters),
                "less_than_or_equal" => BuildComparisonCondition(sanitizedField, filter.Values[0], "<=", parameterPrefix, parameters),
                _ => ""
            };
        }

        private string BuildEqualsCondition(string field, List<string> values, string parameterPrefix, DynamicParameters parameters)
        {
            if (values.Count == 1)
            {
                parameters.Add($"{parameterPrefix}_0", values[0]);
                return $"{field} = @{parameterPrefix}_0";
            }
            else
            {
                return BuildInCondition(field, values, parameterPrefix, parameters);
            }
        }

        private string BuildNotEqualsCondition(string field, List<string> values, string parameterPrefix, DynamicParameters parameters)
        {
            if (values.Count == 1)
            {
                parameters.Add($"{parameterPrefix}_0", values[0]);
                return $"({field} != @{parameterPrefix}_0 OR {field} IS NULL)";
            }
            else
            {
                return BuildNotInCondition(field, values, parameterPrefix, parameters);
            }
        }

        private string BuildInCondition(string field, List<string> values, string parameterPrefix, DynamicParameters parameters)
        {
            var parameterNames = new List<string>();
            for (int i = 0; i < values.Count; i++)
            {
                var paramName = $"{parameterPrefix}_{i}";
                parameters.Add(paramName, values[i]);
                parameterNames.Add($"@{paramName}");
            }
            return $"{field} IN ({string.Join(", ", parameterNames)})";
        }

        private string BuildNotInCondition(string field, List<string> values, string parameterPrefix, DynamicParameters parameters)
        {
            var parameterNames = new List<string>();
            for (int i = 0; i < values.Count; i++)
            {
                var paramName = $"{parameterPrefix}_{i}";
                parameters.Add(paramName, values[i]);
                parameterNames.Add($"@{paramName}");
            }
            return $"({field} NOT IN ({string.Join(", ", parameterNames)}) OR {field} IS NULL)";
        }

        private string BuildContainsCondition(string field, List<string> values, string parameterPrefix, DynamicParameters parameters)
        {
            var conditions = new List<string>();
            for (int i = 0; i < values.Count; i++)
            {
                var paramName = $"{parameterPrefix}_{i}";
                parameters.Add(paramName, $"%{values[i]}%");
                conditions.Add($"{field} LIKE @{paramName}");
            }
            return $"({string.Join(" OR ", conditions)})";
        }

        private string BuildNotContainsCondition(string field, List<string> values, string parameterPrefix, DynamicParameters parameters)
        {
            var conditions = new List<string>();
            for (int i = 0; i < values.Count; i++)
            {
                var paramName = $"{parameterPrefix}_{i}";
                parameters.Add(paramName, $"%{values[i]}%");
                conditions.Add($"{field} NOT LIKE @{paramName}");
            }
            return $"({string.Join(" AND ", conditions)} OR {field} IS NULL)";
        }

        private string BuildComparisonCondition(string field, string value, string operator_, string parameterPrefix, DynamicParameters parameters)
        {
            parameters.Add($"{parameterPrefix}_0", value);
            return $"{field} {operator_} @{parameterPrefix}_0";
        }
    }
}