// IHearingAidFilterRepository.cs
using AudiologyChatBot.Core.Models;

namespace AudiologyChatBot.Core.Interfaces
{
    public interface IHearingAidFilterRepository
    {
        Task<List<HearingAidFilter>> GetFilteredHearingAidsAsync(List<DatabaseFilter> filters);
        Task<int> GetTotalCountAsync();
        Task<List<string>> GetDistinctValuesAsync(string fieldName);
        Task<bool> TestConnectionAsync();
    }
}