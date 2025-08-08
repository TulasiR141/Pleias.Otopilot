using Microsoft.AspNetCore.Mvc;
using ChatbotAPI.Services;
using ChatbotAPI.Models;

namespace ChatbotAPI.Controllers;

[ApiController]
[Route("api/chatbot")]
public class ChatbotController : ControllerBase {
    private readonly TreeService _treeService;

    public ChatbotController(TreeService treeService) {
        _treeService = treeService;
    }

    [HttpGet("start")]
    public IActionResult Start() {
        return Ok(_treeService.GetNode("q1"));
    }

    [HttpPost("next")]
    public IActionResult Next([FromBody] UserResponse response) {
        var next = _treeService.GetNextNode(response.QuestionId, response.Answer);
        return Ok(next);
    }
}
