using Foxel.Models.DataBase;

namespace Foxel.Models.Response.Picture;

public record PictureResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Path { get; set; }
    public string? ThumbnailPath { get; set; }
    public string? OriginalPath { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public List<string>? Tags { get; set; }
    public DateTime? TakenAt { get; set; }
    public ExifInfo? ExifInfo { get; set; }
    public int? UserId { get; set; }
    private string? _username;
    public string? Username
    {
        get => string.IsNullOrEmpty(_username) ? "匿名" : _username;
        set => _username = value;
    }
    public bool IsFavorited { get; set; }
    public int FavoriteCount { get; set; }
    public int? AlbumId { get; set; }
    public string? AlbumName { get; set; }
    public PermissionType Permission { get; set; } = PermissionType.Public;
    public string? StorageModeName { get; set; }
    
}
