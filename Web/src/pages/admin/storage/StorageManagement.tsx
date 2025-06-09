import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Card, Input, Space, Modal, Form, message, Tag, Typography, Popconfirm, Row, Col, Select, Switch, Tooltip, Alert} from 'antd';
import {
  DeleteOutlined, EditOutlined, SearchOutlined, ExclamationCircleOutlined, ReloadOutlined,
  PlusOutlined, DatabaseOutlined, FilterOutlined, ClearOutlined, StarOutlined, StarFilled
} from '@ant-design/icons';
import {
  getStorageModes, deleteStorageMode, createStorageMode, updateStorageMode, batchDeleteStorageModes, getStorageTypes,
  getDefaultStorageModeId, setDefaultStorageMode,
  type StorageModeResponse, type CreateStorageModeRequest, type UpdateStorageModeRequest, type StorageModeFilterRequest,
  type StorageTypeResponse, StorageTypeEnum, StorageTypeLabels
} from '../../../api';
import { useOutletContext } from 'react-router';
import type { Breakpoint } from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

const StorageManagementPage: React.FC = () => {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();

  const [storageModes, setStorageModes] = useState<StorageModeResponse[]>([]);
  const [availableStorageTypes, setAvailableStorageTypes] = useState<StorageTypeResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [defaultStorageModeId, setDefaultStorageModeId] = useState<number | null>(null);
  const [, setIsLoadingDefault] = useState(false); 
  const [settingDefaultModeId, setSettingDefaultModeId] = useState<number | null>(null); 

  const [filters, setFilters] = useState<StorageModeFilterRequest>({});
  const [showFilters, setShowFilters] = useState(false);
  const [filterForm] = Form.useForm();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [editingMode, setEditingMode] = useState<StorageModeResponse | null>(null);
  const [form] = Form.useForm();
  const [currentStorageTypeForHelp, setCurrentStorageTypeForHelp] = useState<StorageTypeEnum | null>(null);

  const fetchStorageTypes = useCallback(async () => {
    try {
      const response = await getStorageTypes();
      if (response.success && response.data) {
        setAvailableStorageTypes(response.data);
      } else {
        message.error(response.message || '获取存储类型失败');
      }
    } catch (error) {
      message.error('获取存储类型失败，请检查网络');
    }
  }, []);
  
  const fetchDefaultStorageModeId = useCallback(async () => {
    try {
      setIsLoadingDefault(true);
      const response = await getDefaultStorageModeId();
      if (response.success) {
        setDefaultStorageModeId(response.data ?? null);
      } else {
        message.error(response.message || '获取默认存储模式失败');
      }
    } catch (error) {
      message.error('获取默认存储模式失败，请检查网络');
    } finally {
      setIsLoadingDefault(false);
    }
  }, []);

  const fetchStorageModes = useCallback(async (page = currentPage, size = pageSize, filterParams = filters) => {
    setLoading(true);
    try {
      const response = await getStorageModes({
        page,
        pageSize: size,
        ...filterParams
      });
      if (response.success && response.data) {
        setStorageModes(response.data.map(m => ({...m, createdAt: new Date(m.createdAt), updatedAt: new Date(m.updatedAt) })));
        setTotal(response.totalCount || 0);
      } else {
        message.error(response.message || '获取存储模式列表失败');
      }
    } catch (error) {
      message.error('获取存储模式列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters]);

  useEffect(() => {
    fetchStorageTypes();
    fetchStorageModes();
    fetchDefaultStorageModeId();
  }, [fetchStorageModes, fetchStorageTypes, fetchDefaultStorageModeId]);

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size) setPageSize(size);
    fetchStorageModes(page, size || pageSize, filters);
  };

  const handleFilter = async () => {
    const values = await filterForm.validateFields();
    const newFilters: StorageModeFilterRequest = {
      searchQuery: values.searchQuery,
      storageType: values.storageType,
      isEnabled: typeof values.isEnabled === 'boolean' ? values.isEnabled : undefined,
    };
    setFilters(newFilters);
    setCurrentPage(1);
    fetchStorageModes(1, pageSize, newFilters);
  };

  const handleClearFilters = () => {
    filterForm.resetFields();
    setFilters({});
    setCurrentPage(1);
    fetchStorageModes(1, pageSize, {});
  };
  
  const handleQuickSearch = (searchQuery: string) => {
    const newFilters = { ...filters, searchQuery };
    setFilters(newFilters);
    setCurrentPage(1);
    fetchStorageModes(1, pageSize, newFilters);
  };

  const showCreateModal = () => {
    setModalTitle('创建新存储模式');
    setEditingMode(null);
    setCurrentStorageTypeForHelp(null);
    form.resetFields(); // This will clear all fields, including any 'configuration' fields
    form.setFieldsValue({ isEnabled: true });
    setIsModalVisible(true);
  };

  const showEditModal = (mode: StorageModeResponse) => {
    setModalTitle('编辑存储模式');
    setEditingMode(mode);
    setCurrentStorageTypeForHelp(mode.storageType);

    let parsedConfig = {};
    if (mode.configurationJson) {
      try {
        parsedConfig = JSON.parse(mode.configurationJson);
      } catch (e) {
        message.error('解析现有配置JSON失败，请检查数据格式。');
        parsedConfig = {};
      }
    }

    form.setFieldsValue({
      name: mode.name,
      storageType: mode.storageType,
      isEnabled: mode.isEnabled,
      configuration: parsedConfig, 
    });
    setIsModalVisible(true);
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const { name, storageType, isEnabled, configuration } = values;
      const configToSave = configuration || {};
      const commonData = {
        name,
        storageType,
        configurationJson: JSON.stringify(configToSave),
        isEnabled,
      };

      let response;
      if (editingMode) {
        const updateData: UpdateStorageModeRequest = { id: editingMode.id, ...commonData };
        response = await updateStorageMode(updateData);
      } else {
        const createData: CreateStorageModeRequest = commonData;
        response = await createStorageMode(createData);
      }

      if (response.success) {
        message.success(editingMode ? '存储模式更新成功' : '存储模式创建成功');
        fetchStorageModes(editingMode ? currentPage : 1); 
        setIsModalVisible(false);
      } else {
        message.error(response.message || (editingMode ? '更新失败' : '创建失败'));
      }
    } catch (errorInfo) {
      console.error('Form validation failed:', errorInfo);
      message.error('请检查表单输入。');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await deleteStorageMode(id);
      if (response.success) {
        message.success('存储模式删除成功');
        fetchStorageModes(); // Refresh
      } else {
        message.error(response.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败，请检查网络');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的存储模式');
      return;
    }
    confirm({
      title: `确定要删除 ${selectedRowKeys.length} 个存储模式吗?`,
      icon: <ExclamationCircleOutlined />,
      content: '此操作不可逆。如果存储模式仍被图片使用，则无法删除。',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          const response = await batchDeleteStorageModes(selectedRowKeys as number[]);
          if (response.success && response.data) {
            message.success(`成功删除 ${response.data.successCount} 个存储模式`);
            if (response.data.failedCount > 0) {
              message.warning(`${response.data.failedCount} 个存储模式删除失败 (可能仍在使用中)。失败ID: ${response.data.failedIds?.join(', ')}`);
            }
            setSelectedRowKeys([]);
            fetchStorageModes(); // Refresh
          } else {
            message.error(response.message || '批量删除失败');
          }
        } catch (error) {
          message.error('批量删除失败，请检查网络');
        }
      }
    });
  };
  
  const handleSetDefault = async (id: number) => {
    try {
      setSettingDefaultModeId(id); // 开始为此特定项目设置默认
      const response = await setDefaultStorageMode(id);
      if (response.success) {
        message.success('默认存储模式设置成功');
        setDefaultStorageModeId(id);
        // 可选: 如果默认状态会影响列表显示方式（除了星星图标），则重新获取列表
        // fetchStorageModes(currentPage, pageSize, filters); 
      } else {
        message.error(response.message || '设置默认存储模式失败');
      }
    } catch (error) {
      message.error('设置默认存储模式失败，请检查网络');
    } finally {
      setSettingDefaultModeId(null); // 清除此特定项目的加载状态
    }
  };

  const renderDynamicConfigFields = (storageType: StorageTypeEnum | null) => {
    if (storageType === null || storageType === undefined) return null; 
    switch (storageType) {
      case StorageTypeEnum.Local:
        return (
            <>
              <Form.Item name={['configuration', 'BasePath']} label="基础路径 (BasePath)" rules={[{ required: true, message: '请输入基础路径' }]}>
                <Input placeholder="例如: /path/to/your/uploads" />
              </Form.Item>
              <Form.Item name={['configuration', 'ServerUrl']} label="服务器URL (ServerUrl)" rules={[{ required: true, message: '请输入服务器URL' }]}>
                <Input placeholder="例如: http://localhost:5000" />
              </Form.Item>
              <Form.Item name={['configuration', 'PublicBasePath']} label="公共基础路径 (PublicBasePath)" rules={[{ required: true, message: '请输入公共基础路径'}]}>
                <Input placeholder="例如: /Uploads (用于拼接图片URL)" />
              </Form.Item>
            </>
        );
      case StorageTypeEnum.Telegram:
        return (
          <>
            <Form.Item name={['configuration', 'BotToken']} label="机器人Token (BotToken)" rules={[{ required: true, message: '请输入机器人Token' }]}>
              <Input.Password placeholder="您的Telegram机器人Token" />
            </Form.Item>
            <Form.Item name={['configuration', 'ChatId']} label="聊天ID (ChatId)" rules={[{ required: true, message: '请输入聊天ID' }]}>
              <Input placeholder="目标聊天或频道的ID" />
            </Form.Item>
            <Form.Item name={['configuration', 'ProxyAddress']} label="代理地址 (ProxyAddress) (可选)">
              <Input placeholder="例如: 127.0.0.1" />
            </Form.Item>
            <Form.Item name={['configuration', 'ProxyPort']} label="代理端口 (ProxyPort) (可选)">
              <Input placeholder="例如: 1080" type="number" />
            </Form.Item>
          </>
        );
      case StorageTypeEnum.S3:
        return (
          <>
            <Form.Item name={['configuration', 'AccessKey']} label="AccessKey" rules={[{ required: true, message: '请输入AccessKey' }]}>
              <Input placeholder="您的S3 AccessKey" />
            </Form.Item>
            <Form.Item name={['configuration', 'SecretKey']} label="SecretKey" rules={[{ required: true, message: '请输入SecretKey' }]}>
              <Input.Password placeholder="您的S3 SecretKey" />
            </Form.Item>
            <Form.Item name={['configuration', 'Endpoint']} label="Endpoint" rules={[{ required: true, message: '请输入Endpoint' }]}>
              <Input placeholder="例如: s3.us-west-2.amazonaws.com" />
            </Form.Item>
            <Form.Item name={['configuration', 'Region']} label="区域 (Region)" rules={[{ required: true, message: '请输入区域' }]}>
              <Input placeholder="例如: us-west-2" />
            </Form.Item>
            <Form.Item name={['configuration', 'BucketName']} label="存储桶名称 (BucketName)" rules={[{ required: true, message: '请输入存储桶名称' }]}>
              <Input placeholder="您的S3存储桶名称" />
            </Form.Item>
            <Form.Item name={['configuration', 'UsePathStyleUrls']} label="使用路径样式URL (UsePathStyleUrls)" valuePropName="checked">
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
            <Form.Item name={['configuration', 'CdnUrl']} label="CDN URL (可选)">
              <Input placeholder="例如: https://cdn.example.com" />
            </Form.Item>
          </>
        );
      case StorageTypeEnum.Cos:
        return (
          <>
            <Form.Item name={['configuration', 'Region']} label="区域 (Region)" rules={[{ required: true, message: '请输入区域' }]}>
              <Input placeholder="例如: ap-guangzhou" />
            </Form.Item>
            <Form.Item name={['configuration', 'SecretId']} label="SecretId" rules={[{ required: true, message: '请输入SecretId' }]}>
              <Input placeholder="您的腾讯云SecretId" />
            </Form.Item>
            <Form.Item name={['configuration', 'SecretKey']} label="SecretKey" rules={[{ required: true, message: '请输入SecretKey' }]}>
              <Input.Password placeholder="您的腾讯云SecretKey" />
            </Form.Item>
            <Form.Item name={['configuration', 'BucketName']} label="存储桶名称 (BucketName)" rules={[{ required: true, message: '请输入存储桶名称' }]}>
              <Input placeholder="格式: your-bucket-appid" />
            </Form.Item>
            <Form.Item name={['configuration', 'CdnUrl']} label="CDN URL (可选)">
              <Input placeholder="例如: https://cdn.example.com" />
            </Form.Item>
            <Form.Item name={['configuration', 'PublicRead']} label="公共读 (PublicRead)" valuePropName="checked">
              <Switch checkedChildren="是" unCheckedChildren="否" />
            </Form.Item>
          </>
        );
      case StorageTypeEnum.WebDAV:
        return (
          <>
            <Form.Item name={['configuration', 'ServerUrl']} label="服务器URL (ServerUrl)" rules={[{ required: true, message: '请输入WebDAV服务器URL' }]}>
              <Input placeholder="例如: https://dav.example.com" />
            </Form.Item>
            <Form.Item name={['configuration', 'BasePath']} label="基础路径 (BasePath)">
              <Input placeholder="例如: uploads (在服务器上的相对路径)" />
            </Form.Item>
            <Form.Item name={['configuration', 'UserName']} label="用户名 (UserName)" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input placeholder="WebDAV用户名" />
            </Form.Item>
            <Form.Item name={['configuration', 'Password']} label="密码 (Password)" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="WebDAV密码" />
            </Form.Item>
            <Form.Item name={['configuration', 'PublicUrl']} label="公共URL (PublicUrl) (可选)">
              <Input placeholder="例如: https://public.example.com/dav (如果WebDAV内容可通过不同URL公开访问)" />
            </Form.Item>
          </>
        );
      default:
        return <Alert message="此存储类型可能不需要额外配置，或配置界面暂未实现。" type="info" showIcon />;
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', responsive: ['md'] as Breakpoint[] },
    { 
      title: '名称', 
      dataIndex: 'name', 
      key: 'name',
      render: (name: string, record: StorageModeResponse) => (
        <Space>
          {record.id === defaultStorageModeId && (
            <Tooltip title="默认存储模式">
              <StarFilled style={{ color: '#faad14' }} />
            </Tooltip>
          )}
          {name}
        </Space>
      ) 
    },
    {
      title: '类型', dataIndex: 'storageType', key: 'storageType',
      render: (type: StorageTypeEnum) => <Tag color="blue">{StorageTypeLabels[type] || type}</Tag>,
    },
    {
      title: '配置 (JSON)', dataIndex: 'configurationJson', key: 'configurationJson', responsive: ['lg'] as Breakpoint[],
      render: (json?: string) => json ? <Tooltip title={json}><Text style={{ maxWidth: 200 }} ellipsis>{json}</Text></Tooltip> : <Text type="secondary">无</Text>,
    },
    {
      title: '启用状态', dataIndex: 'isEnabled', key: 'isEnabled',
      render: (enabled: boolean) => <Tag color={enabled ? 'green' : 'red'}>{enabled ? '已启用' : '已禁用'}</Tag>,
    },
    { title: '更新时间', dataIndex: 'updatedAt', key: 'updatedAt', responsive: ['lg'] as Breakpoint[], render: (date: Date) => date.toLocaleString() },
    {
      title: '操作', key: 'action',
      render: (_: any, record: StorageModeResponse) => (
        <Space size="small">
          {record.isEnabled && record.id !== defaultStorageModeId && (
            <Button 
              type="text" 
              icon={<StarOutlined />} 
              onClick={() => handleSetDefault(record.id)}
              loading={settingDefaultModeId === record.id} // 使用新的行特定加载状态
              title="设为默认"
            >
              {isMobile ? '' : '设为默认'}
            </Button>
          )}
          <Button type="text" icon={<EditOutlined />} onClick={() => showEditModal(record)}>{isMobile ? '' : '编辑'}</Button>
          <Popconfirm 
            title="确定删除此存储模式吗?" 
            onConfirm={() => handleDelete(record.id)} 
            okText="确定" 
            cancelText="取消"
            disabled={record.id === defaultStorageModeId}
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              disabled={record.id === defaultStorageModeId}
            >
              {isMobile ? '' : '删除'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Row gutter={[16, 16]} align="middle" justify="space-between">
        <Col>
          <Space align="center">
            <DatabaseOutlined style={{ fontSize: 24 }} />
            <Title level={2} style={{ margin: 0 }}>存储模式管理</Title>
          </Space>
          <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
            管理系统中的各种文件存储方式及其配置
          </Text>
        </Col>
        <Col>
          {defaultStorageModeId && (
            <Alert 
              type="info" 
              message={
                <Space>
                  <StarFilled style={{ color: '#faad14' }} />
                  <span>当前默认存储模式ID: {defaultStorageModeId}</span>
                </Space>
              }
              style={{ padding: '4px 12px' }}
            />
          )}
          {!defaultStorageModeId && (
            <Alert 
              type="warning" 
              message="未设置默认存储模式" 
              description="请选择一个启用的存储模式设为默认"
              showIcon
            />
          )}
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]} justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={14} md={16}>
            <Space wrap>
              <Button type="primary" icon={<PlusOutlined />} onClick={showCreateModal}>创建模式</Button>
              <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete} disabled={selectedRowKeys.length === 0}>批量删除</Button>
              <Button icon={<ReloadOutlined />} onClick={() => fetchStorageModes(currentPage, pageSize, filters)}>刷新</Button>
              <Button icon={<FilterOutlined />} onClick={() => setShowFilters(!showFilters)} type={showFilters ? 'primary' : 'default'}>高级筛选</Button>
            </Space>
          </Col>
          <Col xs={24} sm={10} md={8}>
            <Input.Search placeholder="搜索模式名称" allowClear enterButton={<SearchOutlined />} onSearch={handleQuickSearch} />
          </Col>
        </Row>

        {showFilters && (
          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
            <Form form={filterForm} layout="inline" onFinish={handleFilter}>
              <Form.Item name="searchQuery" label="名称">
                <Input placeholder="模式名称" style={{ width: 150 }} />
              </Form.Item>
              <Form.Item name="storageType" label="类型">
                <Select placeholder="选择类型" style={{ width: 150 }} allowClear>
                  {availableStorageTypes.map(st => <Option key={st.value} value={st.value}>{st.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="isEnabled" label="状态">
                <Select placeholder="选择状态" style={{ width: 120 }} allowClear>
                  <Option value={true}>已启用</Option>
                  <Option value={false}>已禁用</Option>
                </Select>
              </Form.Item>
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>筛选</Button>
                  <Button icon={<ClearOutlined />} onClick={handleClearFilters}>清除</Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        )}

        <Table
          rowKey="id"
          columns={columns}
          dataSource={storageModes}
          loading={loading}
          pagination={{
            current: currentPage, pageSize: pageSize, total: total,
            showSizeChanger: true, showQuickJumper: true, onChange: handlePageChange,
            showTotal: (t) => `共 ${t} 条记录`,
          }}
          rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }}
          size={isMobile ? "small" : "middle"}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={modalTitle}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText={editingMode ? "更新" : "创建"}
        cancelText="取消"
        width={isMobile ? '90%' : 700}
      >
        <Form form={form} layout="vertical" initialValues={{ isEnabled: true, configuration: {} }}>
          <Form.Item name="name" label="模式名称" rules={[{ required: true, message: '请输入模式名称' }]}>
            <Input placeholder="例如：主图片存储、备份存储等" />
          </Form.Item>
          <Form.Item name="storageType" label="存储类型" rules={[{ required: true, message: '请选择存储类型' }]}>
            <Select 
              placeholder="选择一个存储类型" 
              onChange={(value) => {
                setCurrentStorageTypeForHelp(value as StorageTypeEnum);
                form.setFieldsValue({ configuration: {} }); 
              }}
            >
              {availableStorageTypes.map(st => <Option key={st.value} value={st.value}>{StorageTypeLabels[st.value as StorageTypeEnum] || st.name}</Option>)}
            </Select>
          </Form.Item>
          
     
          {renderDynamicConfigFields(currentStorageTypeForHelp)}

          <Form.Item name="isEnabled" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="已启用" unCheckedChildren="已禁用" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default StorageManagementPage;
