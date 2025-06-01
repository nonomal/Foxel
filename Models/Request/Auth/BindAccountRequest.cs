using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.Request.Auth;

public class BindAccountRequest
{
    [Required(ErrorMessage = "邮箱不能为空")]
    [EmailAddress(ErrorMessage = "邮箱格式不正确")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "密码不能为空")]
    [MinLength(6, ErrorMessage = "密码长度不能少于6位")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "绑定类型不能为空")] public BindType BindType { get; set; }

    [Required(ErrorMessage = "第三方用户ID不能为空")]
    public string ThirdPartyUserId { get; set; } = string.Empty;
}

public enum BindType
{
    GitHub,
    LinuxDo
}
