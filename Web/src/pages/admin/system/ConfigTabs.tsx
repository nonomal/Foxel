import React from 'react';
import { Tabs, Form, Input, Button, Select, Space, Divider, Typography } from 'antd';
import {
  ApiOutlined, RocketOutlined, PictureOutlined, SaveOutlined,
  SafetyCertificateOutlined, LockOutlined, GlobalOutlined, SettingOutlined,
  CloudServerOutlined, DatabaseOutlined, UploadOutlined} from '@ant-design/icons';
import ConfigFormItem from './ConfigFormItem';
import ConfigSection from './ConfigSection';
import VectorDbConfig from './VectorDbConfig'; 

const { TabPane } = Tabs;
const { Option } = Select;
const { Title, Paragraph } = Typography;

interface ConfigStructure {
  [key: string]: {
    [key: string]: string;
  };
}

interface ConfigTabsProps {
  configs: ConfigStructure;
  secretFields: Record<string, string[]>;
  isMobile: boolean;
  activeKey: string;
  onTabChange: (key: string) => void;
  storageType: string;
  onStorageTypeChange: (type: string) => void;
  formsMap: Record<string, any>;
  allDescriptions: Record<string, Record<string, string>>;
  onSaveSingleConfig: (formInstance: any, groupName: string, key: string) => Promise<void>;
  onSaveAllForGroup: (formInstance: any, groupName: string, itemKeys: string[]) => Promise<void>;
  onBaseSaveConfig: (group: string, key: string, value: string) => Promise<boolean>;
  setConfigs: React.Dispatch<React.SetStateAction<ConfigStructure>>;
  storageOptions: Array<{ value: string; label: string; icon: React.ReactNode; }>;
  imageFormatOptions: Array<{ value: string; label: string; description: string; }>;
  imageQualityOptions: Array<{ value: string; label: string; description: string; }>;
}

const ConfigTabs: React.FC<ConfigTabsProps> = ({
  configs,
  secretFields,
  isMobile,
  activeKey,
  onTabChange,
  storageType,
  onStorageTypeChange,
  formsMap,
  allDescriptions,
  onSaveSingleConfig,
  onSaveAllForGroup,
  onBaseSaveConfig,
  setConfigs,
  storageOptions,
  imageFormatOptions,
  imageQualityOptions,
}) => {

  const renderConfigFormItems = (formInstance: any, groupName: string, itemKeys: string[]) => {
    return itemKeys.map(key => {
      const isSecret = secretFields[groupName]?.includes(key);
      const description = allDescriptions[groupName]?.[key] || '';
      const currentValue = configs[groupName]?.[key];

      return (
        <ConfigFormItem
          key={key}
          groupName={groupName}
          itemKey={key}
          description={description}
          isSecret={isSecret}
          currentValue={currentValue}
          formInstance={formInstance}
          isMobile={isMobile}
          onSave={onSaveSingleConfig}
        />
      );
    });
  };

  const tabItems = [
    {
      key: 'AI',
      label: 'AI 设置',
      icon: <ApiOutlined />,
      children: (
        <Tabs defaultActiveKey="basic" type="card" size={isMobile ? "small" : "middle"}>
          <TabPane tab="基础配置" key="basic">
            <ConfigSection
              title="AI 服务配置"
              icon={<RocketOutlined />}
              description="配置AI服务的基本参数，包括API端点、密钥和模型选择"
              isMobile={isMobile}
            >
              <Form form={formsMap.AI} layout="vertical" size={isMobile ? "middle" : "large"}>
                {renderConfigFormItems(formsMap.AI, "AI", ['ApiEndpoint', 'ApiKey', 'Model', 'EmbeddingModel'])}
                <Divider style={{ margin: '12px 0 20px' }} />
                <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => onSaveAllForGroup(formsMap.AI, "AI", ['ApiEndpoint', 'ApiKey', 'Model', 'EmbeddingModel'])}
                    style={{ width: isMobile ? '100%' : '240px' }}
                  >
                    保存所有基础配置
                  </Button>
                </Form.Item>
              </Form>
            </ConfigSection>
          </TabPane>
          <TabPane tab="提示词设置" key="prompts">
            <ConfigSection
              title="图片分析提示词"
              icon={<PictureOutlined />}
              description={allDescriptions.AI?.ImageAnalysisPrompt}
              isMobile={isMobile}
            >
              <Input.TextArea
                rows={8}
                value={configs.AI?.ImageAnalysisPrompt || ""}
                onChange={(e) => {
                  const newConfigs = { ...configs };
                  if (!newConfigs.AI) newConfigs.AI = {};
                  newConfigs.AI.ImageAnalysisPrompt = e.target.value;
                  setConfigs(newConfigs);
                }}
                style={{ marginBottom: 16 }}
              />
              <div style={{ textAlign: 'center' }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => onBaseSaveConfig('AI', 'ImageAnalysisPrompt', configs.AI?.ImageAnalysisPrompt || '')}
                  style={{ width: isMobile ? '100%' : '240px' }}
                >
                  保存图片分析提示词
                </Button>
              </div>
            </ConfigSection>

            <ConfigSection
              title="标签生成提示词"
              icon={<PictureOutlined />}
              description={allDescriptions.AI?.TagGenerationPrompt}
              isMobile={isMobile}
            >
              <Input.TextArea
                rows={8}
                value={configs.AI?.TagGenerationPrompt || ""}
                onChange={(e) => {
                  const newConfigs = { ...configs };
                  if (!newConfigs.AI) newConfigs.AI = {};
                  newConfigs.AI.TagGenerationPrompt = e.target.value;
                  setConfigs(newConfigs);
                }}
                style={{ marginBottom: 16 }}
              />
              <div style={{ textAlign: 'center' }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => onBaseSaveConfig('AI', 'TagGenerationPrompt', configs.AI?.TagGenerationPrompt || '')}
                  style={{ width: isMobile ? '100%' : '240px' }}
                >
                  保存标签生成提示词
                </Button>
              </div>
            </ConfigSection>

            <ConfigSection
              title="标签匹配提示词"
              icon={<PictureOutlined />}
              description={allDescriptions.AI?.TagMatchingPrompt}
              isMobile={isMobile}
            >
              <Input.TextArea
                rows={8}
                value={configs.AI?.TagMatchingPrompt || ""}
                onChange={(e) => {
                  const newConfigs = { ...configs };
                  if (!newConfigs.AI) newConfigs.AI = {};
                  newConfigs.AI.TagMatchingPrompt = e.target.value;
                  setConfigs(newConfigs);
                }}
                style={{ marginBottom: 16 }}
              />
              <div style={{ textAlign: 'center' }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => onBaseSaveConfig('AI', 'TagMatchingPrompt', configs.AI?.TagMatchingPrompt || '')}
                  style={{ width: isMobile ? '100%' : '240px' }}
                >
                  保存标签匹配提示词
                </Button>
              </div>
            </ConfigSection>
          </TabPane>
        </Tabs>
      )
    },
    {
      key: 'Authorization',
      label: '授权配置',
      icon: <SafetyCertificateOutlined />,
      children: (
        <Tabs defaultActiveKey="jwt" type="card" size={isMobile ? "small" : "middle"}>
          <TabPane tab="JWT 设置" key="jwt">
            <ConfigSection
              title="JWT 安全配置"
              icon={<LockOutlined />}
              description="JSON Web Token (JWT) 的安全设置，用于管理用户身份验证和授权"
              isMobile={isMobile}
            >
              <Form form={formsMap.Jwt} layout="vertical" size={isMobile ? "middle" : "large"}>
                {renderConfigFormItems(formsMap.Jwt, "Jwt", ['SecretKey', 'Issuer', 'Audience'])}
                <Divider style={{ margin: '12px 0 20px' }} />
                <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => onSaveAllForGroup(formsMap.Jwt, "Jwt", ['SecretKey', 'Issuer', 'Audience'])}
                    style={{ width: isMobile ? '100%' : '240px' }}
                  >
                    保存所有 JWT 配置
                  </Button>
                </Form.Item>
              </Form>
            </ConfigSection>
          </TabPane>
          <TabPane tab="GitHub认证" key="github">
            <ConfigSection
              title="GitHub OAuth 配置"
              icon={<GlobalOutlined />}
              description="GitHub OAuth 应用配置，用于实现第三方登录功能"
              isMobile={isMobile}
            >
              <Form form={formsMap.Authentication} layout="vertical" size={isMobile ? "middle" : "large"}>
                {renderConfigFormItems(formsMap.Authentication, "Authentication", ["GitHubClientId", "GitHubClientSecret", "GitHubCallbackUrl"])}
                <Divider style={{ margin: '12px 0 20px' }} />
                <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => onSaveAllForGroup(formsMap.Authentication, "Authentication", ["GitHubClientId", "GitHubClientSecret", "GitHubCallbackUrl"])}
                    style={{ width: isMobile ? '100%' : '240px' }}
                  >
                    保存所有 GitHub 认证配置
                  </Button>
                </Form.Item>
              </Form>
            </ConfigSection>
          </TabPane>
          <TabPane tab="LinuxDo认证" key="linuxdo">
            <ConfigSection
              title="LinuxDo OAuth 配置"
              icon={<GlobalOutlined />}
              description="LinuxDo OAuth 应用配置，用于实现第三方登录功能"
              isMobile={isMobile}
            >
              <Form form={formsMap.Authentication} layout="vertical" size={isMobile ? "middle" : "large"}>
                {renderConfigFormItems(formsMap.Authentication, "Authentication", ["LinuxDoClientId", "LinuxDoClientSecret", "LinuxDoCallbackUrl"])}
                <Divider style={{ margin: '12px 0 20px' }} />
                <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => onSaveAllForGroup(formsMap.Authentication, "Authentication", ["LinuxDoClientId", "LinuxDoClientSecret", "LinuxDoCallbackUrl"])}
                    style={{ width: isMobile ? '100%' : '240px' }}
                  >
                    保存所有 LinuxDo 认证配置
                  </Button>
                </Form.Item>
              </Form>
            </ConfigSection>
          </TabPane>
        </Tabs>
      )
    },
    {
      key: 'AppSettings',
      label: '应用设置',
      icon: <SettingOutlined />,
      children: (
        <ConfigSection
          title="应用基础设置"
          icon={<SettingOutlined />}
          description="应用程序的基本配置参数"
          isMobile={isMobile}
        >
          <Form form={formsMap.AppSettings} layout="vertical" size={isMobile ? "middle" : "large"}>
            {renderConfigFormItems(formsMap.AppSettings, "AppSettings", ['ServerUrl', 'MaxConcurrentTasks'])}
            <Divider style={{ margin: '12px 0 20px' }} />
            <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => onSaveAllForGroup(formsMap.AppSettings, "AppSettings", ['ServerUrl', 'MaxConcurrentTasks'])}
                style={{ width: isMobile ? '100%' : '240px' }}
              >
                保存所有应用设置
              </Button>
            </Form.Item>
          </Form>
        </ConfigSection>
      )
    },
    {
      key: 'Storage',
      label: '存储设置',
      icon: <CloudServerOutlined />,
      children: (
        <>
          <ConfigSection
            title="存储类型配置"
            icon={<DatabaseOutlined />}
            description="配置系统默认使用的文件存储方式"
            isMobile={isMobile}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: isMobile ? 12 : 16,
              marginBottom: 0
            }}>
              <div>
                <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#666' }}>
                  登录用户默认存储
                </div>
                <Select
                  value={configs.Storage?.DefaultStorage || 'Local'}
                  onChange={(value) => onBaseSaveConfig('Storage', 'DefaultStorage', value)}
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="选择登录用户的默认存储方式"
                  optionLabelProp="label"
                >
                  {storageOptions.map(option => (
                    <Option key={option.value} value={option.value} label={option.label}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {option.icon}
                        <span style={{ marginLeft: 8 }}>{option.label}</span>
                      </div>
                    </Option>
                  ))}
                </Select>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  {allDescriptions.Storage?.DefaultStorage}
                </div>
              </div>
              <div>
                <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#666' }}>
                  匿名用户默认存储
                </div>
                <Select
                  value={configs.Storage?.AnonymousDefaultStorage || 'Local'}
                  onChange={(value) => onBaseSaveConfig('Storage', 'AnonymousDefaultStorage', value)}
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="选择匿名用户的默认存储方式"
                  optionLabelProp="label"
                >
                  {storageOptions.map(option => (
                    <Option key={option.value} value={option.value} label={option.label}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {option.icon}
                        <span style={{ marginLeft: 8 }}>{option.label}</span>
                      </div>
                    </Option>
                  ))}
                </Select>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  {allDescriptions.Storage?.AnonymousDefaultStorage}
                </div>
              </div>
            </div>
          </ConfigSection>

          <ConfigSection
            title="上传设置配置"
            icon={<UploadOutlined />}
            description="配置文件上传处理方式和图片转换参数"
            isMobile={isMobile}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: isMobile ? 12 : 16,
              marginBottom: 0
            }}>
              <div>
                <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#666' }}>
                  默认图片格式
                </div>
                <Select
                  value={configs.Upload?.DefaultImageFormat || 'Original'}
                  onChange={(value) => onBaseSaveConfig('Upload', 'DefaultImageFormat', value)}
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="选择上传图片的默认处理格式"
                  optionLabelProp="label"
                >
                  {imageFormatOptions.map(option => (
                    <Option key={option.value} value={option.value} label={option.label}>
                      <div>
                        <div>{option.label}</div>
                        <div style={{ fontSize: '12px', color: '#999' }}>{option.description}</div>
                      </div>
                    </Option>
                  ))}
                </Select>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  {allDescriptions.Upload?.DefaultImageFormat}
                </div>
              </div>
              <div>
                <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#666' }}>
                  默认压缩质量
                </div>
                <Select
                  value={configs.Upload?.DefaultImageQuality || '95'}
                  onChange={(value) => onBaseSaveConfig('Upload', 'DefaultImageQuality', value)}
                  style={{ width: '100%' }}
                  size="large"
                  placeholder="选择图片压缩质量"
                  optionLabelProp="label"
                >
                  {imageQualityOptions.map(option => (
                    <Option key={option.value} value={option.value} label={option.label}>
                      <div>
                        <div>{option.label}</div>
                        <div style={{ fontSize: '12px', color: '#999' }}>{option.description}</div>
                      </div>
                    </Option>
                  ))}
                </Select>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  {allDescriptions.Upload?.DefaultImageQuality}
                </div>
              </div>
            </div>
          </ConfigSection>

          <ConfigSection
            title="存储服务配置"
            icon={<CloudServerOutlined />}
            description="配置各种外部存储服务的连接参数"
            isMobile={isMobile}
          >
            <div style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#666' }}>
                选择要配置的存储服务
              </div>
              <Select
                value={storageType}
                onChange={onStorageTypeChange}
                style={{ width: isMobile ? '100%' : '300px' }}
                size="large"
                placeholder="选择需要配置的存储服务类型"
                optionLabelProp="label"
              >
                {storageOptions.map(option => (
                  <Option key={option.value} value={option.value} label={option.label}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {option.icon}
                      <span style={{ marginLeft: 8 }}>{option.label}</span>
                    </div>
                  </Option>
                ))}
              </Select>
              <div style={{ fontSize: 12, color: '#999', marginTop: 4, marginBottom: 16 }}>
                选择后将显示对应存储服务的详细配置选项
              </div>
            </div>

            <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, padding: isMobile ? 12 : 16, backgroundColor: '#fafafa' }}>
              {storageType === 'Local' && (
                <div style={{ textAlign: 'center', color: '#999', padding: '30px 0' }}>
                  <DatabaseOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 16 }} />
                  <Title level={5}>本地存储无需额外配置</Title>
                  <Paragraph type="secondary">文件将直接存储在服务器的本地文件系统中</Paragraph>
                </div>
              )}
              {storageType === 'Telegram' && (
                <Form form={formsMap.TelegramStorage} layout="vertical" size={isMobile ? "middle" : "large"}>
                  {renderConfigFormItems(formsMap.TelegramStorage, "Storage", ["TelegramStorageBotToken", "TelegramStorageChatId", "TelegramProxyAddress", "TelegramProxyPort", "TelegramProxyUsername", "TelegramProxyPassword"])}
                  <Divider style={{ margin: '12px 0 20px' }} />
                  <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={() => onSaveAllForGroup(formsMap.TelegramStorage, "Storage", ["TelegramStorageBotToken", "TelegramStorageChatId", "TelegramProxyAddress", "TelegramProxyPort", "TelegramProxyUsername", "TelegramProxyPassword"])}
                      style={{ width: isMobile ? '100%' : '240px' }}
                    >
                      保存所有 Telegram 配置
                    </Button>
                  </Form.Item>
                </Form>
              )}
              {storageType === 'S3' && (
                <Form form={formsMap.S3Storage} layout="vertical" size={isMobile ? "middle" : "large"}>
                  {renderConfigFormItems(formsMap.S3Storage, "Storage", ["S3StorageAccessKey", "S3StorageSecretKey", "S3StorageBucketName", "S3StorageRegion", "S3StorageEndpoint", "S3StorageCdnUrl", "S3StorageUsePathStyleUrls"])}
                  <Divider style={{ margin: '12px 0 20px' }} />
                  <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={() => onSaveAllForGroup(formsMap.S3Storage, "Storage", ["S3StorageAccessKey", "S3StorageSecretKey", "S3StorageBucketName", "S3StorageRegion", "S3StorageEndpoint", "S3StorageCdnUrl", "S3StorageUsePathStyleUrls"])}
                      style={{ width: isMobile ? '100%' : '240px' }}
                    >
                      保存所有 S3 配置
                    </Button>
                  </Form.Item>
                </Form>
              )}
              {storageType === 'Cos' && (
                <Form form={formsMap.CosStorage} layout="vertical" size={isMobile ? "middle" : "large"}>
                  {renderConfigFormItems(formsMap.CosStorage, "Storage", ["CosStorageSecretId", "CosStorageSecretKey", "CosStorageToken", "CosStorageBucketName", "CosStorageRegion", "CosStorageCdnUrl"])}
                  <Divider style={{ margin: '12px 0 20px' }} />
                  <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={() => onSaveAllForGroup(formsMap.CosStorage, "Storage", ["CosStorageSecretId", "CosStorageSecretKey", "CosStorageToken", "CosStorageBucketName", "CosStorageRegion", "CosStorageCdnUrl"])}
                      style={{ width: isMobile ? '100%' : '240px' }}
                    >
                      保存所有 COS 配置
                    </Button>
                  </Form.Item>
                </Form>
              )}
              {storageType === 'WebDAV' && (
                <Form form={formsMap.WebDAVStorage} layout="vertical" size={isMobile ? "middle" : "large"}>
                  {renderConfigFormItems(formsMap.WebDAVStorage, "Storage", ["WebDAVServerUrl", "WebDAVUserName", "WebDAVPassword", "WebDAVBasePath", "WebDAVPublicUrl"])}
                  <Divider style={{ margin: '12px 0 20px' }} />
                  <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={() => onSaveAllForGroup(formsMap.WebDAVStorage, "Storage", ["WebDAVServerUrl", "WebDAVUserName", "WebDAVPassword", "WebDAVBasePath", "WebDAVPublicUrl"])}
                      style={{ width: isMobile ? '100%' : '240px' }}
                    >
                      保存所有 WebDAV 配置
                    </Button>
                  </Form.Item>
                </Form>
              )}
            </div>
          </ConfigSection>
        </>
      )
    },
    {
      key: 'VectorDb',
      label: '向量数据',
      icon: <DatabaseOutlined />,
      children: (
        <VectorDbConfig isMobile={isMobile} />
      )
    }
  ];

  return (
    <Tabs
      activeKey={activeKey}
      onChange={onTabChange}
      size={isMobile ? "small" : "middle"}
      tabPosition={isMobile ? "top" : "left"}
      style={{
        minHeight: isMobile ? 'auto' : 400
      }}
      items={tabItems.map(item => ({
        key: item.key,
        label: (
          <Space>
            {item.icon}
            <span>{item.label}</span>
          </Space>
        ),
        children: item.children
      }))}
    />
  );
};

export default ConfigTabs;
