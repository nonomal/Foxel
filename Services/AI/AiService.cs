using System.Net.Http.Headers;
using System.Text.Json.Serialization;
using Foxel.Services.Configuration;
using Foxel.Utils;

namespace Foxel.Services.AI;

public class AiService(IHttpClientFactory httpClientFactory, IConfigService configService, ILogger<AiService> logger)
    : IAiService
{
    private HttpClient? _httpClient;
    private string? _currentApiKey;
    private string? _currentBaseUrl;

    private HttpClient ConfigureHttpClient()
    {
        string apiKey = configService["AI:ApiKey"];
        string baseUrl = configService["AI:ApiEndpoint"];

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("AI API Key 未配置或为空。请检查配置文件中的 AI:ApiKey 设置。");
        }

        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            throw new InvalidOperationException("AI API Endpoint 未配置或为空。请检查配置文件中的 AI:ApiEndpoint 设置。");
        }

        if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out Uri? validUri))
        {
            throw new InvalidOperationException($"AI API Endpoint 格式无效: {baseUrl}。请提供有效的 URL。");
        }

        if (_httpClient == null || _currentApiKey != apiKey || _currentBaseUrl != baseUrl)
        {
            _httpClient?.Dispose();
            _httpClient = httpClientFactory.CreateClient();
            _httpClient.BaseAddress = validUri;
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            _currentApiKey = apiKey;
            _currentBaseUrl = baseUrl;
        }

        return _httpClient;
    }

    public async Task<(string title, string description)> AnalyzeImageAsync(string base64Image)
    {
        try
        {
            var client = ConfigureHttpClient();
            string model = configService["AI:Model"];
            var imageUrl = new ImageUrl
            {
                Url = $"data:image/jpeg;base64,{base64Image}"
            };

            var imageContent = new ImageUrlContent
            {
                Type = "image_url",
                ImageUrl = imageUrl
            };

            var textContent = new TextContent
            {
                Type = "text",
                Text = configService["AI:ImageAnalysisPrompt"]
            };

            var message = new ChatMessage
            {
                Role = "user",
                Content = new MessageContent[] { imageContent, textContent }
            };

            var requestContent = new ChatCompletionRequest
            {
                Model = model,
                Messages = [message],
                Stream = false,
                MaxTokens = 800,
                Temperature = 0.5,
                TopP = 0.8,
                TopK = 50
            };

            var response = await client.PostAsJsonAsync("/v1/chat/completions", requestContent);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadFromJsonAsync<AiResponse>();
            if (responseContent?.Choices == null || responseContent.Choices.Length == 0)
            {
                return ("未能获取标题", "未能获取描述");
            }

            var aiMessage = responseContent.Choices[0].Message.Content;
            return AiHelper.ExtractTitleAndDescription(aiMessage);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AI分析图片时出错");
            return ("处理失败", $"AI分析过程中发生错误: {ex.Message}");
        }
    }

    public async Task<List<string>> MatchTagsAsync(string description, List<string> availableTags)
    {
        try
        {
            var client = ConfigureHttpClient();

            if (availableTags.Count == 0)
                return new List<string>();

            string model = configService["AI:Model"];
            var tagsText = string.Join(", ", availableTags);

            string promptTemplate = configService["AI:TagMatchingPrompt"];

            // 替换占位符
            string promptText = promptTemplate
                .Replace("{tagsText}", tagsText)
                .Replace("{description}", description);

            var textContent = new TextContent
            {
                Type = "text",
                Text = promptText
            };

            var message = new ChatMessage
            {
                Role = "user",
                Content = new MessageContent[] { textContent }
            };

            var requestContent = new ChatCompletionRequest
            {
                Model = model,
                Messages = [message],
                Stream = false,
                MaxTokens = 200,
                Temperature = 0.1, // 降低温度使结果更确定性
                TopP = 0.95,
                TopK = 50
            };

            var response = await client.PostAsJsonAsync("/v1/chat/completions", requestContent);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadFromJsonAsync<AiResponse>();
            if (responseContent?.Choices == null || responseContent.Choices.Length == 0)
            {
                return new List<string>();
            }

            var aiMessage = responseContent.Choices[0].Message.Content;

            if (string.IsNullOrEmpty(aiMessage))
                return new List<string>();

            if (aiMessage.Contains("{") && aiMessage.Contains("}"))
            {
                try
                {
                    int jsonStartIndex = aiMessage.IndexOf('{');
                    int jsonEndIndex = aiMessage.LastIndexOf('}') + 1;

                    if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex)
                    {
                        string jsonPart = aiMessage[jsonStartIndex..jsonEndIndex];
                        var options = new System.Text.Json.JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        };

                        var result =
                            System.Text.Json.JsonSerializer.Deserialize<AiHelper.TagsResult>(jsonPart, options);
                        if (result is { Tags.Length: > 0 })
                        {
                            // 确保返回的标签真的在可用标签列表中
                            var matchedTags = new List<string>();

                            foreach (var tagName in result.Tags)
                            {
                                if (string.IsNullOrWhiteSpace(tagName))
                                    continue;

                                // 找到大小写完全匹配的标签
                                var exactMatch = availableTags.FirstOrDefault(t =>
                                    string.Equals(t, tagName, StringComparison.OrdinalIgnoreCase));

                                if (exactMatch != null)
                                {
                                    matchedTags.Add(exactMatch);
                                }
                            }

                            return matchedTags.Distinct().ToList();
                        }
                    }
                }
                catch (System.Text.Json.JsonException)
                {
                    // JSON解析失败，返回空列表
                    return new List<string>();
                }
            }

            // 解析失败或没有找到匹配标签，返回空列表
            return new List<string>();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AI匹配标签时出错");
            return new List<string>();
        }
    }

    public async Task<List<string>> GenerateTagsFromImageAsync(string base64Image, List<string> availableTags,
        bool allowNewTags = false)
    {
        try
        {
            // 获取配置好的 HttpClient
            var client = ConfigureHttpClient();

            string model = configService["AI:Model"];

            var imageUrl = new ImageUrl
            {
                Url = $"data:image/jpeg;base64,{base64Image}"
            };

            var imageContent = new ImageUrlContent
            {
                Type = "image_url",
                ImageUrl = imageUrl
            };

            string promptText;

            if (allowNewTags)
            {
                // 获取配置的标签生成提示词，如果没有则使用默认提示词
                string defaultPrompt = configService["AI:TagGenerationPrompt"];

                // 如果允许新标签，则提供现有标签作为参考，但允许生成新标签
                promptText = availableTags.Count > 0
                    ? $"可以参考这些现有标签：[{string.Join(", ", availableTags)}]，但也可以生成其他与图片内容相关的新标签。\n\n{defaultPrompt}"
                    : defaultPrompt;
            }
            else
            {
                // 如果不允许新标签，则只能从已有标签中选择
                if (availableTags.Count == 0)
                    return new List<string>();

                var tagsText = string.Join(", ", availableTags);
                string templatePrompt = configService["AI:TagMatchingPrompt"];

                promptText = templatePrompt.Replace("{tagsText}", tagsText);
            }

            var textContent = new TextContent
            {
                Type = "text",
                Text = promptText
            };

            var message = new ChatMessage
            {
                Role = "user",
                Content = new MessageContent[] { imageContent, textContent }
            };

            var requestContent = new ChatCompletionRequest
            {
                Model = model,
                Messages = [message],
                Stream = false,
                MaxTokens = 200,
                Temperature = 0.1, // 降低温度使结果更确定性
                TopP = 0.95,
                TopK = 50
            };

            var response = await client.PostAsJsonAsync("/v1/chat/completions", requestContent);
            response.EnsureSuccessStatusCode();

            var responseContent = await response.Content.ReadFromJsonAsync<AiResponse>();
            if (responseContent?.Choices == null || responseContent.Choices.Length == 0)
            {
                return new List<string>();
            }

            var aiMessage = responseContent.Choices[0].Message.Content;

            if (string.IsNullOrEmpty(aiMessage))
                return new List<string>();

            if (aiMessage.Contains("{") && aiMessage.Contains("}"))
            {
                try
                {
                    int jsonStartIndex = aiMessage.IndexOf('{');
                    int jsonEndIndex = aiMessage.LastIndexOf('}') + 1;

                    if (jsonStartIndex >= 0 && jsonEndIndex > jsonStartIndex)
                    {
                        string jsonPart = aiMessage[jsonStartIndex..jsonEndIndex];
                        var options = new System.Text.Json.JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        };

                        var result =
                            System.Text.Json.JsonSerializer.Deserialize<AiHelper.TagsResult>(jsonPart, options);
                        if (result is { Tags.Length: > 0 })
                        {
                            var matchedTags = new List<string>();

                            foreach (var tagName in result.Tags)
                            {
                                if (string.IsNullOrWhiteSpace(tagName))
                                    continue;

                                // 如果允许新标签，直接添加
                                if (allowNewTags)
                                {
                                    matchedTags.Add(tagName.Trim());
                                }
                                else
                                {
                                    // 否则只添加已有标签列表中的标签
                                    var exactMatch = availableTags.FirstOrDefault(t =>
                                        string.Equals(t, tagName, StringComparison.OrdinalIgnoreCase));

                                    if (exactMatch != null)
                                    {
                                        matchedTags.Add(exactMatch);
                                    }
                                }
                            }

                            return matchedTags.Distinct().ToList();
                        }
                    }
                }
                catch (System.Text.Json.JsonException)
                {
                    // JSON解析失败，返回空列表
                    return new List<string>();
                }
            }

            // 解析失败或没有找到匹配标签，返回空列表
            return new List<string>();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AI从图片生成标签时出错");
            return new List<string>();
        }
    }

    public async Task<float[]> GetEmbeddingAsync(string text)
    {
        try
        {
            // 获取配置好的 HttpClient
            var client = ConfigureHttpClient();

            string model = configService["AI:EmbeddingModel"];

            var requestContent = new
            {
                model,
                input = text,
                encoding_format = "float"
            };

            var response = await client.PostAsJsonAsync("/v1/embeddings", requestContent);
            response.EnsureSuccessStatusCode();

            var embedResult = await response.Content.ReadFromJsonAsync<EmbeddingResponse>();
            if (embedResult?.Data == null || embedResult.Data.Length == 0)
            {
                logger.LogWarning("嵌入向量API返回空结果");
                return Array.Empty<float>();
            }

            return embedResult.Data[0].Embedding;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "获取嵌入向量时出错");
            return Array.Empty<float>();
        }
    }

    // 从EmbeddingService移植的私有记录类
    private record EmbeddingResponse
    {
        [JsonPropertyName("data")] public EmbeddingData[] Data { get; set; } = Array.Empty<EmbeddingData>();
    }

    private record EmbeddingData
    {
        [JsonPropertyName("embedding")] public float[] Embedding { get; set; } = Array.Empty<float>();
    }

    private class AiResponse
    {
        [JsonPropertyName("choices")] public Choice[] Choices { get; set; } = Array.Empty<Choice>();
    }

    private class Choice
    {
        [JsonPropertyName("message")] public Message Message { get; set; } = new Message();
    }

    private class Message
    {
        [JsonPropertyName("content")] public string Content { get; set; } = string.Empty;
    }
}

public class ChatCompletionRequest
{
    [JsonPropertyName("model")] public string Model { get; set; } = string.Empty;

    [JsonPropertyName("messages")] public ChatMessage[] Messages { get; set; } = Array.Empty<ChatMessage>();

    [JsonPropertyName("stream")] public bool Stream { get; set; }

    [JsonPropertyName("max_tokens")] public int MaxTokens { get; set; }

    [JsonPropertyName("temperature")] public double Temperature { get; set; }

    [JsonPropertyName("top_p")] public double TopP { get; set; }

    [JsonPropertyName("top_k")] public int TopK { get; set; }
}

public class ChatMessage
{
    [JsonPropertyName("role")] public string Role { get; set; } = string.Empty;

    [JsonPropertyName("content")] public MessageContent[] Content { get; set; } = Array.Empty<MessageContent>();
}

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(TextContent), typeDiscriminator: "text")]
[JsonDerivedType(typeof(ImageUrlContent), typeDiscriminator: "image_url")]
public abstract class MessageContent
{
    [JsonPropertyName("type")] public string Type { get; set; } = string.Empty;
}

public class TextContent : MessageContent
{
    [JsonPropertyName("text")] public string Text { get; set; } = string.Empty;
}

public class ImageUrlContent : MessageContent
{
    [JsonPropertyName("image_url")] public ImageUrl ImageUrl { get; set; } = new();
}

public class ImageUrl
{
    [JsonPropertyName("url")] public string Url { get; set; } = string.Empty;
}