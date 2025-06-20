import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Button, Card, Space, Modal, message, Typography,
  Row, Col, Image, Form, Input, Avatar, 
  Select, Tag, Tooltip, Spin, Empty, Statistic,
  Popconfirm
} from 'antd';
import {
  UserOutlined, ReloadOutlined, PlayCircleOutlined,
  EditOutlined, TeamOutlined, MergeCellsOutlined,
  ExclamationCircleOutlined, EyeOutlined, DeleteOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import {
  getFaceClusters, updateCluster, startFaceClustering, mergeClusters,
  getPicturesByCluster, deleteCluster, getClusterStatistics, getUsers,
  type FaceClusterResponse, type UpdateClusterRequest, type FaceClusterStatistics
} from '../../../api';
import type { PictureResponse } from '../../../api/pictureApi';
import { useOutletContext } from 'react-router';
import type { Breakpoint } from 'antd';

const { Title, Text } = Typography;
const { confirm } = Modal;

interface User {
  id: number;
  username: string;
  email: string;
}

const FaceManagement: React.FC = () => {
  const { isMobile } = useOutletContext<{ isMobile: boolean }>();

  const [clusters, setClusters] = useState<FaceClusterResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [clusteringLoading, setClusteringLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [users, setUsers] = useState<User[]>([]);
  const [statistics, setStatistics] = useState<FaceClusterStatistics | null>(null);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isMergeModalVisible, setIsMergeModalVisible] = useState(false);
  const [isPictureModalVisible, setIsPictureModalVisible] = useState(false);
  const [editingCluster, setEditingCluster] = useState<FaceClusterResponse | null>(null);
  const [targetCluster, setTargetCluster] = useState<FaceClusterResponse | null>(null);
  const [clusterPictures, setClusterPictures] = useState<PictureResponse[]>([]);
  const [picturesLoading, setPicturesLoading] = useState(false);
  
  const [editForm] = Form.useForm<UpdateClusterRequest>();
  const [mergeForm] = Form.useForm();

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    try {
      const response = await getUsers();
      if (response.success) {
        setUsers((response.data || []).map(user => ({
          id: user.id,
          username: user.userName ,
          email: user.email
        })));
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    }
  }, []);

  // 获取统计信息
  const fetchStatistics = useCallback(async () => {
    try {
      const response = await getClusterStatistics();
      if (response.success) {
        setStatistics(response.data || null);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  }, []);

  const fetchClusters = useCallback(async (
    page = currentPage, size = pageSize, userId = selectedUserId
  ) => {
    setLoading(true);
    try {
      const response = await getFaceClusters(page, size, userId);
      if (response.success) {
        const actualData = response.data?.data || response.data;
        setClusters(Array.isArray(actualData) ? actualData : []);
        setTotal(response.data?.totalCount || response.totalCount || 0);
      } else {
        message.error(response.message || '获取人脸聚类失败');
        setClusters([]);
        setTotal(0);
      }
    } catch (error) {
      message.error('获取人脸聚类失败，请检查网络连接');
      setClusters([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, selectedUserId]);

  const fetchClusterPictures = useCallback(async (clusterId: number) => {
    setPicturesLoading(true);
    try {
      const response = await getPicturesByCluster(clusterId, 1, 50);
      if (response.success) {
        // 修复：正确提取嵌套的数据结构
        const actualData = response.data?.data || response.data;
        setClusterPictures(Array.isArray(actualData) ? actualData : []);
      } else {
        message.error(response.message || '获取聚类图片失败');
        setClusterPictures([]);
      }
    } catch (error) {
      message.error('获取聚类图片失败');
      setClusterPictures([]);
    } finally {
      setPicturesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClusters();
    fetchUsers();
    fetchStatistics();
  }, [fetchClusters, fetchUsers, fetchStatistics]);

  const handlePageChange = (page: number, size?: number) => {
    setCurrentPage(page);
    if (size) setPageSize(size);
    fetchClusters(page, size || pageSize);
  };

  const handleUserChange = (userId?: number) => {
    setSelectedUserId(userId);
    setCurrentPage(1);
    fetchClusters(1, pageSize, userId);
  };

  const showEditModal = (cluster: FaceClusterResponse) => {
    setEditingCluster(cluster);
    editForm.setFieldsValue({
      personName: cluster.personName,
      description: cluster.description,
    });
    setIsEditModalVisible(true);
  };

  const showMergeModal = (cluster: FaceClusterResponse) => {
    setTargetCluster(cluster);
    mergeForm.resetFields();
    setIsMergeModalVisible(true);
  };

  const showPicturesModal = (cluster: FaceClusterResponse) => {
    setEditingCluster(cluster);
    setIsPictureModalVisible(true);
    fetchClusterPictures(cluster.id);
  };

  const handleEditOk = async () => {
    if (!editingCluster) return;
    
    try {
      const values = await editForm.validateFields();
      setLoading(true);
      const response = await updateCluster(editingCluster.id, values);
      
      if (response.success) {
        message.success('更新聚类信息成功');
        setIsEditModalVisible(false);
        fetchClusters();
      } else {
        message.error(response.message || '更新失败');
      }
    } catch (errorInfo) {
      console.log('Validate Failed:', errorInfo);
    } finally {
      setLoading(false);
    }
  };

  const handleMergeOk = async () => {
    if (!targetCluster) return;
    
    try {
      const values = await mergeForm.validateFields();
      setLoading(true);
      const response = await mergeClusters(targetCluster.id, values.sourceClusterId);
      
      if (response.success) {
        message.success('合并聚类成功');
        setIsMergeModalVisible(false);
        fetchClusters();
      } else {
        message.error(response.message || '合并失败');
      }
    } catch (errorInfo) {
      console.log('Validate Failed:', errorInfo);
    } finally {
      setLoading(false);
    }
  };

  const handleStartClustering = () => {
    confirm({
      title: '开始人脸聚类分析',
      icon: <ExclamationCircleOutlined />,
      content: selectedUserId 
        ? `这将分析用户 ${users.find(u => u.id === selectedUserId)?.username} 的未分类人脸，可能需要一些时间。确定要开始吗？`
        : '这将分析所有用户的未分类人脸，可能需要一些时间。确定要开始吗？',
      async onOk() {
        setClusteringLoading(true);
        try {
          const response = await startFaceClustering(selectedUserId);
          if (response.success) {
            message.success('人脸聚类任务已开始，请稍后刷新查看结果');
            fetchStatistics(); // 刷新统计信息
          } else {
            message.error(response.message || '启动聚类失败');
          }
        } catch (error) {
          message.error('启动聚类失败');
        } finally {
          setClusteringLoading(false);
        }
      }
    });
  };

  const handleDeleteCluster = async (clusterId: number) => {
    try {
      setLoading(true);
      const response = await deleteCluster(clusterId);
      if (response.success) {
        message.success('删除聚类成功');
        fetchClusters();
        fetchStatistics();
      } else {
        message.error(response.message || '删除失败');
      }
    } catch (error) {
      message.error('删除失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { 
      title: 'ID', 
      dataIndex: 'id', 
      key: 'id', 
      width: 80,
      responsive: ['md'] as Breakpoint[] 
    },
    {
      title: '代表图片',
      dataIndex: 'thumbnailPath',
      key: 'thumbnail',
      width: 80,
      render: (path?: string) => (
        path ? (
          <Image 
            width={50} 
            height={50} 
            src={path} 
            style={{ objectFit: 'cover', borderRadius: 8 }} 
            preview={false}
          />
        ) : (
          <Avatar 
            size={50} 
            icon={<UserOutlined />} 
            style={{ backgroundColor: '#f0f0f0', color: '#999' }}
          />
        )
      ),
    },
    {
      title: '聚类名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: FaceClusterResponse) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          {record.personName && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              人物: {record.personName}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      responsive: ['lg'] as Breakpoint[],
      render: (desc?: string) => desc || '-',
    },
    {
      title: '人脸数量',
      dataIndex: 'faceCount',
      key: 'faceCount',
      width: 100,
      render: (count: number) => (
        <Tag color="blue" icon={<TeamOutlined />}>
          {count}
        </Tag>
      ),
    },
    {
      title: '最后更新',
      dataIndex: 'lastUpdatedAt',
      key: 'lastUpdatedAt',
      responsive: ['lg'] as Breakpoint[],
      render: (date: Date) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: any, record: FaceClusterResponse) => (
        <Space size="small" wrap>
          <Tooltip title="查看图片">
            <Button 
              type="link" 
              size="small"
              icon={<EyeOutlined />} 
              onClick={() => showPicturesModal(record)}
            >
              图片
            </Button>
          </Tooltip>
          <Tooltip title="编辑聚类">
            <Button 
              type="link" 
              size="small"
              icon={<EditOutlined />} 
              onClick={() => showEditModal(record)}
            >
              编辑
            </Button>
          </Tooltip>
          <Tooltip title="合并聚类">
            <Button 
              type="link" 
              size="small"
              icon={<MergeCellsOutlined />} 
              onClick={() => showMergeModal(record)}
            >
              合并
            </Button>
          </Tooltip>
          <Popconfirm
            title="删除聚类"
            description={`确定要删除聚类 "${record.name}" 吗？删除后人脸将变为未分类状态。`}
            onConfirm={() => handleDeleteCluster(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除聚类">
              <Button 
                type="link" 
                size="small"
                danger
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="face-management">
      <Row gutter={[16, 16]} align="middle" justify="space-between">
        <Col>
          <Space align="center">
            <TeamOutlined style={{ fontSize: 24 }} />
            <Title level={2} style={{ margin: 0 }}>人脸管理</Title>
          </Space>
          <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
            管理系统中的人脸聚类，识别和标记图片中的人物
          </Text>
        </Col>
      </Row>

      {/* 统计信息卡片 */}
      {statistics && (
        <Card style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col xs={12} sm={6}>
              <Statistic 
                title="总聚类数" 
                value={statistics.totalClusters} 
                prefix={<TeamOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic 
                title="总人脸数" 
                value={statistics.totalFaces} 
                prefix={<UserOutlined />}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic 
                title="未分类人脸" 
                value={statistics.unclusteredFaces} 
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
            <Col xs={12} sm={6}>
              <Statistic 
                title="已命名聚类" 
                value={statistics.namedClusters} 
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
          </Row>
        </Card>
      )}

      <Card style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]} justify="space-between" style={{ marginBottom: 16 }}>
          <Col xs={24} sm={16} md={18}>
            <Space wrap>
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />} 
                onClick={handleStartClustering}
                loading={clusteringLoading}
              >
                {selectedUserId ? '为选定用户聚类' : '开始全局聚类'}
              </Button>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={() => fetchClusters()}
                loading={loading}
              >
                刷新
              </Button>
              <Button 
                icon={<BarChartOutlined />} 
                onClick={fetchStatistics}
              >
                刷新统计
              </Button>
            </Space>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Select
              placeholder="选择用户筛选"
              style={{ width: '100%' }}
              allowClear
              value={selectedUserId}
              onChange={handleUserChange}
              options={[
                { value: undefined, label: '所有用户' },
                ...users.map(user => ({
                  value: user.id,
                  label: `${user.username} (${user.email})`,
                }))
              ]}
            />
          </Col>
        </Row>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={clusters}
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            onChange: handlePageChange,
            showTotal: (total) => `共 ${total} 个聚类`,
          }}
          size={isMobile ? "small" : "middle"}
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {/* 编辑聚类模态框 */}
      <Modal
        title="编辑聚类信息"
        open={isEditModalVisible}
        onOk={handleEditOk}
        onCancel={() => setIsEditModalVisible(false)}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical">
          <Form.Item name="personName" label="人物姓名">
            <Input placeholder="请输入人物姓名" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} placeholder="请输入描述信息" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 合并聚类模态框 */}
      <Modal
        title={`合并聚类到: ${targetCluster?.name || ''}`}
        open={isMergeModalVisible}
        onOk={handleMergeOk}
        onCancel={() => setIsMergeModalVisible(false)}
        confirmLoading={loading}
        destroyOnClose
      >
        <Form form={mergeForm} layout="vertical">
          <Form.Item 
            name="sourceClusterId" 
            label="选择要合并的源聚类"
            rules={[{ required: true, message: '请选择源聚类' }]}
          >
            <Select
              placeholder="请选择要合并的聚类"
              options={Array.isArray(clusters) ? clusters
                .filter(c => c.id !== targetCluster?.id)
                .map(c => ({
                  value: c.id,
                  label: `${c.name} (${c.faceCount} 个人脸)`,
                })) : []}
            />
          </Form.Item>
          <Text type="secondary">
            合并后，源聚类将被删除，其所有人脸将移动到目标聚类中。
          </Text>
        </Form>
      </Modal>

      {/* 查看聚类图片模态框 */}
      <Modal
        title={`聚类图片: ${editingCluster?.name || ''}`}
        open={isPictureModalVisible}
        onCancel={() => setIsPictureModalVisible(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        <Spin spinning={picturesLoading}>
          {Array.isArray(clusterPictures) && clusterPictures.length > 0 ? (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
              gap: 16,
              maxHeight: 400,
              overflowY: 'auto'
            }}>
              {clusterPictures.map(picture => (
                <div key={picture.id} style={{ textAlign: 'center' }}>
                  <Image
                    width={100}
                    height={100}
                    src={picture.thumbnailPath || picture.path}
                    style={{ 
                      objectFit: 'cover', 
                      borderRadius: 8,
                      border: '1px solid #f0f0f0'
                    }}
                  />
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    marginTop: 4,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {picture.name || `图片${picture.id}`}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Empty description="暂无图片" />
          )}
        </Spin>
      </Modal>
    </div>
  );
};

export default FaceManagement;
