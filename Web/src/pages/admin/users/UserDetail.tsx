import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Typography, Button, Space, Descriptions, 
  Spin, Tabs, Statistic, message, Tag, Divider,
  Result
} from 'antd';
import { 
  ArrowLeftOutlined, 
  PictureOutlined, FileImageOutlined, HeartOutlined,
  FolderOutlined, HddOutlined, CalendarOutlined
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router';
import { getUserDetail } from '../../../api';
import type { UserDetailResponse } from '../../../api';
import UserAvatar from '../../../components/UserAvatar';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const UserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [user, setUser] = useState<UserDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // 加载用户数据
  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await getUserDetail(parseInt(id));
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

  // 格式化存储大小
  const formatDiskUsage = (mb: number): string => {
    if (mb < 1024) {
      return `${mb.toFixed(1)} MB`;
    }
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  // 格式化账户年龄
  const formatAccountAge = (days: number): string => {
    if (days < 30) {
      return `${days} 天`;
    } else if (days < 365) {
      return `${Math.floor(days / 30)} 个月`;
    } else {
      return `${Math.floor(days / 365)} 年 ${Math.floor((days % 365) / 30)} 个月`;
    }
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
              <UserAvatar size={100} email={user.email} />
              <Title level={3} style={{ marginTop: 16, marginBottom: 0 }}>
                {user.userName}
              </Title>
              <Text type="secondary">{user.email}</Text>
              <div style={{ margin: '16px 0' }}>
                <Tag color={user.role === 'Administrator' ? 'red' : 'blue'}>
                  {user.role || '访客'}
                </Tag>
              </div>
            </div>
            
            <Divider />
            
            <Descriptions title="账户信息" column={1}>
              <Descriptions.Item label="用户ID">{user.id}</Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {new Date(user.createdAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="账户年龄">
                {formatAccountAge(user.statistics.accountAgeDays)}
              </Descriptions.Item>
              <Descriptions.Item label="存储使用量">
                {formatDiskUsage(user.statistics.diskUsageMB)}
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
                      value={user.statistics.totalPictures}
                      prefix={<FileImageOutlined />} 
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic 
                      title="相册数量" 
                      value={user.statistics.totalAlbums}
                      prefix={<FolderOutlined />} 
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic 
                      title="收藏数量" 
                      value={user.statistics.totalFavorites}
                      prefix={<HeartOutlined />} 
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic 
                      title="被收藏数量" 
                      value={user.statistics.favoriteReceivedCount}
                      prefix={<HeartOutlined style={{ color: '#ff4d4f' }} />} 
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic 
                      title="存储使用量" 
                      value={formatDiskUsage(user.statistics.diskUsageMB)}
                      prefix={<HddOutlined />} 
                    />
                  </Col>
                  <Col xs={12} sm={8}>
                    <Statistic 
                      title="账户年龄" 
                      value={formatAccountAge(user.statistics.accountAgeDays)}
                      prefix={<CalendarOutlined />}
                    />
                  </Col>
                </Row>
              </TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default UserDetail;
