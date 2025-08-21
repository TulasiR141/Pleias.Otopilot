using AudiologyChatBot.Core.Models;

namespace AudiologyChatBot.Core.Interfaces
{
    public interface IDecisionTreeService
    {
        Task<DecisionTree?> LoadDecisionTreeAsync();
        Task<DecisionNode?> GetNodeAsync(string nodeId);
        Task<bool> TestConnectionAsync();
    }
}
