using Foxel.Services.VectorDb;

namespace Foxel.Extensions;

public static class VectorDbExtensions
{
    /// <summary>
    /// 配置矢量数据库服务
    /// </summary>
    public static IServiceCollection AddVectorDbServices(this IServiceCollection services)
    {
        services.AddSingleton<VectorDbManager>();
        services.AddSingleton<IVectorDbService>(provider =>
            provider.GetRequiredService<VectorDbManager>());
        services.AddHostedService<VectorDbInitializer>();
        
        return services;
    }
}