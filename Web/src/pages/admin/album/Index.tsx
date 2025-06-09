import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Card, Input, Space, Modal,
  message, Typography, Popconfirm, Row, Col, Image,
  AutoComplete, Form, Divider, Select, Tag
} from 'antd';
import {
  BookOutlined, DeleteOutlined, SearchOutlined, ExclamationCircleOutlined,
  ReloadOutlined, FilterOutlined, ClearOutlined, PlusOutlined, EditOutlined, PictureOutlined
} from '@ant-design/icons';
import {
  getManagementAlbums, deleteManagementAlbum, batchDeleteManagementAlbums,
  createManagementAlbum, updateManagementAlbum, 
 type AlbumCreateRequest, type AlbumUpdateRequest
} from '../../../api/albumManagementApi';
import { getUsers, getManagementPictures, type AlbumResponse } from '../../../api'; // Renamed to avoid conflict
import { useOutletContext } from 'react-router';
import type { Breakpoint } from 'antd';

const { Title, Text } = Typography;
const { confirm } = Modal;

interface PictureOption {
  value: number;
  label: string;
  thumbnailPath?: string;
}

const AlbumManagement: React.FC = () => {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();

  const [albums, setAlbums] = useState<AlbumResponse[]>([]);
  const [userOptions, setUserOptions] = useState<{ value: number; label: string }[]>([]);
  const [pictureOptions, setPictureOptions] = useState<PictureOption[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [filterForm] = Form.useForm();
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<AlbumResponse | null>(null);
  const [albumForm] = Form.useForm<AlbumCreateRequest | AlbumUpdateRequest>();

  const searchUsers = useCallback(async (searchValue: string) => {
    if (!searchValue.trim()) {
      setUserOptions([]);
      return;
    }
    try {
      const response = await getUsers({ page: 1, pageSize: 20, searchQuery: searchValue });
      if (response.success && response.data) {
        setUserOptions(response.data.map(user => ({ value: user.id, label: `${user.userName} (${user.email})` })));
      }
    } catch (error) { console.error('Error searching users:', error); }
  }, []);

  const searchPicturesForCover = useCallback(async (searchValue: string) => {
    if (!searchValue.trim() && pictureOptions.length > 5) return; // Avoid frequent calls if not searching
    try {
      const response = await getManagementPictures(1, 20, searchValue);
      if (response.success && response.data) {
        setPictureOptions(response.data.map(pic => ({
          value: pic.id,
          label: `${pic.name || '未命名图片'} (ID: ${pic.id})`,
          thumbnailPath: pic.thumbnailPath || pic.path,
        })));
      }
    } catch (error) {
      console.error('Error searching pictures for cover:', error);
      message.error('搜索封面图片失败');
    }
  }, [pictureOptions.length]);


  const fetchAlbums = useCallback(async (
    page = currentPage, size = pageSize, query = searchQuery, userId = selectedUserId
  ) => {
    setLoading(true);
    try {
      const response = await getManagementAlbums(page, size, query, userId);
      if (response.success && response.data) {
        setAlbums(response.data || []);
        setTotal(response.totalCount || 0);
      } else {
        message.error(response.message || '获取相册列表失败');
      }
    } catch (error) {
      message.error('获取相册列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, selectedUserId]);

  useEffect(() => {
    fetchAlbums();
    searchPicturesForCover(''); // Initial load for picture options
  }, [fetchAlbums, searchPicturesForCover]);

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size) setPageSize(size);
    fetchAlbums(page, size || pageSize);
  };

  const handleQuickSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    fetchAlbums(1, pageSize, value, selectedUserId);
  };
  
  const handleFilter = async () => {
    const values = await filterForm.validateFields();
    setSearchQuery(values.searchQuery || '');
    setSelectedUserId(values.userId);
    setCurrentPage(1);
    fetchAlbums(1, pageSize, values.searchQuery, values.userId);
  };

  const handleClearFilters = () => {
    filterForm.resetFields();
    setSearchQuery('');
    setSelectedUserId(undefined);
    setUserOptions([]);
    setCurrentPage(1);
    fetchAlbums(1, pageSize, '', undefined);
  };

  const showCreateModal = () => {
    setEditingAlbum(null);
    albumForm.resetFields();
    albumForm.setFieldsValue({ coverPictureId: null }); // Ensure coverPictureId is null or undefined
    setIsModalVisible(true);
  };

  const showEditModal = (album: AlbumResponse) => {
    setEditingAlbum(album);
    const formValues = {
      name: album.name,
      description: album.description,
      coverPictureId: album.coverPictureId, // 使用正确的 coverPictureId
    };

    // 如果存在封面图片ID，并且该图片不在当前选项中，则尝试添加它以便Select可以正确显示
    if (album.coverPictureId && (album.coverPictureThumbnailPath || album.coverPicturePath)) {
      const existingOption = pictureOptions.find(opt => opt.value === album.coverPictureId);
      if (!existingOption) {
        // 为了在Select中显示当前封面，需要一个标签。
        // 理想情况下，AlbumResponse会包含封面图片的名称。
        // 此处使用文件名或ID作为后备标签。
        const pictureLabel = album.name ? `${album.name} (封面)` : `图片ID: ${album.coverPictureId}`;
        
        const newPictureOption: PictureOption = {
          value: album.coverPictureId,
          label: pictureLabel, // 使用相册名或ID作为临时标签
          thumbnailPath: album.coverPictureThumbnailPath || album.coverPicturePath,
        };
        // 将当前封面图片添加到选项列表的开头，以便在Select中显示
        setPictureOptions(prevOptions => [newPictureOption, ...prevOptions.filter(opt => opt.value !== album.coverPictureId)]);
      }
    }
    
    albumForm.setFieldsValue(formValues);
    setIsModalVisible(true);
  };
  
  const handleModalOk = async () => {
    try {
      const values = await albumForm.validateFields() as AlbumCreateRequest | AlbumUpdateRequest;
      setLoading(true);
      let response;
      if (editingAlbum) {
        response = await updateManagementAlbum(editingAlbum.id, values);
      } else {
        response = await createManagementAlbum(values as AlbumCreateRequest);
      }

      if (response.success) {
        message.success(editingAlbum ? '相册更新成功' : '相册创建成功');
        setIsModalVisible(false);
        fetchAlbums();
      } else {
        message.error(response.message || (editingAlbum ? '更新失败' : '创建失败'));
      }
    } catch (errorInfo) {
      console.log('Validate Failed:', errorInfo);
      message.error('请检查表单输入');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await deleteManagementAlbum(id);
      if (response.success) {
        message.success('相册删除成功');
        fetchAlbums();
      } else {
        message.error(response.message || '删除相册失败');
      }
    } catch (error) { message.error('删除相册失败'); }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的相册');
      return;
    }
    confirm({
      title: `确定要删除 ${selectedRowKeys.length} 个相册吗?`,
      icon: <ExclamationCircleOutlined />,
      content: '此操作不可逆，相册将被永久删除 (相册内图片不会被删除)',
      async onOk() {
        try {
          const response = await batchDeleteManagementAlbums(selectedRowKeys as number[]);
          if (response.success && response.data) {
            message.success(`成功删除 ${response.data.successCount} 个相册`);
            if (response.data.failedCount > 0) {
              message.warning(`${response.data.failedCount} 个相册删除失败`);
            }
            setSelectedRowKeys([]);
            fetchAlbums();
          } else {
            message.error(response.message || '批量删除失败');
          }
        } catch (error) { message.error('批量删除失败'); }
      }
    });
  };



  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', responsive: ['md'] as Breakpoint[] },
    {
      title: '封面', dataIndex: 'coverPictureThumbnailPath', key: 'cover',
      render: (path?: string, record?: AlbumResponse) => (
        path ? <Image width={50} height={50} src={path} style={{ objectFit: 'cover', borderRadius: 4 }} />
             : record?.coverPicturePath ? <Image width={50} height={50} src={record.coverPicturePath} style={{ objectFit: 'cover', borderRadius: 4 }} />
             : <PictureOutlined style={{ fontSize: 30, color: '#ccc' }}/>
      ),
    },
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '描述', dataIndex: 'description', key: 'description', responsive: ['md'] as Breakpoint[], render: (desc: string) => desc || '-'},
    { title: '图片数', dataIndex: 'pictureCount', key: 'pictureCount', render: (count: number) => <Tag>{count}</Tag> },
    { title: '用户', dataIndex: 'username', key: 'username', responsive: ['lg'] as Breakpoint[] },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt', responsive: ['lg'] as Breakpoint[], render: (date: Date) => new Date(date).toLocaleString() },
    {
      title: '操作', key: 'action',
      render: (_: any, record: AlbumResponse) => (
        <Space size="small" wrap>
          <Button type="link" icon={<EditOutlined />} onClick={() => showEditModal(record)}>编辑</Button>
          <Popconfirm title="确定删除此相册?" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
          {/* Add 'Set Cover' and 'Manage Pictures' buttons here later */}
        </Space>
      ),
    },
  ];

  return (
    <div className="album-management">
      <Row gutter={[16, 16]} align="middle" justify="space-between">
        <Col>
          <Space align="center">
            <BookOutlined style={{ fontSize: 24 }} />
            <Title level={2} style={{ margin: 0 }}>相册管理</Title>
          </Space>
          <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
            管理系统中的所有相册，包括创建、编辑、删除和批量操作
          </Text>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]} justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} md={16}>
            <Space wrap>
              <Button type="primary" icon={<PlusOutlined />} onClick={showCreateModal}>创建相册</Button>
              <Button danger icon={<DeleteOutlined />} onClick={handleBatchDelete} disabled={selectedRowKeys.length === 0}>批量删除</Button>
              <Button icon={<ReloadOutlined />} onClick={() => fetchAlbums()}>刷新</Button>
              <Button icon={<FilterOutlined />} onClick={() => setShowFilters(!showFilters)} type={showFilters ? 'primary' : 'default'}>高级筛选</Button>
            </Space>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Input.Search placeholder="搜索相册名称或描述" allowClear enterButton={<SearchOutlined />} onSearch={handleQuickSearch} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </Col>
        </Row>

        {showFilters && (
          <>
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
              <Form form={filterForm} layout="inline" onFinish={handleFilter} initialValues={{ searchQuery, userId: selectedUserId }}>
                <Form.Item name="searchQuery" label="关键词"><Input placeholder="名称或描述" style={{ width: 200 }} /></Form.Item>
                <Form.Item name="userId" label="所属用户">
                  <AutoComplete style={{ width: 250 }} options={userOptions} onSearch={searchUsers} placeholder="输入用户名或邮箱" allowClear filterOption={false} />
                </Form.Item>
                <Form.Item><Space><Button type="primary" htmlType="submit" icon={<SearchOutlined />}>筛选</Button><Button icon={<ClearOutlined />} onClick={handleClearFilters}>清除</Button></Space></Form.Item>
              </Form>
            </Card>
            <Divider style={{ margin: '16px 0' }} />
          </>
        )}

        <Table
          rowKey="id"
          columns={columns}
          dataSource={albums}
          loading={loading}
          pagination={{ current: currentPage, pageSize, total, showSizeChanger: true, showQuickJumper: true, onChange: handlePageChange, showTotal: (total) => `共 ${total} 条` }}
          rowSelection={{ selectedRowKeys, onChange: (keys) => setSelectedRowKeys(keys) }}
          size={isMobile ? "small" : "middle"}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      <Modal
        title={editingAlbum ? '编辑相册' : '创建新相册'}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        destroyOnClose
        width={600}
      >
        <Form form={albumForm} layout="vertical" name="albumForm">
          <Form.Item name="name" label="相册名称" rules={[{ required: true, message: '请输入相册名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="相册描述">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="coverPictureId" label="封面图片 (可选)">
            <Select
              showSearch
              allowClear
              placeholder="搜索并选择封面图片"
              onSearch={searchPicturesForCover}
              filterOption={false} // Server-side search
              notFoundContent={loading ? "搜索中..." : "无匹配图片"}
              options={pictureOptions}
              optionRender={(option) => (
                <Space>
                  {option.data?.thumbnailPath && <Image src={option.data.thumbnailPath} width={30} height={30} preview={false} style={{objectFit: 'cover'}}/>}
                  <span>{option.label}</span>
                </Space>
              )}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AlbumManagement;
