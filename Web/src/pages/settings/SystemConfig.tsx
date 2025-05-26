import React, { useEffect, useState } from 'react';
import { Tabs, Card, message, Spin, Select, Button, Upload, Modal, Space, Tooltip, Input } from 'antd';
import { CloudOutlined, DatabaseOutlined, CloudServerOutlined, GlobalOutlined, DownloadOutlined, UploadOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { getAllConfigs, setConfig, backupConfigs, restoreConfigs } from '../../api';
import ConfigGroup from './ConfigGroup.tsx';
import useIsMobile from '../../hooks/useIsMobile';

const { TabPane } = Tabs;
const { Option } = Select;

interface ConfigStructure {
  [key: string]: {
    [key: string]: string;
  };
}

const SystemConfig: React.FC = () => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<ConfigStructure>({});
  const [activeKey, setActiveKey] = useState('AI');
  const [storageType, setStorageType] = useState('Telegram');
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restoreConfig, setRestoreConfig] = useState<Record<string, string> | null>(null);
  const [secretFields, setSecretFields] = useState<Record<string, string[]>>({}); // 新增状态管理私密字段

  // 获取所有配置项
  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await getAllConfigs();
      if (response.success && response.data) {
        const configGroups: ConfigStructure = {};
        const secretFieldsMap: Record<string, string[]> = {}; // 记录每个组的私密字段
        
        response.data.forEach(config => {
          const [group, key] = config.key.split(':');
          if (!configGroups[group]) {
            configGroups[group] = {};
            secretFieldsMap[group] = [];
          }
          configGroups[group][key] = config.value;
          
          // 记录私密字段
          if (config.isSecret) {
            if (!secretFieldsMap[group]) {
              secretFieldsMap[group] = [];
            }
            secretFieldsMap[group].push(key);
          }
        });

        setConfigs(configGroups);
        setSecretFields(secretFieldsMap);
        
        // 设置初始存储类型
        if (configGroups.Storage?.DefaultStorage) {
          setStorageType(configGroups.Storage.DefaultStorage);
        }
      } else {
        message.error('获取配置失败: ' + response.message);
      }
    } catch (error) {
      message.error('获取配置出错');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 保存配置项
  const handleSaveConfig = async (group: string, key: string, value: string) => {
    try {
      const configKey = `${group}:${key}`;
      const response = await setConfig({
        key: configKey,
        value: value,
        description: `${group} ${key} setting`
      });

      if (response.success) {
        message.success(`保存 ${key} 配置成功`);
        // 更新本地状态
        setConfigs(prev => ({
          ...prev,
          [group]: {
            ...prev[group],
            [key]: value
          }
        }));
      } else {
        message.error(`保存失败: ${response.message}`);
      }
    } catch (error) {
      message.error('保存配置出错');
      console.error(error);
    }
  };

  // 备份配置
  const handleBackupConfigs = async () => {
    setBackupLoading(true);
    try {
      const response = await backupConfigs();
      if (response.success && response.data) {
        const configData = JSON.stringify(response.data, null, 2);
        const blob = new Blob([configData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `foxel-config-backup-${timestamp}.json`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        message.success('配置备份已下载');
      } else {
        message.error('备份配置失败: ' + response.message);
      }
    } catch (error) {
      message.error('备份配置出错');
      console.error(error);
    } finally {
      setBackupLoading(false);
    }
  };

  // 上传配置文件
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = JSON.parse(content);
        setRestoreConfig(config);
        setRestoreModalVisible(true);
      } catch (error) {
        message.error('无效的配置文件格式');
      }
    };
    reader.readAsText(file);
    return false; // 阻止自动上传
  };

  // 确认恢复配置
  const handleRestoreConfigs = async () => {
    if (!restoreConfig) return;
    
    setRestoreLoading(true);
    try {
      const response = await restoreConfigs(restoreConfig);
      if (response.success) {
        message.success('配置恢复成功，将在3秒后刷新页面');
        setRestoreModalVisible(false);
        
        // 重新加载配置
        setTimeout(() => {
          fetchConfigs();
          // 可选：刷新页面以确保所有配置生效
          // window.location.reload();
        }, 3000);
      } else {
        message.error('恢复配置失败: ' + response.message);
      }
    } catch (error) {
      message.error('恢复配置出错');
      console.error(error);
    } finally {
      setRestoreLoading(false);
    }
  };

  // 存储类型选项
  const storageOptions = [
    { value: 'Local', label: '本地存储', icon: <DatabaseOutlined style={{ color: '#52c41a' }} /> },
    { value: 'Telegram', label: 'Telegram 频道', icon: <CloudOutlined style={{ color: '#0088cc' }} /> },
    { value: 'S3', label: '亚马逊 S3', icon: <CloudServerOutlined style={{ color: '#ff9900' }} /> },
    { value: 'Cos', label: '腾讯云 COS', icon: <CloudServerOutlined style={{ color: '#00a4ff' }} /> },
    { value: 'WebDAV', label: 'WebDAV 存储', icon: <GlobalOutlined style={{ color: '#1890ff' }} /> },
  ];

  useEffect(() => {
    fetchConfigs();
  }, []);

  return (
    <Card 
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>系统配置</span>
          <Space>
            <Tooltip title="下载当前所有配置的备份">
              <Button 
                icon={<DownloadOutlined />} 
                onClick={handleBackupConfigs} 
                loading={backupLoading}
                size={isMobile ? "small" : "middle"}
              >
                {isMobile ? '' : '备份配置'}
              </Button>
            </Tooltip>
            
            <Upload 
              beforeUpload={handleFileUpload} 
              showUploadList={false}
              accept=".json"
            >
              <Tooltip title="从备份文件恢复配置">
                <Button 
                  icon={<UploadOutlined />} 
                  size={isMobile ? "small" : "middle"}
                >
                  {isMobile ? '' : '恢复配置'}
                </Button>
              </Tooltip>
            </Upload>
          </Space>
        </div>
      }
      className="system-config-card"
      bodyStyle={{ 
        padding: isMobile ? '12px 8px' : '24px' 
      }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin tip="加载配置中..." />
        </div>
      ) : (
        <Tabs 
          activeKey={activeKey} 
          onChange={setActiveKey}
          size={isMobile ? "small" : "middle"}
          tabPosition={isMobile ? "top" : "left"}
          style={{ 
            minHeight: isMobile ? 'auto' : 400
          }}
        >
          <TabPane tab="AI 设置" key="AI">
            <Tabs defaultActiveKey="basic" type="card" size={isMobile ? "small" : "middle"}>
              <TabPane tab="基础配置" key="basic">
                <ConfigGroup
                  groupName="AI"
                  configs={{
                    ApiEndpoint: configs.AI?.ApiEndpoint || '',
                    ApiKey: configs.AI?.ApiKey || '',
                    Model: configs.AI?.Model || '',
                    EmbeddingModel: configs.AI?.EmbeddingModel || ''
                  }}
                  onSave={handleSaveConfig}
                  descriptions={{
                    ApiEndpoint: 'AI 服务的API端点地址',
                    ApiKey: 'AI 服务的API密钥',
                    Model: 'AI 模型名称',
                    EmbeddingModel: '嵌入向量模型名称'
                  }}
                  secretFields={secretFields.AI || []}
                  isMobile={isMobile}
                />
              </TabPane>
              <TabPane tab="提示词设置" key="prompts">
                <Card 
                  size="small" 
                  title="图片分析提示词" 
                  style={{ marginBottom: isMobile ? 16 : 24 }}
                  bodyStyle={{ padding: isMobile ? '12px' : '16px' }}
                >
                  <Input.TextArea
                    rows={8}
                    value={configs.AI?.ImageAnalysisPrompt || 
                      "请详细分析这张图片，并提供全面的描述，以便用于向量嵌入和基于文本的图像搜索。描述需要包含：主体对象、场景环境、色彩特点、构图布局、风格特征、情绪氛围、细节特征等关键元素。请提供一个简短有力的标题，然后提供详细描述。\n\n请以JSON格式返回，格式如下：\n{\"title\": \"简短概括图片的核心内容\", \"description\": \"全面详细的描述，包含上述所有元素，使用丰富精确的词汇，避免笼统表达\"}\n\n请确保返回有效的JSON格式。"}
                    onChange={(e) => {
                      const newConfigs = { ...configs };
                      if (!newConfigs.AI) newConfigs.AI = {};
                      newConfigs.AI.ImageAnalysisPrompt = e.target.value;
                      setConfigs(newConfigs);
                    }}
                  />
                  <div style={{ marginTop: 8, textAlign: 'right' }}>
                    <Button 
                      type="primary"
                      onClick={() => handleSaveConfig('AI', 'ImageAnalysisPrompt', configs.AI?.ImageAnalysisPrompt || '')}
                    >
                      保存图片分析提示词
                    </Button>
                  </div>
                  <div style={{ 
                    fontSize: 12, 
                    color: '#999', 
                    marginTop: 8 
                  }}>
                    用于分析图片内容并提取描述的提示词。请确保提示词包含返回JSON格式的指示，并且要求返回标题(title)和描述(description)字段。
                  </div>
                </Card>

                <Card 
                  size="small" 
                  title="标签生成提示词" 
                  style={{ marginBottom: isMobile ? 16 : 24 }}
                  bodyStyle={{ padding: isMobile ? '12px' : '16px' }}
                >
                  <Input.TextArea
                    rows={8}
                    value={configs.AI?.TagGenerationPrompt || 
                      "请为图片生成5个最相关的标签，每个标签应该是简短且描述性的词语或短语。\n\n请以JSON格式返回，格式如下：\n{\"tags\": [\"标签1\", \"标签2\", \"标签3\", \"标签4\", \"标签5\"]}\n\n请确保返回有效的JSON格式。"}
                    onChange={(e) => {
                      const newConfigs = { ...configs };
                      if (!newConfigs.AI) newConfigs.AI = {};
                      newConfigs.AI.TagGenerationPrompt = e.target.value;
                      setConfigs(newConfigs);
                    }}
                  />
                  <div style={{ marginTop: 8, textAlign: 'right' }}>
                    <Button 
                      type="primary"
                      onClick={() => handleSaveConfig('AI', 'TagGenerationPrompt', configs.AI?.TagGenerationPrompt || '')}
                    >
                      保存标签生成提示词
                    </Button>
                  </div>
                  <div style={{ 
                    fontSize: 12, 
                    color: '#999', 
                    marginTop: 8 
                  }}>
                    用于从图片内容生成标签的提示词。请确保提示词包含返回JSON格式的指示，并且要求返回tags数组字段。
                  </div>
                </Card>

                <Card 
                  size="small" 
                  title="标签匹配提示词" 
                  style={{ marginBottom: isMobile ? 16 : 24 }}
                  bodyStyle={{ padding: isMobile ? '12px' : '16px' }}
                >
                  <Input.TextArea
                    rows={8}
                    value={configs.AI?.TagMatchingPrompt || 
                      "以下是一组标签：[{tagsText}]。\n\n请从这些标签中严格选择与下面描述内容高度相关的标签（最多选择5个）。只选择确实匹配的标签，如果找不到完全匹配或高度相关的标签，宁可返回空数组也不要选择不太相关的标签。\n\n描述内容：{description}\n\n请以JSON格式返回，格式如下：\n{\"tags\": [\"标签1\", \"标签2\", \"标签3\"]}\n\n请确保返回有效的JSON格式前面不要加```，并且只包含确实匹配的标签名称。"}
                    onChange={(e) => {
                      const newConfigs = { ...configs };
                      if (!newConfigs.AI) newConfigs.AI = {};
                      newConfigs.AI.TagMatchingPrompt = e.target.value;
                      setConfigs(newConfigs);
                    }}
                  />
                  <div style={{ marginTop: 8, textAlign: 'right' }}>
                    <Button 
                      type="primary"
                      onClick={() => handleSaveConfig('AI', 'TagMatchingPrompt', configs.AI?.TagMatchingPrompt || '')}
                    >
                      保存标签匹配提示词
                    </Button>
                  </div>
                  <div style={{ 
                    fontSize: 12, 
                    color: '#999', 
                    marginTop: 8 
                  }}>
                    用于将描述内容与已有标签进行匹配的提示词。请确保提示词包含{'{'+'tagsText'+'}'}和{'{'+'description'+'}'}占位符，系统将会用实际的标签列表和描述内容替换这些占位符。
                  </div>
                </Card>
              </TabPane>
            </Tabs>
          </TabPane>

          <TabPane tab="授权配置" key="Authorization">
            <Tabs defaultActiveKey="jwt" type="card" size={isMobile ? "small" : "middle"}>
              <TabPane tab="JWT 设置" key="jwt">
                <ConfigGroup
                  groupName="Jwt"
                  configs={{
                    SecretKey: configs.Jwt?.SecretKey || '',
                    Issuer: configs.Jwt?.Issuer || '',
                    Audience: configs.Jwt?.Audience || '',
                  }}
                  onSave={handleSaveConfig}
                  descriptions={{
                    SecretKey: 'JWT 加密密钥',
                    Issuer: 'JWT 签发者',
                    Audience: 'JWT 接收者',
                  }}
                  secretFields={secretFields.Jwt || []}
                  isMobile={isMobile}
                />
              </TabPane>
              <TabPane tab="GitHub认证" key="github">
                <ConfigGroup
                  groupName="Authentication"
                  configs={{
                    "GitHubClientId": configs.Authentication?.["GitHubClientId"] || '',
                    "GitHubClientSecret": configs.Authentication?.["GitHubClientSecret"] || '',
                    "GitHubCallbackUrl": configs.Authentication?.["GitHubCallbackUrl"] || ''
                  }}
                  onSave={(_group, key, value) => handleSaveConfig('Authentication', key, value)}
                  descriptions={{
                    "GitHubClientId": 'GitHub OAuth 应用客户端ID',
                    "GitHubClientSecret": 'GitHub OAuth 应用客户端密钥',
                    "GitHubCallbackUrl": 'GitHub OAuth 认证回调地址'
                  }}
                  secretFields={secretFields.Authentication || []}
                  isMobile={isMobile}
                />
              </TabPane>
            </Tabs>
          </TabPane>

          <TabPane tab="应用设置" key="AppSettings">
            <ConfigGroup
              groupName="AppSettings"
              configs={{
                ServerUrl: configs.AppSettings?.ServerUrl || ''
              }}
              onSave={handleSaveConfig}
              descriptions={{
                ServerUrl: '服务器URL'
              }}
            />
          </TabPane>

          <TabPane tab="存储设置" key="Storage">
            {/* 存储类型配置卡片 */}
            <Card 
              size="small" 
              title="存储类型配置" 
              style={{ marginBottom: isMobile ? 16 : 24 }}
              bodyStyle={{ padding: isMobile ? '12px' : '16px' }}
            >
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: isMobile ? 12 : 16,
                marginBottom: 0
              }}>
                {/* 登录用户默认存储 */}
                <div>
                  <div style={{ 
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#666'
                  }}>
                    登录用户默认存储
                  </div>
                  <Select 
                    value={configs.Storage?.DefaultStorage || 'Local'} 
                    onChange={(value) => {
                      handleSaveConfig('Storage', 'DefaultStorage', value);
                    }}
                    style={{ width: '100%' }}
                    size="large"
                    placeholder="选择登录用户的默认存储方式"
                  >
                    {storageOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {option.icon}
                          <span style={{ marginLeft: 8 }}>{option.label}</span>
                        </div>
                      </Option>
                    ))}
                  </Select>
                  <div style={{ 
                    fontSize: 12, 
                    color: '#999', 
                    marginTop: 4 
                  }}>
                    已登录用户上传文件时的默认存储位置
                  </div>
                </div>

                {/* 匿名用户默认存储 */}
                <div>
                  <div style={{ 
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#666'
                  }}>
                    匿名用户默认存储
                  </div>
                  <Select 
                    value={configs.Storage?.AnonymousDefaultStorage || 'Local'} 
                    onChange={(value) => {
                      handleSaveConfig('Storage', 'AnonymousDefaultStorage', value);
                    }}
                    style={{ width: '100%' }}
                    size="large"
                    placeholder="选择匿名用户的默认存储方式"
                  >
                    {storageOptions.map(option => (
                      <Option key={option.value} value={option.value}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          {option.icon}
                          <span style={{ marginLeft: 8 }}>{option.label}</span>
                        </div>
                      </Option>
                    ))}
                  </Select>
                  <div style={{ 
                    fontSize: 12, 
                    color: '#999', 
                    marginTop: 4 
                  }}>
                    未登录用户上传文件时的默认存储位置
                  </div>
                </div>
              </div>
            </Card>

            {/* 上传设置卡片 - 新增 */}
            <Card 
              size="small" 
              title="上传设置配置" 
              style={{ marginBottom: isMobile ? 16 : 24 }}
              bodyStyle={{ padding: isMobile ? '12px' : '16px' }}
            >
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: isMobile ? 12 : 16,
                marginBottom: 0
              }}>
                {/* 图片默认格式 */}
                <div>
                  <div style={{ 
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#666'
                  }}>
                    默认图片格式
                  </div>
                  <Select 
                    value={configs.Upload?.DefaultImageFormat || 'Original'} 
                    onChange={(value) => {
                      handleSaveConfig('Upload', 'DefaultImageFormat', value);
                    }}
                    style={{ width: '100%' }}
                    size="large"
                    placeholder="选择上传图片的默认处理格式"
                  >
                    <Option value="Original">保持原始格式</Option>
                    <Option value="Jpeg">转换为JPEG</Option>
                    <Option value="Png">转换为PNG</Option>
                    <Option value="Webp">转换为WebP</Option>
                  </Select>
                  <div style={{ 
                    fontSize: 12, 
                    color: '#999', 
                    marginTop: 4 
                  }}>
                    上传图片时的默认处理格式，选择合适的格式可以优化存储和显示
                  </div>
                </div>

                {/* 图片压缩质量 */}
                <div>
                  <div style={{ 
                    marginBottom: 8,
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#666'
                  }}>
                    默认压缩质量
                  </div>
                  <Select 
                    value={configs.Upload?.DefaultImageQuality || '95'} 
                    onChange={(value) => {
                      handleSaveConfig('Upload', 'DefaultImageQuality', value);
                    }}
                    style={{ width: '100%' }}
                    size="large"
                    placeholder="选择图片压缩质量"
                  >
                    <Option value="100">100% - 最高质量</Option>
                    <Option value="95">95% - 高质量</Option>
                    <Option value="90">90% - 优质</Option>
                    <Option value="85">85% - 良好</Option>
                    <Option value="80">80% - 节省空间</Option>
                    <Option value="75">75% - 平衡</Option>
                    <Option value="70">70% - 压缩</Option>
                  </Select>
                  <div style={{ 
                    fontSize: 12, 
                    color: '#999', 
                    marginTop: 4 
                  }}>
                    适用于JPEG和WebP格式的图片质量设置，越高图片质量越好但文件越大
                  </div>
                </div>
              </div>
            </Card>

            {/* 存储服务配置卡片 */}
            <Card 
              size="small" 
              title="存储服务配置" 
              style={{ marginBottom: isMobile ? 16 : 24 }}
              bodyStyle={{ padding: isMobile ? '12px' : '16px' }}
            >
              <div style={{ marginBottom: 16 }}>
                <div style={{ 
                  marginBottom: 8,
                  fontSize: 14,
                  fontWeight: 500,
                  color: '#666'
                }}>
                  选择要配置的存储服务
                </div>
                <Select 
                  value={storageType} 
                  onChange={(value) => {
                    setStorageType(value);
                  }}
                  style={{ width: isMobile ? '100%' : '300px' }}
                  size="large"
                  placeholder="选择需要配置的存储服务类型"
                >
                  {storageOptions.map(option => (
                    <Option key={option.value} value={option.value}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {option.icon}
                        <span style={{ marginLeft: 8 }}>{option.label}</span>
                      </div>
                    </Option>
                  ))}
                </Select>
                <div style={{ 
                  fontSize: 12, 
                  color: '#999', 
                  marginTop: 4 
                }}>
                  选择后将显示对应存储服务的详细配置选项
                </div>
              </div>

              {/* 存储服务具体配置 */}
              <div style={{ 
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                padding: isMobile ? 12 : 16,
                backgroundColor: '#fafafa'
              }}>
                {storageType === 'Local' && (
                  <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
                    本地存储无需额外配置
                  </div>
                )}

                {storageType === 'Telegram' && (
                  <ConfigGroup
                    groupName="Storage"
                    configs={{
                      "TelegramStorageBotToken": configs.Storage?.TelegramStorageBotToken || '',
                      "TelegramStorageChatId": configs.Storage?.TelegramStorageChatId || '',
                      "TelegramProxyAddress": configs.Storage?.TelegramProxyAddress || '',
                      "TelegramProxyPort": configs.Storage?.TelegramProxyPort || '',
                      "TelegramProxyUsername": configs.Storage?.TelegramProxyUsername || '',
                      "TelegramProxyPassword": configs.Storage?.TelegramProxyPassword || ''
                    }}
                    onSave={handleSaveConfig}
                    descriptions={{
                      "TelegramStorageBotToken": 'Telegram 机器人令牌',
                      "TelegramStorageChatId": 'Telegram 聊天ID',
                      "TelegramProxyAddress": '代理服务器地址 (例如: 127.0.0.1)',
                      "TelegramProxyPort": '代理服务器端口 (例如: 1080)',
                      "TelegramProxyUsername": '代理用户名 (可选)',
                      "TelegramProxyPassword": '代理密码 (可选)'
                    }}
                    secretFields={secretFields.Storage || []}
                    isMobile={isMobile}
                  />
                )}

                {storageType === 'S3' && (
                  <ConfigGroup
                    groupName="Storage"
                    configs={{
                      "S3StorageAccessKey": configs.Storage?.S3StorageAccessKey || '',
                      "S3StorageSecretKey": configs.Storage?.S3StorageSecretKey || '',
                      "S3StorageBucketName": configs.Storage?.S3StorageBucketName || '',
                      "S3StorageRegion": configs.Storage?.S3StorageRegion || '',
                      "S3StorageEndpoint": configs.Storage?.S3StorageEndpoint || '',
                      "S3StorageCdnUrl": configs.Storage?.S3StorageCdnUrl || '',
                      "S3StorageUsePathStyleUrls": configs.Storage?.S3StorageUsePathStyleUrls || 'false'
                    }}
                    onSave={handleSaveConfig}
                    descriptions={{
                      "S3StorageAccessKey": 'S3访问密钥',
                      "S3StorageSecretKey": 'S3私有密钥',
                      "S3StorageBucketName": 'S3存储桶名称',
                      "S3StorageRegion": 'S3区域 (例如:us-east-1)',
                      "S3StorageEndpoint": 'S3端点URL (可选,默认为AWS S3)',
                      "S3StorageCdnUrl": 'CDN URL (可选,用于加速文件访问)',
                      "S3StorageUsePathStyleUrls": '使用路径形式URLs (true/false,兼容非AWS服务)'
                    }}
                    secretFields={secretFields.Storage || []}
                    isMobile={isMobile}
                  />
                )}

                {storageType === 'Cos' && (
                  <ConfigGroup
                    groupName="Storage"
                    configs={{
                      "CosStorageSecretId": configs.Storage?.CosStorageSecretId || '',
                      "CosStorageSecretKey": configs.Storage?.CosStorageSecretKey || '',
                      "CosStorageToken": configs.Storage?.CosStorageToken || '',
                      "CosStorageBucketName": configs.Storage?.CosStorageBucketName || '',
                      "CosStorageRegion": configs.Storage?.CosStorageRegion || '',
                      "CosStorageCdnUrl": configs.Storage?.CosStorageCdnUrl || '',
                    }}
                    onSave={handleSaveConfig}
                    descriptions={{
                      "CosStorageSecretId": '腾讯云COS密钥ID',
                      "CosStorageSecretKey": '腾讯云COS私有密钥',
                      "CosStorageToken": '腾讯云COS临时令牌(可选)',
                      "CosStorageBucketName": 'COS存储桶名称',
                      "CosStorageRegion": 'COS区域 (例如:ap-shanghai)',
                      "CosStorageCdnUrl": 'CDN URL (可选,用于加速文件访问)',
                    }}
                    secretFields={secretFields.Storage || []}
                    isMobile={isMobile}
                  />
                )}
                
                {storageType === 'WebDAV' && (
                  <ConfigGroup
                    groupName="Storage"
                    configs={{
                      "WebDAVServerUrl": configs.Storage?.WebDAVServerUrl || '',
                      "WebDAVUserName": configs.Storage?.WebDAVUserName || '',
                      "WebDAVPassword": configs.Storage?.WebDAVPassword || '',
                      "WebDAVBasePath": configs.Storage?.WebDAVBasePath || '',
                      "WebDAVPublicUrl": configs.Storage?.WebDAVPublicUrl || '',
                    }}
                    onSave={handleSaveConfig}
                    descriptions={{
                      "WebDAVServerUrl": 'WebDAV 服务器 URL (例如: https://dav.example.com)',
                      "WebDAVUserName": 'WebDAV 用户名',
                      "WebDAVPassword": 'WebDAV 密码',
                      "WebDAVBasePath": 'WebDAV 基础路径 (例如: files/upload)',
                      "WebDAVPublicUrl": 'WebDAV 公共访问 URL (可选,用于文件访问)',
                    }}
                    secretFields={secretFields.Storage || []}
                    isMobile={isMobile}
                  />
                )}
              </div>
            </Card>
          </TabPane>
        </Tabs>
      )}
      
      {/* 恢复配置确认对话框 */}
      <Modal
        title={
          <div>
            <span>确认恢复配置</span>
            <Tooltip title="恢复配置将覆盖当前所有配置设置，请确认备份文件正确无误">
              <QuestionCircleOutlined style={{ marginLeft: 8 }} />
            </Tooltip>
          </div>
        }
        open={restoreModalVisible}
        onCancel={() => setRestoreModalVisible(false)}
        footer={[
          <>
            <Button key="cancel" onClick={() => setRestoreModalVisible(false)}>
              取消
            </Button>
            <Button
              key="submit"
              type="primary"
              loading={restoreLoading}
              onClick={handleRestoreConfigs}
            >
              确认恢复
            </Button>
          </>
        ]}
      >
        <p>您确定要从上传的备份文件恢复配置吗？</p>
        <p style={{ color: '#ff4d4f' }}>警告：此操作将覆盖当前系统中的所有配置设置！</p>
        {restoreConfig && (
          <div>
            <p>备份文件包含 {Object.keys(restoreConfig).length} 条配置项</p>
          </div>
        )}
      </Modal>
    </Card>
  );
};

export default SystemConfig;
