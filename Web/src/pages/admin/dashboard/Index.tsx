import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Statistic, Table, Button, Spin, Typography, Space, Tag, message } from 'antd';
import {
  UserOutlined,
  PictureOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  ArrowUpOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useOutletContext } from 'react-router';
import { useNavigate } from 'react-router';
import { getUsers, getManagementPictures } from '../../../api';
import type { UserResponse, PictureResponse } from '../../../api/types';

const { Title, Text } = Typography;

interface DashboardStats {
  totalUsers: number;
  totalAlbums: number;
  totalPhotos: number;
  storageUsagePercentage: number;
  newUsersToday: number;
  newPhotosToday: number;
  softwareVersion: string; 
  systemVersion: string;  
  cpuArchitecture: string; 
}

const AdminDashboard: React.FC = () => {
  const { isMobile } = useOutletContext<{ isMobile: boolean; isAdminPanel?: boolean }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAlbums: 0,
    totalPhotos: 0,
    storageUsagePercentage: 0,
    newUsersToday: 0,
    newPhotosToday: 0,
    softwareVersion: 'N/A',
    systemVersion: 'N/A',
    cpuArchitecture: 'N/A'
  });
  const [recentUsers, setRecentUsers] = useState<UserResponse[]>([]);
  const [recentPhotos, setRecentPhotos] = useState<PictureResponse[]>([]);

  // 获取最近用户数据
  const fetchRecentUsers = async () => {
    try {
      const response = await getUsers({
        page: 1,
        pageSize: 5
      });
      if (response.success && response.data) {
        setRecentUsers(response.data);
        // 更新用户总数统计
        setStats(prev => ({
          ...prev,
          totalUsers: response.totalCount || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching recent users:', error);
      message.error('获取最近用户数据失败');
    }
  };

  // 获取最近图片数据
  const fetchRecentPhotos = async () => {
    try {
      const response = await getManagementPictures(1, 5); // 获取最近5张图片
      if (response.success && response.data) {
        setRecentPhotos(response.data);
        // 更新图片总数统计
        setStats(prev => ({
          ...prev,
          totalPhotos: response.totalCount || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching recent photos:', error);
      message.error('获取最近图片数据失败');
    }
  };

  // 计算今日新增数据
  const calculateTodayStats = (users: UserResponse[], photos: PictureResponse[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const newUsersToday = users.filter(user => {
      const userDate = new Date(user.createdAt);
      userDate.setHours(0, 0, 0, 0);
      return userDate.getTime() === today.getTime();
    }).length;

    const newPhotosToday = photos.filter(photo => {
      const photoDate = new Date(photo.createdAt);
      photoDate.setHours(0, 0, 0, 0);
      return photoDate.getTime() === today.getTime();
    }).length;

    setStats(prev => ({
      ...prev,
      newUsersToday,
      newPhotosToday
    }));
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchRecentUsers(), fetchRecentPhotos()]);
        
        // 设置其他静态统计数据
        setStats(prev => ({
          ...prev,
          totalAlbums: 348, // 相册功能暂未实现，使用模拟数据
          storageUsagePercentage: 68,
          softwareVersion: 'Foxel Dev 尝鲜版', 
          systemVersion: 'Fedora 42', 
          cpuArchitecture: 'x86_64' 
        }));
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 当用户和图片数据都加载完成后计算今日统计
  useEffect(() => {
    if (recentUsers.length > 0 && recentPhotos.length > 0) {
      calculateTodayStats(recentUsers, recentPhotos);
    }
  }, [recentUsers, recentPhotos]);

  const userColumns = useMemo<ColumnsType<UserResponse>>(() => [
    {
      title: '用户名',
      dataIndex: 'userName',
      key: 'userName',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      responsive: ['md'],
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['lg'],
      render: (date: Date) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate('/admin/users')}
        >
          查看
        </Button>
      ),
    },
  ], [navigate]);

  const photoColumns = useMemo<ColumnsType<PictureResponse>>(() => [
    {
      title: '图片名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '上传者',
      dataIndex: 'username',
      key: 'username',
      responsive: ['md'],
    },
    {
      title: '上传时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      responsive: ['lg'],
      render: (date: Date) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate('/admin/pictures')}
        >
          查看
        </Button>
      ),
    },
  ], [navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <Title level={2}>控制面板</Title>
      <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>
        欢迎使用 Foxel 管理后台，这里可以查看系统概况和管理系统资源。
      </Text>

      <Row gutter={[24, 24]}>
        {/* 左侧内容区域 */}
        <Col xs={24} lg={18}>
          {/* 主要统计卡片 */}
          <Row gutter={[16, 16]}>
            <Col xs={12} md={8}>
              <Card variant="outlined">
                <Statistic
                  title="用户总数"
                  value={stats.totalUsers}
                  prefix={<UserOutlined />}
                  suffix={
                    <Tag color="green" style={{ marginLeft: 8 }}>
                      <ArrowUpOutlined /> {stats.newUsersToday} 今日
                    </Tag>
                  }
                />
              </Card>
            </Col>
            <Col xs={12} md={8}>
              <Card variant="outlined">
                <Statistic
                  title="相册总数"
                  value={stats.totalAlbums}
                  prefix={<PictureOutlined />}
                />
              </Card>
            </Col>
            <Col xs={12} md={8}>
              <Card variant="outlined">
                <Statistic
                  title="照片总数"
                  value={stats.totalPhotos}
                  prefix={<PictureOutlined />}
                  suffix={
                    <Tag color="green" style={{ marginLeft: 8 }}>
                      <ArrowUpOutlined /> {stats.newPhotosToday} 今日
                    </Tag>
                  }
                />
              </Card>
            </Col>
          </Row>

          {/* 最近活动 */}
          <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
            <Col xs={24} xl={12}>
              <Card
                title={
                  <Space>
                    <UserOutlined />
                    <span>最近注册用户</span>
                  </Space>
                }
                extra={<Button type="link" onClick={() => navigate('/admin/users')}>查看全部</Button>}
                variant="outlined"
              >
                <Table
                  columns={userColumns}
                  dataSource={recentUsers}
                  rowKey="id"
                  pagination={false}
                  size={isMobile ? "small" : "middle"}
                />
              </Card>
            </Col>
            <Col xs={24} xl={12}>
              <Card
                title={
                  <Space>
                    <PictureOutlined />
                    <span>最近上传图片</span>
                  </Space>
                }
                extra={<Button type="link" onClick={() => navigate('/admin/pictures')}>查看全部</Button>}
                variant="outlined"
              >
                <Table
                  columns={photoColumns}
                  dataSource={recentPhotos}
                  rowKey="id"
                  pagination={false}
                  size={isMobile ? "small" : "middle"}
                />
              </Card>
            </Col>
          </Row>
        </Col>

        {/* 右侧内容区域 */}
        <Col xs={24} lg={6}>
          {/* 系统状态 */}
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                <span>系统状态</span>
              </Space>
            }
            variant="outlined"
          >
            <Row gutter={[16, 24]}>
              <Col span={24}>
                <Statistic
                  title="软件版本"
                  value={stats.softwareVersion}
                  prefix={<InfoCircleOutlined />}
                  valueStyle={{ fontSize: '1em' }} 
                />
              </Col>
              <Col span={24}>
                <Statistic
                  title="操作系统"
                  value={stats.systemVersion}
                  prefix={<InfoCircleOutlined />}
                  valueStyle={{ fontSize: '1em' }}
                />
              </Col>
              <Col span={24}>
                <Statistic
                  title="CPU架构"
                  value={stats.cpuArchitecture}
                  prefix={<InfoCircleOutlined />}
                  valueStyle={{ fontSize: '1em' }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboard;
