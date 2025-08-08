namespace ChatbotAPI.Models;

public class TreeNode {
    public string Id { get; set; }
    public string Question { get; set; }
    public List<TreeAnswer> Answers { get; set; }
}

public class TreeAnswer {
    public string Value { get; set; }
    public string Next { get; set; }
}

public class UserResponse {
    public string QuestionId { get; set; }
    public string Answer { get; set; }
}
