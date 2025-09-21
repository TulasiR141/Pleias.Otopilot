using AudiologyChatBot.Core.Models;

namespace AudiologyChatBot.Core.Interfaces
{
    public interface IDataImportService
    {
        Task<ImportResultModel> ImportXmlDataAsync(string xmlContent);
    }
}
