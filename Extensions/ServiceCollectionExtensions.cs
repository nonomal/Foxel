namespace Foxel.Extensions;

/// <summary>
/// 应用程序服务集合扩展方法的主入口
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// 配置所有应用程序服务
    /// </summary>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
    {
        // 基础服务
        services.AddApplicationServices();
        
        // 数据库相关
        services.AddApplicationDbContext(configuration);
        
        // API相关
        services.AddApplicationOpenApi();
        services.AddApplicationCors();
        
        // 业务服务
        services.AddCoreServices();
        
        // 身份验证和授权
        services.AddApplicationAuthentication();
        services.AddApplicationAuthorization();
        
        // 矢量数据库
        services.AddVectorDbServices();
        
        // 转发头配置
        services.AddForwardedHeaders();
        
        return services;
    }
}