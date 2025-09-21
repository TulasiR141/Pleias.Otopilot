using Microsoft.AspNetCore.Mvc;
using AudiologyChatBot.Core.Interfaces;
using AudiologyChatBot.Core.Models;

namespace ChatbotAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DataImportController : ControllerBase
    {
        private readonly IDataImportService _dataImportService;
        private readonly ILogger<DataImportController> _logger;

        public DataImportController(IDataImportService dataImportService, ILogger<DataImportController> logger)
        {
            _dataImportService = dataImportService;
            _logger = logger;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadXml([FromForm] IFormFile xmlFile)
        {
            try
            {
                // Basic validation
                if (xmlFile == null || xmlFile.Length == 0)
                {
                    _logger.LogWarning("Upload attempt with no file provided");
                    return BadRequest("No file uploaded.");
                }

                // File size validation (50MB limit)
                const long maxFileSize = 50 * 1024 * 1024; // 50MB
                if (xmlFile.Length > maxFileSize)
                {
                    _logger.LogWarning("Upload attempt with file size {FileSize} bytes exceeding limit", xmlFile.Length);
                    return BadRequest("File size exceeds the 50MB limit.");
                }

                // File extension validation
                if (!xmlFile.FileName.ToLowerInvariant().EndsWith(".xml"))
                {
                    _logger.LogWarning("Upload attempt with invalid file type: {FileName}", xmlFile.FileName);
                    return BadRequest("Only XML files are allowed.");
                }

                _logger.LogInformation("Starting XML import for file: {FileName}, Size: {FileSize} bytes",
                    xmlFile.FileName, xmlFile.Length);

                // Read file content
                using var stream = xmlFile.OpenReadStream();
                using var reader = new StreamReader(stream);
                var xmlContent = await reader.ReadToEndAsync();

                // Basic XML validation
                if (string.IsNullOrWhiteSpace(xmlContent))
                {
                    _logger.LogWarning("Upload attempt with empty XML content");
                    return BadRequest("XML file appears to be empty.");
                }

                // Attempt to import data and get results
                var importResult = await _dataImportService.ImportXmlDataAsync(xmlContent);

                _logger.LogInformation("XML import completed successfully. Results: {ImportResult}",
                    System.Text.Json.JsonSerializer.Serialize(importResult));

                return Ok(new
                {
                    newPatients = importResult.NewPatients,
                    failedRecords = importResult.FailedRecords,
                    updatedPatients = importResult.UpdatedPatients,
                    totalRecords = importResult.TotalRecords,
                    totalActions = importResult.TotalActions,
                    processingTime = importResult.ProcessingTimeMs,
                    fileName = xmlFile.FileName,
                    fileSize = xmlFile.Length
                });
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Validation error during XML import");
                return BadRequest($"Validation error: {ex.Message}");
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "Invalid operation during XML import");
                return BadRequest($"Invalid operation: {ex.Message}");
            }
            catch (System.Xml.XmlException ex)
            {
                _logger.LogError(ex, "XML parsing error during import");
                return BadRequest($"XML parsing error: {ex.Message}. Please ensure your XML file is properly formatted.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during XML import");
                return StatusCode(500, $"An unexpected error occurred during import: {ex.Message}");
            }
        }
    }
}