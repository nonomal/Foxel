import React, { useEffect, useState } from 'react';
import { Tabs, Card, message, Spin, Select } from 'antd';
import { CloudOutlined, DatabaseOutlined, CloudServerOutlined, GlobalOutlined } from '@ant-design/icons';
import { getAllConfigs, setConfig } from '../../api';
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

  // 获取所有配置项
  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await getAllConfigs();
      if (response.success && response.data) {
        const configGroups: ConfigStructure = {};
        response.data.forEach(config => {
          const [group, key] = config.key.split(':');
          if (!configGroups[group]) {
            configGroups[group] = {};
          }
          configGroups[group][key] = config.value;
        });

        setConfigs(configGroups);
        
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
      title="系统配置" 
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
              isMobile={isMobile}
            />
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
                      "TelegramStorageChatId": configs.Storage?.TelegramStorageChatId || ''
                    }}
                    onSave={handleSaveConfig}
                    descriptions={{
                      "TelegramStorageBotToken": 'Telegram 机器人令牌',
                      "TelegramStorageChatId": 'Telegram 聊天ID'
                    }}
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
                    isMobile={isMobile}
                  />
                )}
              </div>
            </Card>
          </TabPane>
        </Tabs>
      )}
    </Card>
  );
};

export default SystemConfig;
