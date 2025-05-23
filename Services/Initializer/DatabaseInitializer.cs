using Foxel.Models.DataBase;
using Foxel.Services.Configuration;
using Microsoft.EntityFrameworkCore;

namespace Foxel.Services.Initializer;

public class DatabaseInitializer(
    IDbContextFactory<MyDbContext> contextFactory,
    IConfigService configService,
    ILogger<DatabaseInitializer> logger)
    : IDatabaseInitializer
{
    private const string InitializationFlag = "System:InitializationCompleted";

    public async Task InitializeAsync()
    {
        logger.LogInformation("开始检查数据库初始化状态...");

        // 执行数据库迁移
        await MigrateDatabaseAsync();

        // 检查是否已经完成初始化
        if (await configService.ExistsAsync(InitializationFlag) &&
             configService[InitializationFlag] == "true")
        {
            logger.LogInformation("数据库已完成初始化，跳过初始化步骤");
            return;
        }

        logger.LogInformation("开始初始化数据库配置...");

        await using var context = await contextFactory.CreateDbContextAsync();

        // 确保数据库已创建
        await context.Database.EnsureCreatedAsync();

        // 初始化JWT配置
        await EnsureConfigExistsAsync("Jwt:SecretKey", "ChAtPiCdEfAuLtSeCrEtKeY2023_Extended_Secure_Key");
        await EnsureConfigExistsAsync("Jwt:Issuer", "Foxel");
        await EnsureConfigExistsAsync("Jwt:Audience", "FoxelUsers");

        // 初始化GitHub认证配置
        await EnsureConfigExistsAsync("Authentication:GitHubClientId", "placeholder_replace_with_actual_github_client_id");
        await EnsureConfigExistsAsync("Authentication:GitHubClientSecret", "placeholder_replace_with_actual_github_client_secret");
        await EnsureConfigExistsAsync("Authentication:GitHubCallbackUrl", "");
        
        // 初始化AI相关配置
        await EnsureConfigExistsAsync("AI:ApiEndpoint", "");
        await EnsureConfigExistsAsync("AI:ApiKey", "");
        await EnsureConfigExistsAsync("AI:Model", "");
        await EnsureConfigExistsAsync("AI:EmbeddingModel", "");
        // 初始化存储配置
        await EnsureConfigExistsAsync("Storage:TelegramStorageBotToken", "");
        await EnsureConfigExistsAsync("Storage:TelegramStorageChatId", "");
        await EnsureConfigExistsAsync("Storage:DefaultStorage", "Local");
        // 初始化其他配置
        await EnsureConfigExistsAsync("AppSettings:ServerUrl", "");

        // 初始化管理员角色和用户
        await InitializeAdminRoleAndUserAsync();

        // 标记初始化已完成
        await configService.SetConfigAsync(InitializationFlag, "true", "系统初始化完成标志");

        logger.LogInformation("数据库配置初始化完成");
    }

    private async Task MigrateDatabaseAsync()
    {
        logger.LogInformation("开始执行数据库迁移...");
        try
        {
            await using var context = await contextFactory.CreateDbContextAsync();
            await context.Database.MigrateAsync();
            logger.LogInformation("数据库迁移完成");
        }
        catch (Exception ex)
        {
            logger.LogWarning("数据库迁移过程中出现警告或错误: {Error}", ex.Message);
            logger.LogInformation("尝试确保数据库已创建...");
            await using var context = await contextFactory.CreateDbContextAsync();
            await context.Database.EnsureCreatedAsync();
        }
    }

    private async Task EnsureConfigExistsAsync(string key, string value)
    {
        if (!await configService.ExistsAsync(key))
        {
            logger.LogInformation("创建配置项: {Key}", key);
            await configService.SetConfigAsync(key, value, $"自动创建的{key}配置");
        }
    }

    private async Task InitializeAdminRoleAndUserAsync()
    {
        await using var context = await contextFactory.CreateDbContextAsync();

        // 检查并创建管理员角色
        var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Administrator");
        if (adminRole == null)
        {
            logger.LogInformation("创建管理员角色");
            adminRole = new Role
            {
                Name = "Administrator",
                Description = "系统管理员角色",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            await context.Roles.AddAsync(adminRole);
            await context.SaveChangesAsync();
        }
        logger.LogInformation("请注意，第一个注册的用户将自动成为管理员");
    }
}
