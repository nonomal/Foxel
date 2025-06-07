import React from 'react';
import { Progress, Tag, Tooltip } from 'antd';
import { 
  ClockCircleOutlined, 
  SyncOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined 
} from '@ant-design/icons';
import { TaskExecutionStatus } from '../api';

interface TaskProgressBarProps {
  status: TaskExecutionStatus; // status 现在是数字
  progress: number;
  error?: string;
  showLabel?: boolean;
  size?: 'small' | 'default';
  className?: string;
  style?: React.CSSProperties;
}

const TaskProgressBar: React.FC<TaskProgressBarProps> = ({
  status,
  progress,
  error,
  showLabel = true,
  size = 'default',
  className,
  style
}) => {
  let statusColor = '';
  let icon = null;
  let statusText = '';
  let progressStatus: "success" | "exception" | "active" | "normal" | undefined;
  
  switch (status) { // status 现在是数字
    case TaskExecutionStatus.Pending: // 使用数字枚举成员
      statusColor = 'orange';
      progressStatus = 'normal';
      icon = <ClockCircleOutlined />;
      statusText = '等待中';
      break;
    case TaskExecutionStatus.Processing: // 使用数字枚举成员
      statusColor = 'processing';
      progressStatus = 'active';
      icon = <SyncOutlined spin />;
      statusText = '处理中';
      break;
    case TaskExecutionStatus.Completed: // 使用数字枚举成员
      statusColor = 'success';
      progressStatus = 'success';
      icon = <CheckCircleOutlined />;
      statusText = '已完成';
      break;
    case TaskExecutionStatus.Failed: // 使用数字枚举成员
      statusColor = 'error';
      progressStatus = 'exception';
      icon = <CloseCircleOutlined />;
      statusText = '失败';
      break;
  }
  
  return (
    <div className={className} style={{ ...style }}>
      {showLabel && (
        <div style={{ marginBottom: 4, display: 'flex', alignItems: 'center' }}>
          <Tag color={statusColor} icon={icon} style={{ marginRight: 8 }}>
            {statusText}
          </Tag>
          {status === TaskExecutionStatus.Failed && error && ( // 使用数字枚举成员
            <Tooltip title={error}>
              <span style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 13 }}>
                查看错误
              </span>
            </Tooltip>
          )}
        </div>
      )}
      <Tooltip title={`${progress}%`}>
        <Progress 
          percent={progress} 
          size={size} 
          status={progressStatus}
          showInfo={size !== 'small'}
          strokeColor={status === TaskExecutionStatus.Failed ? '#ff4d4f' : undefined} // 使用数字枚举成员
        />
      </Tooltip>
    </div>
  );
};

export default TaskProgressBar;
