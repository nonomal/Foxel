using System.Text.Json;
using Foxel.Models.DataBase;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Foxel.Services.Configuration;

public class ConfigService(
    IDbContextFactory<MyDbContext> contextFactory,
    IMemoryCache memoryCache,
    ILogger<ConfigService> logger)
    : IConfigService
{
    // 缓存过期时间
    private readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(30);

    public string this[string key] => GetValueAsync(key).GetAwaiter().GetResult() ?? string.Empty;

    public async Task<string?> GetValueAsync(string key)
    {
        // 尝试从缓存获取配置值
        if (memoryCache.TryGetValue($"config:{key}", out string? cachedValue))
        {
            return cachedValue;
        }

        // 如果缓存中没有，从数据库获取
        await using var context = await contextFactory.CreateDbContextAsync();
        var config = await context.Configs.FirstOrDefaultAsync(c => c.Key == key);

        if (config == null)
        {
            // 尝试从环境变量获取
            string envVarKey = key.ToUpper().Replace(".", "_").Replace("-", "_");
            string? envVarValue = Environment.GetEnvironmentVariable(envVarKey);

            if (!string.IsNullOrEmpty(envVarValue))
            {
                memoryCache.Set($"config:{key}", envVarValue, _cacheExpiration);
                return envVarValue;
            }

            return null;
        }

        // 将配置值添加到缓存
        memoryCache.Set($"config:{key}", config.Value, _cacheExpiration);

        return config.Value;
    }

    public async Task<T?> GetValueAsync<T>(string key, T? defaultValue = default)
    {
        var value = await GetValueAsync(key);

        if (string.IsNullOrEmpty(value))
            return defaultValue;

        try
        {
            return JsonSerializer.Deserialize<T>(value);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "无法将配置值反序列化为所需类型: {Type}", typeof(T).Name);
            return defaultValue;
        }
    }

    public async Task<Config?> GetConfigAsync(string key)
    {
        await using var context = await contextFactory.CreateDbContextAsync();
        var config = await context.Configs.FirstOrDefaultAsync(c => c.Key == key);
        
        // 如果配置是私密的，返回值设为空字符串
        if (config?.IsSecret == true)
        {
            // 创建一个新的实例，避免修改数据库中的值
            var displayConfig = new Config
            {
                Id = config.Id,
                Key = config.Key,
                Value = string.Empty, // 私密配置的值设为空
                Description = config.Description,
                IsSecret = config.IsSecret,
                CreatedAt = config.CreatedAt,
                UpdatedAt = config.UpdatedAt
            };
            return displayConfig;
        }
        
        return config;
    }

    public async Task<List<Config>> GetAllConfigsAsync()
    {
        await using var context = await contextFactory.CreateDbContextAsync();
        var configs = await context.Configs.OrderBy(c => c.Key).ToListAsync();
        
        foreach (var config in configs.Where(c => c.IsSecret))
        {
            config.Value = string.Empty;
        }
        
        return configs;
    }

    public async Task<Config> SetConfigAsync(string key, string value, string? description = null)
    {
        if (string.IsNullOrWhiteSpace(key))
            throw new ArgumentException("配置键不能为空", nameof(key));

        await using var context = await contextFactory.CreateDbContextAsync();

        var config = await context.Configs.FirstOrDefaultAsync(c => c.Key == key);

        if (config == null)
        {
            config = new Config
            {
                Key = key,
                Value = value,
                Description = description ?? string.Empty,
                IsSecret = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            context.Configs.Add(config);
        }
        else
        {
            if (!(config.IsSecret && string.IsNullOrEmpty(value)))
            {
                config.Value = value;
            }
            
            if (description != null)
            {
                config.Description = description;
            }
            config.UpdatedAt = DateTime.UtcNow;
        }
        await context.SaveChangesAsync();
        if (!config.IsSecret)
        {
            memoryCache.Set($"config:{key}", value, _cacheExpiration);
        }
        return config;
    }

    public async Task<bool> DeleteConfigAsync(string key)
    {
        await using var context = await contextFactory.CreateDbContextAsync();

        var config = await context.Configs.FirstOrDefaultAsync(c => c.Key == key);
        if (config == null)
            return false;

        context.Configs.Remove(config);
        await context.SaveChangesAsync();
        memoryCache.Remove($"config:{key}");
        return true;
    }

    public async Task<bool> ExistsAsync(string key)
    {
        await using var context = await contextFactory.CreateDbContextAsync();
        return await context.Configs.AnyAsync(c => c.Key == key);
    }

    public async Task<Dictionary<string, string>> BackupConfigsAsync()
    {
        var configs = await GetAllConfigsAsync();
        var backup = new Dictionary<string, string>();
        
        foreach (var config in configs)
        {
            backup[config.Key] = config.Value;
        }
        
        return backup;
    }

    public async Task<bool> RestoreConfigsAsync(Dictionary<string, string> configBackup)
    {
        if (configBackup == null || configBackup.Count == 0)
            return false;
            
        try
        {
            await using var context = await contextFactory.CreateDbContextAsync();
            await using var transaction = await context.Database.BeginTransactionAsync();
            
            try
            {
                foreach (var (key, value) in configBackup)
                {
                    await SetConfigAsync(key, value);
                }
                
                await transaction.CommitAsync();
                return true;
            }
            catch (Exception)
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "恢复配置时出错");
            return false;
        }
    }
}
