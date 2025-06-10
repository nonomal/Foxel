import React from 'react';
import { Row, Col, Form, Input, Button, Space, Tooltip, Switch } from 'antd';
import { LockOutlined, QuestionCircleOutlined, SaveOutlined } from '@ant-design/icons';

interface ConfigFormItemProps {
  groupName: string;
  itemKey: string;
  description: string;
  isSecret: boolean;
  currentValue: string | undefined;
  formInstance: any;
  isMobile: boolean;
  onSave: (formInstance: any, groupName: string, key: string) => Promise<void>;
}

const ConfigFormItem: React.FC<ConfigFormItemProps> = ({
  groupName,
  itemKey,
  description,
  isSecret,
  currentValue,
  formInstance,
  isMobile,
  onSave,
}) => {
  const booleanAppSettings = ['EnableRegistration', 'EnableAnonymousImageHosting'];
  const isBooleanAppSetting = groupName === 'AppSettings' && booleanAppSettings.includes(itemKey);

  return (
    <Row key={itemKey} gutter={isMobile ? [8, 8] : [16, 16]} align="top" style={{ marginBottom: isMobile ? 8 : 16 }}>
      <Col xs={24} sm={isMobile ? 24 : 16} md={isMobile ? 24 : 17} lg={isMobile ? 24 : 18}>
        <Form.Item
          name={itemKey}
          label={
            <Space align="center">
              <span style={{ fontWeight: 500 }}>{itemKey}</span>
              {isSecret && !isBooleanAppSetting && <LockOutlined style={{ color: '#faad14' }} />}
              {description && (
                <Tooltip title={description}>
                  <QuestionCircleOutlined style={{ cursor: 'help', color: '#aaa' }} />
                </Tooltip>
              )}
            </Space>
          }
          initialValue={
            isBooleanAppSetting
              ? currentValue === 'true'
              : isSecret
              ? ''
              : currentValue
          }
          valuePropName={isBooleanAppSetting ? 'checked' : undefined}
          rules={isSecret || isBooleanAppSetting ? [] : []}
          style={{ marginBottom: isMobile ? 8 : 16 }}
          help={
            isBooleanAppSetting
              ? null
              : isSecret && currentValue
              ? <span style={{ fontSize: '12px', color: '#999' }}>当前已设置值。如需修改，请输入新值。</span>
              : isSecret
              ? <span style={{ fontSize: '12px', color: '#999' }}>此为私密字段。</span>
              : null
          }
        >
          {isBooleanAppSetting ? (
            <Switch />
          ) : isSecret ? (
            <Input.Password
              placeholder={currentValue ? '******（输入新值以更新）' : '请输入新值'}
              style={{ maxWidth: 400 }}
            />
          ) : (
            <Input placeholder={`请输入 ${itemKey}`} style={{ maxWidth: 400 }} />
          )}
        </Form.Item>
      </Col>
      <Col xs={24} sm={isMobile ? 24 : 8} md={isMobile ? 24 : 7} lg={isMobile ? 24 : 6}
        style={{ textAlign: isMobile ? 'left' : 'right', paddingTop: isMobile ? 0 : '30px' }}>
        <Button
          icon={<SaveOutlined />}
          type="primary"
          ghost
          onClick={() => onSave(formInstance, groupName, itemKey)}
          size="middle"
          style={{ width: isMobile ? '100%' : 'auto', marginBottom: isMobile ? 16 : 0 }}
        >
          保存
        </Button>
      </Col>
    </Row>
  );
};

export default ConfigFormItem;
