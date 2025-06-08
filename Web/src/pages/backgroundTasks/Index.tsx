import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Table, Card, Tag, Button, Empty, message } from 'antd';
import { SyncOutlined } from '@ant-design/icons';
import { getUserTasks, TaskExecutionStatus } from '../../api';
import { type TaskDetailsViewModel } from '../../api';
import TaskProgressBar from '../../components/TaskProgressBar';
import dayjs from 'dayjs';
import { Link } from 'react-router';
import type { ColumnType } from 'antd/es/table';

const { Title, Text } = Typography;

// 定义任务类型映射
const taskTypeDisplayMapping: { [key: number]: string } = {
  0: '图片处理',
  1: '视觉识别', // 新增视觉识别任务类型
};

const BackgroundTasks: React.FC = () => {
  const [tasks, setTasks] = useState<TaskDetailsViewModel[]>([]); // Updated type
  const [loading, setLoading] = useState(true);
  const [pollingActive, setPollingActive] = useState(true);
  const [pollingInterval, setPollingIntervalState] = useState<number | null>(null);

  // 加载任务数据
  const fetchTasks = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const result = await getUserTasks();
      if (result.success && result.data) {
        setTasks(result.data);
      } else {
        message.error(result.message || '获取任务列表失败');
      }
    } catch (error) {
      console.error('获取任务失败:', error);
      message.error('加载任务列表时出错');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  // 自动刷新逻辑
  useEffect(() => {
    fetchTasks();

    // 设置轮询
    if (pollingActive) {
      const interval = setInterval(() => fetchTasks(false), 3000); // 轮询时不显示加载动画
      setPollingIntervalState(interval as unknown as number); // 保存 interval ID
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval); // 清除 interval
      }
    };
  }, [fetchTasks, pollingActive]); // 依赖项中移除 pollingInterval

  // 检查是否有活跃的任务，如果没有则停止轮询
  useEffect(() => {
    const hasActiveTasks = tasks.some(
      task => task.status === TaskExecutionStatus.Pending || task.status === TaskExecutionStatus.Processing // 使用数字枚举成员
    );

    if (!hasActiveTasks && pollingActive) {
      setPollingActive(false);
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingIntervalState(null);
      }
    } else if (hasActiveTasks && !pollingActive && tasks.length > 0) { // 确保有任务才重新激活轮询
      setPollingActive(true);
      // 不需要在这里重新创建 interval，上面的 useEffect 会处理
    }
  }, [tasks, pollingActive, pollingInterval, fetchTasks]); // 保持依赖项

  // 渲染状态标签
  const renderStatus = (status: TaskExecutionStatus) => { // status 现在是数字
    let color = '';
    let text = '';
    let icon = null;

    switch (status) {
      case TaskExecutionStatus.Pending: // 使用数字枚举成员
        color = 'orange';
        text = '等待中';
        icon = <SyncOutlined spin />;
        break;
      case TaskExecutionStatus.Processing: // 使用数字枚举成员
        color = 'processing';
        text = '处理中';
        icon = <SyncOutlined spin />;
        break;
      case TaskExecutionStatus.Completed: // 使用数字枚举成员
        color = 'success';
        text = '已完成';
        break;
      case TaskExecutionStatus.Failed: // 使用数字枚举成员
        color = 'error';
        text = '失败';
        break;
      default:
        text = `未知状态 (${status})`;
        break;
    }

    return <Tag color={color} icon={icon}>{text}</Tag>;
  };

  // 格式化日期
  const formatDate = (date: Date | undefined) => {
    if (!date) return '-';
    return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
  };

  // 渲染错误信息

  // 表格列定义
  const columns: ColumnType<TaskDetailsViewModel>[] = [ // Updated type
    {
      title: '任务名称', // Changed title
      dataIndex: 'taskName', // Changed dataIndex
      key: 'taskName',
      render: (text: string, record: TaskDetailsViewModel) => ( // Updated type and logic
        (record.taskType === 0 || record.taskType === 1) && record.relatedEntityId // 检查是否为图片处理或视觉识别任务
          ? <Link to={`/pictures/${record.relatedEntityId}`}>{text}</Link>
          : text
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: TaskExecutionStatus) => renderStatus(status), // status 现在是数字
      filters: [
        { text: '等待中', value: TaskExecutionStatus.Pending }, // 使用数字枚举成员
        { text: '处理中', value: TaskExecutionStatus.Processing }, // 使用数字枚举成员
        { text: '已完成', value: TaskExecutionStatus.Completed }, // 使用数字枚举成员
        { text: '失败', value: TaskExecutionStatus.Failed },   // 使用数字枚举成员
      ],
      onFilter: (value, record: TaskDetailsViewModel) =>
        record.status === (value as TaskExecutionStatus), // value 已经是数字
    },
    {
      title: '任务类型',
      dataIndex: 'taskType',
      key: 'taskType',
      render: (taskType: number | undefined) => // 接收数字类型的 taskType
        taskType !== undefined ? taskTypeDisplayMapping[taskType] || `未知类型 (${taskType})` : '-',
      filters: [ // 可以为任务类型添加筛选器
        { text: '图片处理', value: 0 },
        { text: '视觉识别', value: 1 },
      ],
      onFilter: (value, record: TaskDetailsViewModel) => record.taskType === (value as number),
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number, record: TaskDetailsViewModel) => ( // Updated type
        <TaskProgressBar
          status={record.status}
          progress={progress}
          error={record.error}
          showLabel={false}
          size="small"
          style={{ width: '150px' }}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date) => formatDate(date),
      sorter: (a: TaskDetailsViewModel, b: TaskDetailsViewModel) => // Updated type
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (date: Date | undefined) => formatDate(date), // Ensure date can be undefined
    },
   
  ];

  return (
    <div className="background-tasks-container">
      <div style={{
        marginBottom: 30,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <Title level={2} style={{
            margin: 0,
            marginBottom: 10,
            fontWeight: 600,
            letterSpacing: '0.5px',
            fontSize: 32,
            background: 'linear-gradient(120deg, #000000, #444444)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>任务中心</Title>
          <Text type="secondary" style={{
            fontSize: 16,
            color: '#888',
            letterSpacing: '0.3px'
          }}>查看和管理后台处理任务</Text>
        </div>
        <Button
          type="primary"
          icon={<SyncOutlined />}
          onClick={() => fetchTasks()}
          loading={loading}
        >
          刷新
        </Button>
      </div>

      <Card>
        {tasks.length > 0 ? (
          <Table
            dataSource={tasks}
            columns={columns}
            rowKey="taskId"
            loading={loading}
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Empty
            description={
              loading ? "正在加载..." : "暂无处理任务"
            }
            style={{ margin: '40px 0' }}
          />
        )}
      </Card>
    </div>
  );
};

export default BackgroundTasks;
