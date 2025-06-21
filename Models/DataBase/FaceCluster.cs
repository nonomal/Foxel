using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.DataBase;

public class FaceCluster : BaseModel
{
    [StringLength(255)]
    public string Name { get; set; } = string.Empty;
    
    [StringLength(1024)]
    public string? Description { get; set; }
    
    /// <summary>
    /// 用户设置的人物名称
    /// </summary>
    [StringLength(255)]
    public string? PersonName { get; set; }
    
    /// <summary>
    /// 最后更新时间
    /// </summary>
    public DateTime LastUpdatedAt { get; set; }
    
    public ICollection<Face>? Faces { get; set; }
}