import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, Button, Card, Input, Space, Modal, Form, 
  message, Tag, Typography, Popconfirm, Row, Col, Select,
  DatePicker, Divider
} from 'antd';
import { 
  UserOutlined, DeleteOutlined, EditOutlined, 
  SearchOutlined, ExclamationCircleOutlined, ReloadOutlined,
  UserAddOutlined, UserDeleteOutlined, TeamOutlined,
  EyeOutlined, FilterOutlined, ClearOutlined
} from '@ant-design/icons';
import { 
  getUsers, deleteUser, createUser, updateUser, batchDeleteUsers, UserRole
} from '../../../api';
import type { UserResponse, CreateUserRequest, AdminUpdateUserRequest, UserFilterRequest } from '../../../api';
import { useOutletContext } from 'react-router';
import { useNavigate } from 'react-router';
import type { Breakpoint } from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;
const { confirm } = Modal;
const { RangePicker } = DatePicker;

const UserManagement: React.FC = () => {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();
  const navigate = useNavigate();
  
  // 状态管理
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  
  // 筛选状态
  const [filters, setFilters] = useState<UserFilterRequest>({});
  const [showFilters, setShowFilters] = useState(false);
  const [filterForm] = Form.useForm();
  
  // 模态框状态
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [form] = Form.useForm();

  // 加载用户数据
  const fetchUsers = useCallback(async (page = currentPage, size = pageSize, filterParams = filters) => {
    setLoading(true);
    try {
      const response = await getUsers({
        page,
        pageSize: size,
        ...filterParams
      });
      if (response.success && response.data) {
        setUsers(response.data || []);
        setTotal(response.totalCount || 0);
      } else {
        message.error(response.message || '获取用户列表失败');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('获取用户列表失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, filters]);

  // 初始加载
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // 处理页面变化
  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size) setPageSize(size);
    fetchUsers(page, size || pageSize);
  };

  // 处理筛选
  const handleFilter = async () => {
    try {
      const values = await filterForm.validateFields();
      const newFilters: UserFilterRequest = {
        searchQuery: values.searchQuery,
        role: values.role,
        startDate: values.dateRange?.[0]?.format('YYYY-MM-DD'),
        endDate: values.dateRange?.[1]?.format('YYYY-MM-DD'),
      };
      setFilters(newFilters);
      setCurrentPage(1);
      fetchUsers(1, pageSize, newFilters);
    } catch (error) {
      console.error('Filter validation failed:', error);
    }
  };

  // 清除筛选
  const handleClearFilters = () => {
    filterForm.resetFields();
    setFilters({});
    setCurrentPage(1);
    fetchUsers(1, pageSize, {});
  };

  // 处理搜索（快速搜索）
  const handleQuickSearch = (searchQuery: string) => {
    const newFilters = { ...filters, searchQuery };
    setFilters(newFilters);
    setCurrentPage(1);
    fetchUsers(1, pageSize, newFilters);
  };

  // 打开创建用户模态框
  const showCreateModal = () => {
    setModalTitle('创建新用户');
    setEditingUser(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // 打开编辑用户模态框
  const showEditModal = (user: UserResponse) => {
    setModalTitle('编辑用户');
    setEditingUser(user);
    form.setFieldsValue({
      userName: user.userName,
      email: user.email,
      role: user.role,
    });
    setIsModalVisible(true);
  };

  // 处理模态框确认
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingUser) {
        // 更新用户
        const updateData: AdminUpdateUserRequest = {
          id: editingUser.id,
          userName: values.userName,
          email: values.email,
          role: values.role,
        };
        
        const response = await updateUser(updateData);
        if (response.success) {
          message.success('用户更新成功');
          fetchUsers();
        } else {
          message.error(response.message || '更新用户失败');
        }
      } else {
        // 创建用户
        const createData: CreateUserRequest = {
          userName: values.userName,
          email: values.email,
          password: values.password,
          role: values.role,
        };
        
        const response = await createUser(createData);
        if (response.success) {
          message.success('用户创建成功');
          fetchUsers();
        } else {
          message.error(response.message || '创建用户失败');
        }
      }
      
      setIsModalVisible(false);
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  // 处理删除用户
  const handleDelete = async (id: number) => {
    try {
      const response = await deleteUser(id);
      if (response.success) {
        message.success('用户删除成功');
        fetchUsers();
      } else {
        message.error(response.message || '删除用户失败');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      message.error('删除用户失败，请检查网络连接');
    }
  };


  // 批量删除用户
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的用户');
      return;
    }

    confirm({
      title: `确定要删除 ${selectedRowKeys.length} 名用户吗?`,
      icon: <ExclamationCircleOutlined />,
      content: '此操作不可逆，所选用户的所有数据将被删除',
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      async onOk() {
        try {
          const response = await batchDeleteUsers(selectedRowKeys as number[]);
          if (response.success && response.data) {
            message.success(`成功删除 ${response.data.successCount} 名用户`);
            if (response.data.failedCount > 0) {
              message.warning(`${response.data.failedCount} 名用户删除失败`);
            }
            setSelectedRowKeys([]);
            fetchUsers();
          } else {
            message.error(response.message || '批量删除用户失败');
          }
        } catch (error) {
          console.error('Error batch deleting users:', error);
          message.error('批量删除用户失败，请检查网络连接');
        }
      }
    });
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
      title: '用户名',
      dataIndex: 'userName',
      key: 'userName',
      render: (text: string) => (
        <Space>
          <UserOutlined />
          {text}
        </Space>
      ),
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      responsive: ['lg' as Breakpoint],
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => {
        let color = 'blue';
        if (role === 'Administrator') {
          color = 'red';
        } else {
          color = 'green';
        }
        return <Tag color={color}>{role || '用户'}</Tag>;
      },
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['lg' as Breakpoint],
      render: (date: Date) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: UserResponse) => (
        <Space size="small">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => navigate(`/admin/users/${record.id}`)}
            >
              {isMobile ? '' : '查看'}
            </Button>
          <Button 
            type="text" 
            icon={<EditOutlined />} 
            onClick={() => showEditModal(record)}
          >
            {isMobile ? '' : '编辑'}
          </Button>
          <Popconfirm
            title="确定要删除此用户吗?"
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
    <div className="user-management">
      <Row gutter={[16, 16]} align="middle" justify="space-between">
        <Col>
          <Space align="center">
            <TeamOutlined style={{ fontSize: 24 }} />
            <Title level={2} style={{ margin: 0 }}>用户管理</Title>
          </Space>
          <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
            管理系统中的所有用户账户，包括创建、编辑和删除用户
          </Text>
        </Col>
      </Row>

      <Card style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]} justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={14} md={16}>
            <Space wrap>
              <Button 
                type="primary" 
                icon={<UserAddOutlined />} 
                onClick={showCreateModal}
              >
                创建用户
              </Button>
              <Button 
                danger 
                icon={<UserDeleteOutlined />} 
                onClick={handleBatchDelete}
                disabled={selectedRowKeys.length === 0}
              >
                批量删除
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => fetchUsers()}
              >
                刷新
              </Button>
              <Button 
                icon={<FilterOutlined />} 
                onClick={() => setShowFilters(!showFilters)}
                type={showFilters ? 'primary' : 'default'}
              >
                高级筛选
              </Button>
            </Space>
          </Col>
          <Col xs={24} sm={10} md={8}>
            <Input.Search
              placeholder="搜索用户名或邮箱"
              allowClear
              enterButton={<SearchOutlined />}
              onSearch={handleQuickSearch}
            />
          </Col>
        </Row>

        {/* 高级筛选面板 */}
        {showFilters && (
          <>
            <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
              <Form
                form={filterForm}
                layout="inline"
                onFinish={handleFilter}
              >
                <Form.Item name="searchQuery" label="搜索关键词">
                  <Input placeholder="用户名或邮箱" style={{ width: 200 }} />
                </Form.Item>
                
                <Form.Item name="role" label="角色">
                  <Select placeholder="选择角色" style={{ width: 150 }} allowClear>
                    <Option value={UserRole.Administrator}>管理员</Option>
                    <Option value={UserRole.User}>普通用户</Option>
                  </Select>
                </Form.Item>
                
                <Form.Item name="dateRange" label="注册时间">
                  <RangePicker style={{ width: 250 }} />
                </Form.Item>
                
                <Form.Item>
                  <Space>
                    <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                      筛选
                    </Button>
                    <Button icon={<ClearOutlined />} onClick={handleClearFilters}>
                      清除
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
            <Divider style={{ margin: '16px 0' }} />
          </>
        )}

        <Table
          rowKey="id"
          columns={columns}
          dataSource={users}
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

      {/* 创建/编辑用户模态框 */}
      <Modal
        title={modalTitle}
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => setIsModalVisible(false)}
        okText={editingUser ? "更新" : "创建"}
        cancelText="取消"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ role: UserRole.User }}
        >
          <Form.Item
            name="userName"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          
          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input placeholder="邮箱地址" />
          </Form.Item>
          
          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码长度至少为6个字符' }
              ]}
            >
              <Input.Password placeholder="密码" />
            </Form.Item>
          )}
          
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="选择用户角色">
              <Option value={UserRole.Administrator}>管理员</Option>
              <Option value={UserRole.User}>普通用户</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
