using System.ComponentModel.DataAnnotations;

namespace Foxel.Models.Request.User;

public class CreateUserRequest
{
    [Required(ErrorMessage = "用户名不能为空")]
    public string UserName { get; set; }
    
    [Required(ErrorMessage = "邮箱不能为空")]
    [EmailAddress(ErrorMessage = "邮箱格式不正确")]
    public string Email { get; set; }
    
    [Required(ErrorMessage = "密码不能为空")]
    [MinLength(6, ErrorMessage = "密码长度不能少于6个字符")]
    public string Password { get; set; }
    
    [Required(ErrorMessage = "角色不能为空")]
    public string Role { get; set; } = "User";
}

public class UpdateUserRequest
{
    [Required]
    public int Id { get; set; }
    
    [Required(ErrorMessage = "用户名不能为空")]
    public string UserName { get; set; }
    
    [Required(ErrorMessage = "邮箱不能为空")]
    [EmailAddress(ErrorMessage = "邮箱格式不正确")]
    public string Email { get; set; }
    
    [Required(ErrorMessage = "角色不能为空")]
    public string Role { get; set; }
}
