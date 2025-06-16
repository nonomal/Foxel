using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Foxel.Models.DataBase;

public class Face : BaseModel
{
    public float[]? Embedding { get; set; }

    public int X { get; set; }
    public int Y { get; set; }
    public int W { get; set; }
    public int H { get; set; }

    [Range(0.0, 1.0)]
    public double FaceConfidence { get; set; }

    public int PictureId { get; set; }

    [ForeignKey("PictureId")]
    public Picture Picture { get; set; } = null!;
    public int? ClusterId { get; set; }

    [ForeignKey("ClusterId")]
    public FaceCluster? Cluster { get; set; }
}
