
namespace Foxel.Extensions;

public static class ApiExtensions
{
    /// <summary>
    /// 配置应用程序 OpenAPI 文档
    /// </summary>
    public static IServiceCollection AddApplicationOpenApi(this IServiceCollection services)
    {
        services.AddOpenApi(opt => 
        { 
            opt.AddDocumentTransformer<BearerSecuritySchemeTransformer>(); 
        });
        
        return services;
    }

    /// <summary>
    /// 配置应用程序 CORS 策略
    /// </summary>
    public static IServiceCollection AddApplicationCors(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy(name: "MyAllowSpecificOrigins",
                policy => 
                { 
                    policy.WithOrigins()
                          .AllowAnyOrigin()
                          .AllowAnyHeader()
                          .AllowAnyMethod(); 
                });
        });
        
        return services;
    }
}