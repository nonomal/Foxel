namespace Foxel.Models.Response.Picture;

public record FaceResponse
{
    public int X { get; set; }
    public int Y { get; set; }
    public int W { get; set; }
    public int H { get; set; }
    public double FaceConfidence { get; set; }
    public string? PersonName { get; set; }
}