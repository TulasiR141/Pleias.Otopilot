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

        public DataImportController(IDataImportService dataImportService)
        {
            _dataImportService = dataImportService;
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadXml([FromForm] IFormFile xmlFile)
        {
            if (xmlFile == null || xmlFile.Length == 0)
                return BadRequest("No file uploaded.");

            using var stream = xmlFile.OpenReadStream();
            using var reader = new StreamReader(stream);
            var xmlContent = await reader.ReadToEndAsync();

            await _dataImportService.ImportXmlDataAsync(xmlContent);
            return Ok(new { message = "Data imported successfully" });
        }
    }
}
