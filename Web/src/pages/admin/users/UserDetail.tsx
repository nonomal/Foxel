import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Typography, Button, Space, Descriptions, 
  Avatar, Spin, Tabs, Statistic, message, Tag, Divider,
  Result
} from 'antd';
import { 
  UserOutlined, ArrowLeftOutlined, EditOutlined, 
  PictureOutlined, FileImageOutlined, HeartOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router';
import { getUserById } from '../../../api';
import type { UserResponse } from '../../../api/types';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载用户数据
  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await getUserById(parseInt(id));
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          message.error(response.message || '获取用户信息失败');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        message.error('获取用户信息失败，请检查网络连接');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  // 返回上一页
  const handleBack = () => {
    navigate('/admin/users');
  };

  // 跳转到编辑页面
  const handleEdit = () => {
    navigate(`/admin/users/edit/${id}`);
  };

  // 模拟数据 - 实际项目中应该从API获取
  const userStats = {
    totalPhotos: 125,
    totalAlbums: 14,
    totalFavorites: 48,
    diskUsage: '1.2 GB',
    lastLogin: '2023-10-25 14:32',
    accountAge: '268 天',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" tip="加载用户信息..." />
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <Result
          status="404"
          title="用户不存在"
          subTitle="找不到请求的用户信息"
          extra={
            <Button type="primary" onClick={handleBack}>
              返回用户列表
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div className="user-detail">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
              返回
            </Button>
            <Title level={2} style={{ margin: 0 }}>用户详情</Title>
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar size={100} icon={<UserOutlined />} />
              <Title level={3} style={{ marginTop: 16, marginBottom: 0 }}>
                {user.userName}
              </Title>
              <Text type="secondary">{user.email}</Text>
              <div style={{ margin: '16px 0' }}>
                <Tag color={user.role === 'Administrator' ? 'red' : 'blue'}>
                  {user.role || '访客'}
                </Tag>
              </div>
              <Button type="primary" icon={<EditOutlined />} onClick={handleEdit}>
                编辑用户
              </Button>
            </div>
            
            <Divider />
            
            <Descriptions title="账户信息" column={1}>
              <Descriptions.Item label="用户ID">{user.id}</Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {new Date(user.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="最近登录">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : '未登录'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        
        <Col xs={24} lg={16}>
          <Card>
            <Tabs defaultActiveKey="1">
              <TabPane 
                tab={<span><PictureOutlined />数据统计</span>} 
                key="1"
              >
                <Row gutter={[16, 16]}>
                  <Col xs={12} sm={8}>
                    <Statistic 
                      title="照片数量" 
                      value={userStats.totalPhotos}
                      prefix={<FileImageOutlined />} 
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic 
                      title="相册数量" 
                      value={userStats.totalAlbums}
                      prefix={<PictureOutlined />} 
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic 
                      title="收藏数量" 
                      value={userStats.totalFavorites}
                      prefix={<HeartOutlined />} 
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic 
                      title="存储使用" 
                      value={userStats.diskUsage}
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic 
                      title="最近登录" 
                      value={userStats.lastLogin}
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic 
                      title="账户年龄" 
                      value={userStats.accountAge}
                    />
                  </Col>
                </Row>
              </TabPane>
              
              <TabPane 
                tab={<span><FileImageOutlined />最近照片</span>} 
                key="2"
              >
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                  <Text type="secondary">此功能在开发中</Text>
                </div>
              </TabPane>
              
              <TabPane 
                tab={<span><PictureOutlined />最近相册</span>} 
                key="3"
              >
                <div style={{ padding: '20px 0', textAlign: 'center' }}>
                  <Text type="secondary">此功能在开发中</Text>
                </div>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default UserDetail;
