using Foxel.Extensions;

var builder = WebApplication.CreateBuilder(args);

// 环境信息输出
Console.WriteLine($"当前环境: {builder.Environment.EnvironmentName}");

// 配置日志
builder.Logging.AddDatabaseLogging(config =>
{
    config.MinLevel = LogLevel.Information; 
    config.Enabled = true;
});

// 配置所有应用程序服务
builder.Services.AddApplicationServices(builder.Configuration);

var app = builder.Build();

// 初始化数据库
await app.InitializeDatabaseAsync();

// 配置中间件管道
app.ConfigureMiddleware();

app.Run();