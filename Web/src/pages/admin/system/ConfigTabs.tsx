import React from 'react';
import { Tabs, Form, Input, Button, Space, Divider, Slider, InputNumber } from 'antd'; // InputNumber added
import {
  ApiOutlined, RocketOutlined, PictureOutlined, SaveOutlined,
  SafetyCertificateOutlined, LockOutlined, GlobalOutlined, SettingOutlined,
  DatabaseOutlined, UploadOutlined
} from '@ant-design/icons';
import ConfigFormItem from './ConfigFormItem';
import ConfigSection from './ConfigSection';
import VectorDbConfig from './VectorDbConfig';

const { TabPane } = Tabs;
// const { Option } = Select; // Removed

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
  formsMap: Record<string, any>;
  allDescriptions: Record<string, Record<string, string>>;
  onSaveSingleConfig: (formInstance: any, groupName: string, key: string) => Promise<void>;
  onSaveAllForGroup: (formInstance: any, groupName: string, itemKeys: string[]) => Promise<void>;
  onBaseSaveConfig: (group: string, key: string, value: string) => Promise<boolean>;
  setConfigs: React.Dispatch<React.SetStateAction<ConfigStructure>>;
  // imageQualityOptions: Array<{ value: string; label: string; description: string; }>; // Removed
}

const ConfigTabs: React.FC<ConfigTabsProps> = ({
  configs,
  secretFields,
  isMobile,
  activeKey,
  onTabChange,
  formsMap,
  allDescriptions,
  onSaveSingleConfig,
  onSaveAllForGroup,
  onBaseSaveConfig,
  setConfigs,
  // imageQualityOptions, // Removed
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
          <TabPane tab="人脸识别" key="facerecognition">
            <ConfigSection
              title="人脸识别服务配置"
              icon={<ApiOutlined />}
              description="配置人脸识别API服务的基本参数"
              isMobile={isMobile}
            >
              <Form form={formsMap.FaceRecognition} layout="vertical" size={isMobile ? "middle" : "large"}>
                {renderConfigFormItems(formsMap.FaceRecognition, "FaceRecognition", ['ApiEndpoint', 'ApiKey'])}
                <Divider style={{ margin: '12px 0 20px' }} />
                <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={() => onSaveAllForGroup(formsMap.FaceRecognition, "FaceRecognition", ['ApiEndpoint', 'ApiKey'])}
                    style={{ width: isMobile ? '100%' : '240px' }}
                  >
                    保存所有人脸识别配置
                  </Button>
                </Form.Item>
              </Form>
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
            {renderConfigFormItems(formsMap.AppSettings, "AppSettings", ['ServerUrl', 'MaxConcurrentTasks', 'EnableRegistration', 'EnableAnonymousImageHosting'])}
            <Divider style={{ margin: '12px 0 20px' }} />
            <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => onSaveAllForGroup(formsMap.AppSettings, "AppSettings", ['ServerUrl', 'MaxConcurrentTasks', 'EnableRegistration', 'EnableAnonymousImageHosting'])}
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
      key: 'Upload',
      label: '上传设置',
      icon: <UploadOutlined />,
      children: (
        <>
          <ConfigSection
            title="上传参数配置"
            icon={<UploadOutlined />}
            description="配置文件上传处理方式和图片转换参数"
            isMobile={isMobile}
          >
            <Form form={formsMap.Upload} layout="vertical" size={isMobile ? "middle" : "large"}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: isMobile ? 20 : 24,
                marginBottom: 0
              }}>
                <Form.Item
                  name="ThumbnailMaxWidth"
                  label={
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>
                      缩略图最大宽度 (px)
                    </div>
                  }
                  help={<div style={{ fontSize: 12, color: '#999', marginTop: 0 }}>{allDescriptions.Upload?.ThumbnailMaxWidth}</div>}
                  initialValue={parseInt(configs.Upload?.ThumbnailMaxWidth || '400', 10)}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber
                    min={100}
                    max={1000}
                    step={50}
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Form.Item
                  name="ThumbnailCompressionQuality"
                  label={
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>
                      缩略图压缩质量
                    </div>
                  }
                  help={<div style={{ fontSize: 12, color: '#999', marginTop: isMobile ? 8 : 16, textAlign: 'center' }}>{allDescriptions.Upload?.ThumbnailCompressionQuality}</div>}
                  initialValue={parseInt(configs.Upload?.ThumbnailCompressionQuality || '75', 10)}
                  style={{ marginBottom: 0 }}
                >
                  <Slider
                    min={30}
                    max={90}
                    step={5}
                    style={{ margin: isMobile ? '0 5px' : '0 10px' }}
                    tooltip={{
                      formatter: value => `${value}%`
                    }}
                    marks={{
                      30: '30%',
                      60: '60%',
                      90: '90%'
                    }}
                  />
                </Form.Item>

                <Form.Item
                  name="HighQualityImageCompressionQuality"
                  label={
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#666' }}>
                      高清图片压缩质量
                    </div>
                  }
                  help={<div style={{ fontSize: 12, color: '#999', marginTop: isMobile ? 8 : 16, textAlign: 'center' }}>{allDescriptions.Upload?.HighQualityImageCompressionQuality}</div>}
                  initialValue={parseInt(configs.Upload?.HighQualityImageCompressionQuality || '95', 10)}
                  style={{ marginBottom: 0 }}
                >
                  <Slider
                    min={50}
                    max={100}
                    step={5}
                    style={{ margin: isMobile ? '0 5px' : '0 10px' }}
                    tooltip={{
                      formatter: value => `${value}%`
                    }}
                    marks={{
                      50: '50%',
                      75: '75%',
                      100: '100%'
                    }}
                  />
                </Form.Item>
              </div>
              <Divider style={{ margin: '24px 0 20px' }} />
              <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => onSaveAllForGroup(formsMap.Upload, "Upload", ['ThumbnailMaxWidth', 'ThumbnailCompressionQuality', 'HighQualityImageCompressionQuality'])}
                  style={{ width: isMobile ? '100%' : '240px' }}
                >
                  保存所有上传设置
                </Button>
              </Form.Item>
            </Form>
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
