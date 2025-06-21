using Microsoft.AspNetCore.HttpOverrides;

namespace Foxel.Extensions;

public static class HostingExtensions
{
    /// <summary>
    /// 配置应用程序基础服务
    /// </summary>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddMemoryCache();
        services.AddControllers();
        services.AddHttpClient();
        services.AddHttpContextAccessor();
        
        return services;
    }

    /// <summary>
    /// 配置转发头
    /// </summary>
    public static IServiceCollection AddForwardedHeaders(this IServiceCollection services)
    {
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.KnownNetworks.Clear();
            options.KnownProxies.Clear();
        });
        
        return services;
    }

    /// <summary>
    /// 配置应用程序中间件
    /// </summary>
    public static WebApplication ConfigureMiddleware(this WebApplication app)
    {
        app.UseForwardedHeaders();
        app.UseApplicationStaticFiles();
        
        if (!app.Environment.IsDevelopment())
        {
            app.UseExceptionHandler("/Error", createScopeForErrors: true);
            app.UseHsts();
        }

        app.UseApplicationOpenApi();
        app.UseCors("MyAllowSpecificOrigins");
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapControllers();
        app.UseHttpsRedirection();
        
        return app;
    }
}