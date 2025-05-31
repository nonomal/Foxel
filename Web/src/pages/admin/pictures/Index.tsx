import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, Button, Card, Input, Space, Modal, 
  message, Typography, Popconfirm, Row, Col, Image, Select
} from 'antd';
import { 
  PictureOutlined, DeleteOutlined, 
  SearchOutlined, ExclamationCircleOutlined, ReloadOutlined,
  FileImageOutlined, UserOutlined
} from '@ant-design/icons';
import { 
  getManagementPictures, deleteManagementPicture, batchDeleteManagementPictures,
  getUsers
} from '../../../api';
import type { PictureResponse, UserResponse } from '../../../api/types';
import { useOutletContext } from 'react-router';
import type { Breakpoint } from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;

const PictureManagement: React.FC = () => {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  
  // 状态管理
  const [pictures, setPictures] = useState<PictureResponse[]>([]);
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();

  // 加载用户列表
  const fetchUsers = useCallback(async () => {
    try {
      const response = await getUsers(1, 1000); // 获取所有用户用于筛选
      if (response.success && response.data) {
        setUsers(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  // 加载图片数据
  const fetchPictures = useCallback(async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const response = await getManagementPictures(page, size);
      if (response.success && response.data) {
        setPictures(response.data || []);
        setTotal(response.totalCount || 0);
      } else {
        message.error(response.message || '获取图片列表失败');
      }
    } catch (error) {
      console.error('Error fetching pictures:', error);
      message.error('获取图片列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  // 初始加载
  useEffect(() => {
    fetchUsers();
    fetchPictures();
  }, [fetchUsers, fetchPictures]);

  // 处理页面变化
  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size) setPageSize(size);
    fetchPictures(page, size || pageSize);
  };

  // 处理搜索
  const handleSearch = () => {
    setCurrentPage(1);
    fetchPictures(1, pageSize);
  };


  // 处理删除图片
  const handleDelete = async (id: number) => {
    try {
      const response = await deleteManagementPicture(id);
      if (response.success) {
        message.success('图片删除成功');
        fetchPictures();
      } else {
        message.error(response.message || '删除图片失败');
      }
    } catch (error) {
      console.error('Error deleting picture:', error);
      message.error('删除图片失败，请检查网络连接');
    }
  };

  // 批量删除图片
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的图片');
      return;
    }

    confirm({
      title: `确定要删除 ${selectedRowKeys.length} 张图片吗?`,
      icon: <ExclamationCircleOutlined />,
      content: '此操作不可逆，所选图片将被永久删除',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          const response = await batchDeleteManagementPictures(selectedRowKeys as number[]);
          if (response.success && response.data) {
            message.success(`成功删除 ${response.data.successCount} 张图片`);
            if (response.data.failedCount > 0) {
              message.warning(`${response.data.failedCount} 张图片删除失败`);
            }
            setSelectedRowKeys([]);
            fetchPictures();
          } else {
            message.error(response.message || '批量删除图片失败');
          }
        } catch (error) {
          console.error('Error batch deleting pictures:', error);
          message.error('批量删除图片失败，请检查网络连接');
        }
      }
    });
  };

  // 处理用户筛选
  const handleUserFilter = (userId: number | undefined) => {
    setSelectedUserId(userId);
    // 这里应该根据用户ID筛选图片，但目前先简单刷新
    setCurrentPage(1);
    fetchPictures(1, pageSize);
  };

  // 表格列定义
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      responsive: ['md' as Breakpoint],
    },
    {
      title: '缩略图',
      dataIndex: 'thumbnailPath',
      key: 'thumbnail',
      render: (thumbnailPath: string, record: PictureResponse) => (
        <Image
          width={50}
          height={50}
          src={thumbnailPath || record.path}
          style={{ objectFit: 'cover', borderRadius: 4 }}
        />
      ),
    },
    {
      title: '图片名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => (
        <Space>
          <FileImageOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      responsive: ['lg' as Breakpoint],
      render: (username: string) => (
        <Space>
          <UserOutlined />
          {username}
        </Space>
      ),
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['lg' as Breakpoint],
      render: (date: Date) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: PictureResponse) => (
        <Space size="small">
          <Popconfirm
            title="确定要删除此图片吗?"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />}
            >
              {isMobile ? '' : '删除'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="picture-management">
      <Row gutter={[16, 16]} align="middle" justify="space-between">
        <Col>
          <Space align="center">
            <PictureOutlined style={{ fontSize: 24 }} />
            <Title level={2} style={{ margin: 0 }}>图片管理</Title>
          </Space>
          <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
            管理系统中的所有图片，包括查看、删除和批量操作
          </Text>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]} justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={14} md={16}>
            <Space wrap>
              <Button 
                danger 
                icon={<DeleteOutlined />} 
                onClick={handleBatchDelete}
                disabled={selectedRowKeys.length === 0}
              >
                批量删除
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => fetchPictures()}
              >
                刷新
              </Button>
              <Select
                style={{ width: 150 }}
                placeholder="筛选用户"
                allowClear
                value={selectedUserId}
                onChange={handleUserFilter}
              >
                {users.map(user => (
                  <Option key={user.id} value={user.id}>
                    {user.userName}
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>
          <Col xs={24} sm={10} md={8}>
            <Input.Search
              placeholder="搜索图片名称"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleSearch}
              onChange={(e) => setSearchQuery(e.target.value)}
              value={searchQuery}
            />
          </Col>
        </Row>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={pictures}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showQuickJumper: true,
            onChange: handlePageChange,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
          size={isMobile ? "small" : "middle"}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
};

export default PictureManagement;
