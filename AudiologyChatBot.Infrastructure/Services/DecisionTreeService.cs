using System.Text.Json;
using AudiologyChatBot.Core.Models;
using AudiologyChatBot.Core.Interfaces;

namespace AudiologyChatBot.Infrastructure.Services
{
    public class DecisionTreeService : IDecisionTreeService
    {
        private readonly string _decisionTreePath;
        private DecisionTree? _cachedDecisionTree;

        public DecisionTreeService(string decisionTreePath)
        {
            _decisionTreePath = decisionTreePath;
        }

        public async Task<DecisionTree?> LoadDecisionTreeAsync()
        {
            if (_cachedDecisionTree != null)
                return _cachedDecisionTree;

            if (!File.Exists(_decisionTreePath))
                return null;

            try
            {
                var jsonContent = await File.ReadAllTextAsync(_decisionTreePath);
                _cachedDecisionTree = JsonSerializer.Deserialize<DecisionTree>(jsonContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });
                return _cachedDecisionTree;
            }
            catch
            {
                return null;
            }
        }

        public async Task<DecisionNode?> GetNodeAsync(string nodeId)
        {
            var decisionTree = await LoadDecisionTreeAsync();
            
            if (decisionTree?.Nodes == null || !decisionTree.Nodes.ContainsKey(nodeId))
                return null;

            return decisionTree.Nodes[nodeId];
        }

        public async Task<bool> TestConnectionAsync()
        {
            try
            {
                var decisionTree = await LoadDecisionTreeAsync();
                return decisionTree != null;
            }
            catch
            {
                return false;
            }
        }
    }
}
