import React from 'react';
import { Card, Space, Typography } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Paragraph } = Typography;

interface ConfigSectionProps {
  title: string;
  icon?: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  isMobile: boolean;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({ title, icon, description, children, isMobile }) => {
  return (
    <Card
      size="small"
      title={
        <Space>
          {icon}
          <span>{title}</span>
        </Space>
      }
      style={{ marginBottom: isMobile ? 16 : 24 }}
      bodyStyle={{ padding: isMobile ? '16px 12px' : '20px 16px' }}
      bordered={true}
    >
      {description && (
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          <InfoCircleOutlined style={{ marginRight: 8 }} />
          {description}
        </Paragraph>
      )}
      {children}
    </Card>
  );
};

export default ConfigSection;
