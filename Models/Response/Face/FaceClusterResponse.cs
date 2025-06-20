namespace Foxel.Models.Response.Face;

public record FaceClusterResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? PersonName { get; set; }
    public string? Description { get; set; }
    public int FaceCount { get; set; }
    public string? ThumbnailPath { get; set; }
    public DateTime LastUpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}