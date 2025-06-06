using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Foxel.Models.DataBase;

public class Log : BaseModel
{
    [Required]
    public LogLevel Level { get; set; }

    [Required]
    [StringLength(4000)]
    public string Message { get; set; } = string.Empty;

    [StringLength(255)]
    public string? Category { get; set; }

    public int? EventId { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [Column(TypeName = "text")]
    public string? Exception { get; set; }

    [StringLength(255)]
    public string? RequestPath { get; set; }

    [StringLength(50)]
    public string? RequestMethod { get; set; }

    public int? StatusCode { get; set; }

    public int? UserId { get; set; }

    [ForeignKey("UserId")]
    public User? User { get; set; }

    [StringLength(50)]
    public string? IPAddress { get; set; }

    [StringLength(255)]
    public string? Application { get; set; } = "Foxel";

    [StringLength(255)]
    public string? MachineName { get; set; } = Environment.MachineName;

    [Column(TypeName = "text")]
    public string? Properties { get; set; } // JSON格式存储额外属性
}
