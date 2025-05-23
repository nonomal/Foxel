namespace Foxel.Models.Response.Auth;

public record UserProfile
{
    public int Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? RoleName { get; set; }
}

public record AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public UserProfile User { get; set; } = new();
}
