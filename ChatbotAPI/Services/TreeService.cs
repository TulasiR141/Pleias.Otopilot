using ChatbotAPI.Models;
using System.Text.Json;

namespace ChatbotAPI.Services;

public class TreeService {
    private Dictionary<string, TreeNode> _tree;

    public TreeService(IWebHostEnvironment env) {
        var path = Path.Combine(env.ContentRootPath, "decisionTree.json");
        var json = File.ReadAllText(path);
        var nodes = JsonSerializer.Deserialize<List<TreeNode>>(json);
        _tree = nodes.ToDictionary(n => n.Id);
    }

    public TreeNode GetNode(string nodeId) {
        return _tree.ContainsKey(nodeId) ? _tree[nodeId] : null;
    }

    public TreeNode GetNextNode(string currentId, string answer) {
        var current = GetNode(currentId);
        var nextId = current?.Answers.FirstOrDefault(a => a.Value == answer)?.Next;
        return nextId != null ? GetNode(nextId) : null;
    }
}
