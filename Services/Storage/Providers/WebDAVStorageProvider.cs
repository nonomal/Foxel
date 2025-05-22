using System.Net.Http.Headers;
using System.Text;
using Foxel.Services.Attributes;
using Foxel.Services.Configuration;

namespace Foxel.Services.Storage.Providers;

[StorageProvider(StorageType.WebDAV)]
public class WebDavStorageProvider : IStorageProvider
{
    private readonly string _webDavServerUrl;
    private readonly string _serverUrl;
    private readonly string _basePath;
    private readonly string _publicUrl;
    private readonly HttpClient _httpClient;

    public WebDavStorageProvider(IConfigService configService)
    {
        _webDavServerUrl = configService["Storage:WebDAVServerUrl"].TrimEnd('/');
        var userName = configService["Storage:WebDAVUserName"];
        var password = configService["Storage:WebDAVPassword"];
        _basePath = configService["Storage:WebDAVBasePath"].Trim('/');
        _publicUrl = configService["Storage:WebDAVPublicUrl"].TrimEnd('/');
        _serverUrl = configService["AppSettings:ServerUrl"];
        _httpClient = new HttpClient();
        if (!string.IsNullOrEmpty(userName) && !string.IsNullOrEmpty(password))
        {
            var authValue = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{userName}:{password}"));
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", authValue);
        }
    }

    public async Task<string> SaveAsync(Stream fileStream, string fileName, string contentType)
    {
        try
        {
            // 创建唯一的文件存储路径
            string currentDate = DateTime.Now.ToString("yyyy/MM");
            string ext = Path.GetExtension(fileName);
            string newFileName = $"{Guid.NewGuid()}{ext}";
            string relativePath = $"{_basePath}/{currentDate}/{newFileName}";

            // 确保目录存在
            await EnsureDirectoryExistsAsync($"{_basePath}/{currentDate}");

            // 上传文件内容
            var requestUri = $"{_webDavServerUrl}/{relativePath}";
            using var content = new StreamContent(fileStream);
            content.Headers.ContentType = new MediaTypeHeaderValue(contentType);

            using var request = new HttpRequestMessage(HttpMethod.Put, requestUri);
            request.Content = content;

            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            return relativePath;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"上传文件到WebDAV时出错: {ex.Message}");
            throw;
        }
    }

    public async Task DeleteAsync(string storagePath)
    {
        try
        {
            if (string.IsNullOrEmpty(storagePath))
                return;

            var requestUri = $"{_webDavServerUrl}/{storagePath}";
            var response = await _httpClient.DeleteAsync(requestUri);

            if (response.StatusCode != System.Net.HttpStatusCode.NotFound)
            {
                response.EnsureSuccessStatusCode();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"从WebDAV删除文件时出错: {ex.Message}");
        }
    }

    public string GetUrl(string storagePath)
    {
        try
        {
            if (string.IsNullOrEmpty(storagePath))
                return "/images/unavailable.gif";

            if (!string.IsNullOrEmpty(_publicUrl))
            {
                return $"{_publicUrl}/{storagePath}";
            }

            return $"{_serverUrl}/api/picture/proxy?path={Uri.EscapeDataString(storagePath)}";
        }
        catch (Exception ex)
        {
            Console.WriteLine($"生成WebDAV文件URL时出错: {ex.Message}");
            return "/images/unavailable.gif";
        }
    }

    public async Task<string> DownloadFileAsync(string storagePath)
    {
        try
        {
            if (string.IsNullOrEmpty(storagePath))
            {
                throw new ArgumentException("存储路径不能为空");
            }

            // 创建临时目录
            var tempDir = Path.Combine(Path.GetTempPath(), "FoxelWebDAVTemp");
            if (!Directory.Exists(tempDir))
            {
                Directory.CreateDirectory(tempDir);
            }

            // 创建临时文件名
            string fileName = Path.GetFileName(storagePath);
            string tempFilePath = Path.Combine(tempDir, fileName);

            // 下载文件
            var requestUri = $"{_webDavServerUrl}/{storagePath}";
            using var request = new HttpRequestMessage(HttpMethod.Get, requestUri);
            var response = await _httpClient.SendAsync(request);
            response.EnsureSuccessStatusCode();

            await using var fileStream = new FileStream(tempFilePath, FileMode.Create);
            await response.Content.CopyToAsync(fileStream);

            return tempFilePath;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"从WebDAV下载文件时出错: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// 确保WebDAV上的目录存在
    /// </summary>
    private async Task EnsureDirectoryExistsAsync(string directoryPath)
    {
        try
        {
            var requestUri = $"{_webDavServerUrl}/{directoryPath}";

            // 检查目录是否存在 - 使用新的请求对象
            using var headRequest = new HttpRequestMessage(HttpMethod.Head, requestUri);
            var response = await _httpClient.SendAsync(headRequest);

            if (response.IsSuccessStatusCode)
                return;

            // 创建目录 - 使用新的请求对象
            using var mkcolRequest = new HttpRequestMessage(new HttpMethod("MKCOL"), requestUri);
            response = await _httpClient.SendAsync(mkcolRequest);

            // 处理状态码
            if (response.StatusCode == System.Net.HttpStatusCode.Conflict ||
                response.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                // 递归创建父目录
                var parentPath = Path.GetDirectoryName(directoryPath.TrimEnd('/'))?.Replace('\\', '/');
                if (!string.IsNullOrEmpty(parentPath))
                {
                    await EnsureDirectoryExistsAsync(parentPath);

                    using var retryRequest = new HttpRequestMessage(new HttpMethod("MKCOL"), requestUri);
                    response = await _httpClient.SendAsync(retryRequest);

                    if (response.StatusCode == System.Net.HttpStatusCode.MethodNotAllowed)
                    {
                        using var putRequest = new HttpRequestMessage(HttpMethod.Put, $"{requestUri}/.dummy");
                        putRequest.Content = new StringContent(string.Empty);
                        await _httpClient.SendAsync(putRequest);
                    }
                    else
                    {
                        response.EnsureSuccessStatusCode();
                    }
                }
            }
            else if (response.StatusCode == System.Net.HttpStatusCode.MethodNotAllowed)
            {
                using var putRequest = new HttpRequestMessage(HttpMethod.Put, $"{requestUri}/.dummy");
                putRequest.Content = new StringContent(string.Empty);
                var putResponse = await _httpClient.SendAsync(putRequest);
                putResponse.EnsureSuccessStatusCode();
            }
            else
            {
                response.EnsureSuccessStatusCode();
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"确保WebDAV目录存在时出错: {ex.Message}");
            throw;
        }
    }
}