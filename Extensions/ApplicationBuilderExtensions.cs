using Microsoft.Extensions.FileProviders;
using Scalar.AspNetCore;

namespace Foxel.Extensions;

public static class ApplicationBuilderExtensions
{
    /// <summary>
    /// 配置应用程序静态文件服务
    /// </summary>
    /// <param name="app">Web应用程序实例</param>
    public static void UseApplicationStaticFiles(this WebApplication app)
    {
        var uploadsPath = Path.Combine(Directory.GetCurrentDirectory(), "Uploads");
        EnsureDirectoryExists(uploadsPath);

        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(uploadsPath),
            RequestPath = "/Uploads"
        });
    }

    /// <summary>
    /// 配置应用程序 OpenAPI 文档和接口
    /// </summary>
    /// <param name="app">Web应用程序实例</param>
    public static void UseApplicationOpenApi(this WebApplication app)
    {
        app.MapOpenApi();
        app.MapScalarApiReference();
    }

    /// <summary>
    /// 确保目录存在，如果不存在则创建
    /// </summary>
    /// <param name="path">目录路径</param>
    private static void EnsureDirectoryExists(string path)
    {
        if (!Directory.Exists(path))
        {
            Directory.CreateDirectory(path);
        }
    }
}