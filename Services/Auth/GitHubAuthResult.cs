namespace Foxel.Services.Auth;

public enum GitHubAuthResult
{
    Success,           // 授权成功并找到绑定用户
    UserNotBound,      // 授权成功但用户未绑定
    InvalidCode,       // 授权码无效
    TokenRequestFailed, // 获取访问令牌失败
    UserInfoFailed,    // 获取用户信息失败
    InvalidUserId      // 无法获取GitHub用户ID
}
