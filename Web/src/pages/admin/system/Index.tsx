import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, message, Spin, Button, Upload, Modal, Space, Tooltip, Form, Typography, notification } from 'antd';
import {
  CloudOutlined, DatabaseOutlined, CloudServerOutlined, GlobalOutlined,
  DownloadOutlined, UploadOutlined, QuestionCircleOutlined,
  SettingOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { getAllConfigs, setConfig, backupConfigs, restoreConfigs } from '../../../api';
import useIsMobile from '../../../hooks/useIsMobile.ts';
import ConfigTabs from './ConfigTabs';

const { Text, Paragraph } = Typography;

interface ConfigStructure {
  [key: string]: {
    [key: string]: string;
  };
}


const allDescriptions: Record<string, Record<string, string>> = {
  AI: {
    ApiEndpoint: 'AI 服务的API端点地址',
    ApiKey: 'AI 服务的API密钥',
    Model: 'AI 模型名称',
    EmbeddingModel: '嵌入向量模型名称',
    ImageAnalysisPrompt: '用于分析图片内容并提取描述的提示词。请确保提示词包含返回JSON格式的指示，并且要求返回标题(title)和描述(description)字段。',
    TagGenerationPrompt: '用于从图片内容生成标签的提示词。请确保提示词包含返回JSON格式的指示，并且要求返回tags数组字段。',
    TagMatchingPrompt: '用于将描述内容与已有标签进行匹配的提示词。请确保提示词包含{\'{tagsText}\'}和{\'{description}\'}占位符，系统将会用实际的标签列表和描述内容替换这些占位符。'
  },
  Jwt: {
    SecretKey: 'JWT 加密密钥',
    Issuer: 'JWT 签发者',
    Audience: 'JWT 接收者',
  },
  Authentication: {
    GitHubClientId: 'GitHub OAuth 应用客户端ID',
    GitHubClientSecret: 'GitHub OAuth 应用客户端密钥',
    GitHubCallbackUrl: 'GitHub OAuth 认证回调地址',
    LinuxDoClientId: 'LinuxDo OAuth 应用客户端ID',
    LinuxDoClientSecret: 'LinuxDo OAuth 应用客户端密钥',
    LinuxDoCallbackUrl: 'LinuxDo OAuth 认证回调地址'
  },
  AppSettings: {
    ServerUrl: '服务器URL',
    MaxConcurrentTasks: '后台任务最大并发处理数量 (例如: 图像分析、标签生成等)'
  },
  Storage: {
    DefaultStorage: '已登录用户上传文件时的默认存储位置',
    AnonymousDefaultStorage: '未登录用户上传文件时的默认存储位置',
    TelegramStorageBotToken: 'Telegram 机器人令牌',
    TelegramStorageChatId: 'Telegram 聊天ID',
    TelegramProxyAddress: '代理服务器地址 (例如: 127.0.0.1)',
    TelegramProxyPort: '代理服务器端口 (例如: 1080)',
    TelegramProxyUsername: '代理用户名 (可选)',
    TelegramProxyPassword: '代理密码 (可选)',
    S3StorageAccessKey: 'S3访问密钥',
    S3StorageSecretKey: 'S3私有密钥',
    S3StorageBucketName: 'S3存储桶名称',
    S3StorageRegion: 'S3区域 (例如:us-east-1)',
    S3StorageEndpoint: 'S3端点URL (可选,默认为AWS S3)',
    S3StorageCdnUrl: 'CDN URL (可选,用于加速文件访问)',
    S3StorageUsePathStyleUrls: '使用路径形式URLs (true/false,兼容非AWS服务)',
    CosStorageSecretId: '腾讯云COS密钥ID',
    CosStorageSecretKey: '腾讯云COS私有密钥',
    CosStorageToken: '腾讯云COS临时令牌(可选)',
    CosStorageBucketName: 'COS存储桶名称',
    CosStorageRegion: 'COS区域 (例如:ap-shanghai)',
    CosStorageCdnUrl: 'CDN URL (可选,用于加速文件访问)',
    WebDAVServerUrl: 'WebDAV 服务器 URL (例如: https://dav.example.com)',
    WebDAVUserName: 'WebDAV 用户名',
    WebDAVPassword: 'WebDAV 密码',
    WebDAVBasePath: 'WebDAV 基础路径 (例如: files/upload)',
    WebDAVPublicUrl: 'WebDAV 公共访问 URL (可选,用于文件访问)',
  },
  Upload: {
    DefaultImageFormat: '上传图片时的默认处理格式，选择合适的格式可以优化存储和显示',
    DefaultImageQuality: '适用于JPEG和WebP格式的图片质量设置，越高图片质量越好但文件越大'
  }
};


const System: React.FC = () => {
  const isMobile = useIsMobile();
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<ConfigStructure>({});
  const [activeKey, setActiveKey] = useState('AI');
  const [storageType, setStorageType] = useState('Telegram');
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreModalVisible, setRestoreModalVisible] = useState(false);
  const [restoreConfig, setRestoreConfig] = useState<Record<string, string> | null>(null);
  const [secretFields, setSecretFields] = useState<Record<string, string[]>>({});
  const [, setSavingFields] = useState<Set<string>>(new Set()); // 保留用于 baseSaveConfig

  const debounceTimerRef = useRef<number | null>(null);

  const [aiForm] = Form.useForm();
  const [jwtForm] = Form.useForm();
  const [authForm] = Form.useForm();
  const [appSettingsForm] = Form.useForm();
  const [telegramForm] = Form.useForm();
  const [s3Form] = Form.useForm();
  const [cosForm] = Form.useForm();
  const [webDAVForm] = Form.useForm();
  const [uploadForm] = Form.useForm();

  const formsMap: Record<string, any> = {
    AI: aiForm,
    Jwt: jwtForm,
    Authentication: authForm,
    AppSettings: appSettingsForm,
    TelegramStorage: telegramForm,
    S3Storage: s3Form,
    CosStorage: cosForm,
    WebDAVStorage: webDAVForm,
    Upload: uploadForm,
  };

  // 获取所有配置项
  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await getAllConfigs();
      if (response.success && response.data) {
        const configGroups: ConfigStructure = {};
        const secretFieldsMap: Record<string, string[]> = {};

        response.data.forEach(config => {
          const [group, key] = config.key.split(':');
          if (!configGroups[group]) {
            configGroups[group] = {};
          }
          configGroups[group][key] = config.value;

          if (config.isSecret) {
            if (!secretFieldsMap[group]) {
              secretFieldsMap[group] = [];
            }
            secretFieldsMap[group].push(key);
          }
        });

        setConfigs(configGroups);
        setSecretFields(secretFieldsMap);

        if (configGroups.Storage?.DefaultStorage) {
          setStorageType(configGroups.Storage.DefaultStorage);
        }

        // 更高效地更新表单值
        Object.keys(configGroups).forEach(group => {
          let formInstanceKey = group;
          if (group === "Storage") {
          } else if (group.endsWith("Storage") && formsMap[group]) {
            formInstanceKey = group;
          }


          const formInstance = formsMap[formInstanceKey] || (group === "Storage" ? formsMap[`${configGroups.Storage.DefaultStorage}Storage`] : null);

          if (formInstance) {
            const initialGroupValues: Record<string, string> = {};
            Object.keys(configGroups[group]).forEach(key => {
              if (!secretFieldsMap[group]?.includes(key)) {
                initialGroupValues[key] = configGroups[group][key];
              } else {
                initialGroupValues[key] = ''; 
              }
            });
            formInstance.setFieldsValue(initialGroupValues);
          }
        });
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

  // 自定义防抖函数实现
  const debounce = useCallback((fn: Function, delay: number) => {
    return (...args: any[]) => {
      // 清除之前的定时器
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      // 设置新的定时器
      debounceTimerRef.current = window.setTimeout(() => {
        fn(...args);
        debounceTimerRef.current = null;
      }, delay);
    };
  }, []);

  // 保存配置项 (Core API call) - 添加防抖功能和更好的状态管理
  const baseSaveConfig = async (group: string, key: string, value: string) => {
    const configKey = `${group}:${key}`;
    setSavingFields(prev => new Set(prev).add(configKey));

    try {
      const response = await setConfig({
        key: configKey,
        value: value,
        description: `${group} ${key} setting`
      });

      if (response.success) {
        notification.success({
          message: '保存成功',
          description: `${key} 配置已更新`,
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
          placement: 'bottomRight',
          duration: 3,
        });

        setConfigs(prev => {
          const newConfigs = { ...prev };
          if (!newConfigs[group]) newConfigs[group] = {};
          newConfigs[group][key] = value;
          return newConfigs;
        });
        return true;
      } else {
        notification.error({
          message: '保存失败',
          description: `${key}: ${response.message}`,
          placement: 'bottomRight',
          duration: 4,
        });
        return false;
      }
    } catch (error) {
      notification.error({
        message: '系统错误',
        description: `保存 ${key} 配置时发生错误`,
        placement: 'bottomRight',
        duration: 4,
      });
      console.error(error);
      return false;
    } finally {
      setSavingFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(configKey);
        return newSet;
      });
    }
  };

  const handleSaveSingleConfig = async (formInstance: any, groupName: string, key: string) => {
    try {
      await formInstance.validateFields([key]);
      const value = formInstance.getFieldValue(key);
      const isSecret = secretFields[groupName]?.includes(key);

      if (isSecret && (value === '' || value === undefined)) {
        message.info(`未输入 ${key} 的新值，不作更改。`);
        return;
      }

      // 使用自定义防抖函数包装保存操作
      debounce((g: string, k: string, v: string) => {
        baseSaveConfig(g, k, v);
      }, 300)(groupName, key, value);

      if (isSecret) {
        formInstance.setFieldsValue({ [key]: '' });
      }
    } catch (errorInfo) {
      console.error(`保存配置 ${groupName}:${key} 失败:`, errorInfo);
    }
  };

  const handleSaveAllForGroup = async (formInstance: any, groupName: string, itemKeys: string[]) => {
    try {
      await formInstance.validateFields(itemKeys);
      const values = formInstance.getFieldsValue(itemKeys);
      let changesMade = false;
      let successCount = 0;
      let totalToSave = 0;

      // 计算需要保存的总数
      for (const key of itemKeys) {
        const value = values[key];
        const isSecret = secretFields[groupName]?.includes(key);
        if (!(isSecret && (value === '' || value === undefined)) &&
          (isSecret || configs[groupName]?.[key] !== value)) {
          totalToSave++;
        }
      }

      if (totalToSave === 0) {
        message.info(`${groupName} 中没有需要更新的配置。`);
        return;
      }

      // 显示批量保存开始通知
      notification.open({
        key: `saving-${groupName}`,
        message: `正在保存 ${groupName} 配置`,
        description: `正在处理 ${totalToSave} 项配置...`,
        icon: <Spin size="small" />,
        duration: 0,
      });

      for (const key of itemKeys) {
        const value = values[key];
        const isSecret = secretFields[groupName]?.includes(key);

        if (isSecret && (value === '' || value === undefined)) {
          continue;
        }

        if (!isSecret && configs[groupName]?.[key] === value) {
          continue;
        }

        const success = await baseSaveConfig(groupName, key, value);
        if (success) {
          changesMade = true;
          successCount++;
          if (isSecret) {
            formInstance.setFieldsValue({ [key]: '' });
          }
        }
      }

      // 更新或关闭批量保存通知
      if (changesMade) {
        notification.success({
          key: `saving-${groupName}`,
          message: `${groupName} 配置已更新`,
          description: `成功保存了 ${successCount} 项配置`,
          icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
          duration: 3,
        });
      } else {
        notification.destroy(`saving-${groupName}`);
        message.info(`${groupName} 中没有配置被更改。`);
      }
    } catch (errorInfo) {
      notification.destroy(`saving-${groupName}`);
      console.error(`保存 ${groupName} 所有配置失败:`, errorInfo);
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

        notification.success({
          message: '备份成功',
          description: '配置备份文件已下载到您的设备',
          placement: 'bottomRight',
          duration: 3,
        });
      } else {
        notification.error({
          message: '备份失败',
          description: response.message || '无法生成备份文件',
          placement: 'bottomRight',
        });
      }
    } catch (error) {
      notification.error({
        message: '系统错误',
        description: '备份配置时发生错误',
        placement: 'bottomRight',
      });
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
        notification.error({
          message: '文件格式错误',
          description: '无法解析上传的配置文件，请确认是有效的JSON格式',
          placement: 'bottomRight',
        });
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
        notification.success({
          message: '恢复成功',
          description: '配置已成功恢复，页面将在3秒后刷新',
          placement: 'bottomRight',
          duration: 3,
        });
        setRestoreModalVisible(false);

        // 重新加载配置
        setTimeout(() => {
          fetchConfigs();
        }, 3000);
      } else {
        notification.error({
          message: '恢复失败',
          description: response.message || '无法应用配置',
          placement: 'bottomRight',
        });
      }
    } catch (error) {
      notification.error({
        message: '系统错误',
        description: '恢复配置时发生错误',
        placement: 'bottomRight',
      });
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

  // 上传格式选项
  const imageFormatOptions = [
    { value: 'Original', label: '保持原始格式', description: '不改变原始图片格式' },
    { value: 'Jpeg', label: '转换为JPEG', description: '适合照片，文件较小但有损压缩' },
    { value: 'Png', label: '转换为PNG', description: '适合图形，无损但文件较大' },
    { value: 'Webp', label: '转换为WebP', description: '现代格式，体积小且质量好' },
  ];

  // 图片质量选项
  const imageQualityOptions = [
    { value: '100', label: '100% - 最高质量', description: '无损压缩，文件较大' },
    { value: '95', label: '95% - 高质量', description: '几乎无损，推荐用于高质量需求' },
    { value: '90', label: '90% - 优质', description: '良好平衡，推荐一般用途' },
    { value: '85', label: '85% - 良好', description: '适合网页展示，节省空间' },
    { value: '80', label: '80% - 节省空间', description: '明显压缩但质量可接受' },
    { value: '75', label: '75% - 平衡', description: '显著减小文件大小' },
    { value: '70', label: '70% - 压缩', description: '最大压缩，质量较低' },
  ];

  useEffect(() => {
    fetchConfigs();
  }, []);

  return (
    <Card
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <SettingOutlined />
            <span>系统配置</span>
          </Space>
          <Space>
            <Tooltip title="下载当前所有配置的备份">
              <Button
                icon={<DownloadOutlined />}
                onClick={handleBackupConfigs}
                loading={backupLoading}
                size={isMobile ? "small" : "middle"}
                type="primary"
                ghost
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
                  type={isMobile ? "primary" : "default"}
                  ghost={isMobile}
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
        padding: isMobile ? '12px 8px' : '24px',
        transition: 'all 0.3s'
      }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <Spin size="large" tip="加载系统配置中..." />
        </div>
      ) : (
        <ConfigTabs
          configs={configs}
          secretFields={secretFields}
          isMobile={isMobile}
          activeKey={activeKey}
          onTabChange={setActiveKey}
          storageType={storageType}
          onStorageTypeChange={setStorageType}
          formsMap={formsMap}
          allDescriptions={allDescriptions}
          onSaveSingleConfig={handleSaveSingleConfig}
          onSaveAllForGroup={handleSaveAllForGroup}
          onBaseSaveConfig={baseSaveConfig}
          setConfigs={setConfigs}
          storageOptions={storageOptions}
          imageFormatOptions={imageFormatOptions}
          imageQualityOptions={imageQualityOptions}
        />
      )}

      {/* 恢复配置确认对话框 */}
      <Modal
        title={
          <Space>
            <UploadOutlined />
            <span>确认恢复配置</span>
            <Tooltip title="恢复配置将覆盖当前所有配置设置，请确认备份文件正确无误">
              <QuestionCircleOutlined style={{ cursor: 'help' }} />
            </Tooltip>
          </Space>
        }
        open={restoreModalVisible}
        onCancel={() => setRestoreModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setRestoreModalVisible(false)}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            loading={restoreLoading}
            onClick={handleRestoreConfigs}
          >
            确认恢复
          </Button>
        ]}
        width={500}
        maskClosable={false}
      >
        <div style={{ padding: '16px 0' }}>
          <Paragraph>
            <Text strong>您确定要从上传的备份文件恢复配置吗？</Text>
          </Paragraph>
          <Paragraph type="danger" style={{ fontWeight: 'bold' }}>
            警告：此操作将覆盖当前系统中的所有配置设置！
          </Paragraph>
          {restoreConfig && (
            <div style={{
              background: '#f6f6f6',
              padding: '10px 16px',
              borderRadius: 4,
              marginTop: 16
            }}>
              <Paragraph>备份文件包含 <Text strong>{Object.keys(restoreConfig).length}</Text> 条配置项</Paragraph>
              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                恢复后可能需要重启应用才能使所有配置生效
              </Paragraph>
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
};

export default System;
