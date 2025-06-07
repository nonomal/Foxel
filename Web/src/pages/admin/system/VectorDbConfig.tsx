import React, { useState, useEffect } from 'react';
import { Card, Radio, Button, message, Spin, Space, Typography, notification, Form, Input, Modal } from 'antd';
import { DatabaseOutlined, SyncOutlined, CheckCircleOutlined, InfoCircleOutlined, SaveOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { getCurrentVectorDb, switchVectorDb, setConfig, clearVectors, rebuildVectors } from '../../../api';
import { VectorDbType } from '../../../api';

const { Title, Paragraph } = Typography;

interface VectorDbConfigProps {
    isMobile: boolean;
}

const VectorDbConfig: React.FC<VectorDbConfigProps> = ({ isMobile }) => {
    const [loading, setLoading] = useState(true);
    const [switching, setSwitching] = useState(false);
    const [saving, setSaving] = useState(false);
    const [clearing, setClearing] = useState(false);
    const [rebuilding, setRebuilding] = useState(false);
    const [currentType, setCurrentType] = useState<string>('');
    const [selectedType, setSelectedType] = useState<VectorDbType>(VectorDbType.Qdrant);
    const [qdrantConfig, setQdrantConfig] = useState({
        host: '',
        apiKey: ''
    });
    const [form] = Form.useForm();

    const fetchCurrentVectorDb = async () => {
        setLoading(true);
        try {
            const response = await getCurrentVectorDb();
            if (response.success && response.data) {
                setCurrentType(response.data.type);
                setSelectedType(response.data.type as VectorDbType);
                
                // 安全地访问配置值
                if (response.data && response.data.type) {
                    // 使用可选链和类型断言来安全地访问配置
                    const config = (response.data as any).config;
                    if (config) {
                        setQdrantConfig({
                            host: config.QdrantHost || '',
                            apiKey: config.QdrantApiKey || ''
                        });
                        form.setFieldsValue({
                            QdrantHost: config.QdrantHost || '',
                            QdrantApiKey: '' // 不显示API密钥的值
                        });
                    }
                }
            } else {
                message.error('获取当前向量数据库失败: ' + response.message);
            }
        } catch (error) {
            console.error('获取当前向量数据库出错:', error);
            message.error('获取当前向量数据库出错');
        } finally {
            setLoading(false);
        }
    };

    const handleSwitchVectorDb = async () => {
        if (selectedType === currentType) {
            message.info('当前已经是该向量数据库类型');
            return;
        }

        setSwitching(true);
        try {
            const response = await switchVectorDb(selectedType);
            if (response.success) {
                notification.success({
                    message: '切换成功',
                    description: `已成功切换到 ${selectedType} 向量数据库`,
                    icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                });
                setCurrentType(selectedType);
            } else {
                notification.error({
                    message: '切换失败',
                    description: response.message,
                });
            }
        } catch (error) {
            console.error('切换向量数据库出错:', error);
            notification.error({
                message: '切换出错',
                description: '切换向量数据库时发生错误',
            });
        } finally {
            setSwitching(false);
        }
    };

    const saveQdrantConfig = async () => {
        try {
            await form.validateFields();
            const values = form.getFieldsValue();
            setSaving(true);

            const saveHost = async () => {
                if (values.QdrantHost && values.QdrantHost !== qdrantConfig.host) {
                    const response = await setConfig({
                        key: 'VectorDb:QdrantHost',
                        value: values.QdrantHost,
                        description: 'Qdrant服务器地址'
                    });
                    if (!response.success) {
                        throw new Error('保存Qdrant主机地址失败');
                    }
                    return true;
                }
                return false;
            };

            const saveApiKey = async () => {
                if (values.QdrantApiKey) {
                    const response = await setConfig({
                        key: 'VectorDb:QdrantApiKey',
                        value: values.QdrantApiKey,
                        description: 'Qdrant API密钥'
                    });
                    if (!response.success) {
                        throw new Error('保存Qdrant API密钥失败');
                    }
                    return true;
                }
                return false;
            };

            const hostSaved = await saveHost();
            const apiKeySaved = await saveApiKey();

            if (hostSaved || apiKeySaved) {
                notification.success({
                    message: 'Qdrant配置已保存',
                    description: '向量数据库配置更新成功',
                    icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                });
                
                // 更新本地状态
                if (hostSaved) {
                    setQdrantConfig(prev => ({...prev, host: values.QdrantHost}));
                }
                if (apiKeySaved) {
                    setQdrantConfig(prev => ({...prev, apiKey: values.QdrantApiKey}));
                    form.setFieldsValue({QdrantApiKey: ''});
                }
            } else {
                message.info('没有配置被更改');
            }
        } catch (error) {
            notification.error({
                message: '保存失败',
                description: error instanceof Error ? error.message : '保存Qdrant配置时发生错误',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleClearVectors = () => {
        Modal.confirm({
            title: '确认清空向量数据库',
            content: '此操作将清空所有向量数据，不可恢复。确定要继续吗？',
            okText: '确认清空',
            okType: 'danger',
            cancelText: '取消',
            onOk: async () => {
                setClearing(true);
                try {
                    const response = await clearVectors();
                    if (response.success) {
                        notification.success({
                            message: '清空成功',
                            description: '已成功清空向量数据库',
                            icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                        });
                    } else {
                        notification.error({
                            message: '清空失败',
                            description: response.message,
                        });
                    }
                } catch (error) {
                    console.error('清空向量数据库出错:', error);
                    notification.error({
                        message: '操作出错',
                        description: '清空向量数据库时发生错误',
                    });
                } finally {
                    setClearing(false);
                }
            }
        });
    };

    const handleRebuildVectors = () => {
        Modal.confirm({
            title: '确认重建向量数据库',
            content: '此操作将重新构建所有向量数据，可能需要较长时间。确定要继续吗？',
            okText: '确认重建',
            okType: 'primary',
            cancelText: '取消',
            onOk: async () => {
                setRebuilding(true);
                try {
                    const response = await rebuildVectors();
                    if (response.success) {
                        notification.success({
                            message: '重建已开始',
                            description: '向量数据库重建过程已开始，请耐心等待完成',
                            icon: <SyncOutlined spin style={{ color: '#1890ff' }} />,
                            duration: 5,
                        });
                    } else {
                        notification.error({
                            message: '重建失败',
                            description: response.message,
                        });
                    }
                } catch (error) {
                    console.error('重建向量数据库出错:', error);
                    notification.error({
                        message: '操作出错',
                        description: '重建向量数据库时发生错误',
                    });
                } finally {
                    setRebuilding(false);
                }
            }
        });
    };

    useEffect(() => {
        fetchCurrentVectorDb();
    }, []);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" tip="加载向量数据库配置..." />
            </div>
        );
    }

    return (
        <Card
            title={
                <Space>
                    <DatabaseOutlined />
                    <span>向量数据库配置</span>
                </Space>
            }
            style={{ marginBottom: 16 }}
            bodyStyle={{ padding: isMobile ? '16px 12px' : '20px 16px' }}
        >
            <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                <InfoCircleOutlined style={{ marginRight: 8 }} />
                选择用于存储和查询向量数据的数据库类型。切换后，系统会自动迁移现有向量数据。
            </Paragraph>

            <div style={{ marginBottom: 24 }}>
                <Title level={5}>当前向量数据库: {currentType}</Title>
            </div>

            <div style={{ marginBottom: 24 }}>
                <Radio.Group
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    optionType="button"
                    buttonStyle="solid"
                    size="large"
                    style={{ marginBottom: 16 }}
                >
                    <Radio.Button value={VectorDbType.InMemory}>
                        <Space>
                            <DatabaseOutlined />
                            <span>InMemory</span>
                        </Space>
                    </Radio.Button>
                    <Radio.Button value={VectorDbType.Qdrant}>
                        <Space>
                            <DatabaseOutlined />
                            <span>Qdrant</span>
                        </Space>
                    </Radio.Button>
                </Radio.Group>

                <div style={{ marginTop: 8 }}>
                    <Button
                        type="primary"
                        icon={<SyncOutlined />}
                        loading={switching}
                        onClick={handleSwitchVectorDb}
                        disabled={selectedType === currentType}
                    >
                        切换到 {selectedType}
                    </Button>
                    {selectedType === currentType && (
                        <span style={{ marginLeft: 8, color: '#52c41a' }}>
                            <CheckCircleOutlined /> 当前已启用
                        </span>
                    )}
                </div>
            </div>

            {selectedType === VectorDbType.Qdrant && (
                <div style={{ marginBottom: 24, border: '1px solid #f0f0f0', borderRadius: 6, padding: 16, backgroundColor: '#fafafa' }}>
                    <Title level={5}>Qdrant 配置</Title>
                    <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                        配置Qdrant服务器的连接信息。这些设置将影响向量搜索功能。
                    </Paragraph>
                    
                    <Form
                        form={form}
                        layout="vertical"
                        initialValues={{
                            QdrantHost: qdrantConfig.host,
                            QdrantApiKey: ''
                        }}
                    >
                        <Form.Item
                            name="QdrantHost"
                            label="Qdrant 主机地址"
                            rules={[{ required: true, message: '请输入Qdrant服务器地址' }]}
                            tooltip="Qdrant服务器的完整URL，例如：https://example.qdrant.io"
                        >
                            <Input placeholder="例如: your-instance.qdrant.io" />
                        </Form.Item>
                        
                        <Form.Item
                            name="QdrantApiKey"
                            label="Qdrant API密钥"
                            tooltip="访问Qdrant服务器所需的API密钥"
                            help={qdrantConfig.apiKey ? "当前已设置API密钥。如需修改，请输入新值。" : ""}
                        >
                            <Input.Password placeholder="输入新的API密钥" />
                        </Form.Item>
                        
                        <Form.Item>
                            <Button 
                                type="primary" 
                                icon={<SaveOutlined />} 
                                onClick={saveQdrantConfig}
                                loading={saving}
                            >
                                保存Qdrant配置
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            )}

            <div style={{ marginBottom: 24 }}>
                <Title level={5}>向量数据库维护</Title>
                <Space size="middle" style={{ marginTop: 12 }}>
                    <Button 
                        danger
                        icon={<DeleteOutlined />}
                        loading={clearing}
                        onClick={handleClearVectors}
                    >
                        清空向量数据库
                    </Button>
                    <Button 
                        type="primary"
                        icon={<ReloadOutlined />}
                        loading={rebuilding}
                        onClick={handleRebuildVectors}
                    >
                        重建向量数据库
                    </Button>
                </Space>
                <Paragraph type="secondary" style={{ marginTop: 8 }}>
                    <InfoCircleOutlined style={{ marginRight: 8 }} />
                    清空操作将删除所有向量数据；重建操作会先清空再重新生成所有向量数据。
                </Paragraph>
            </div>

            <div style={{ background: '#f6f6f6', padding: 16, borderRadius: 4 }}>
                <Title level={5}>向量数据库说明</Title>
                <ul style={{ paddingLeft: 20 }}>
                    <li>
                        <b>InMemory</b>: 内存中存储的向量数据库，适合快速原型和小规模应用
                    </li>

                    <li>
                        <b>Qdrant</b>: 高性能的向量相似度搜索引擎，适合中小规模应用
                    </li>
                </ul>
            </div>
        </Card>
    );
};

export default VectorDbConfig;
