import React from 'react';
import { Form, Input, Button, Space, Row, Col, Tooltip } from 'antd';
import { SaveOutlined, QuestionCircleOutlined, LockOutlined } from '@ant-design/icons';

interface ConfigGroupProps {
  groupName: string;
  configs: {
    [key: string]: string;
  };
  onSave: (group: string, key: string, value: string) => Promise<void>;
  descriptions: {
    [key: string]: string;
  };
  secretFields?: string[]; 
  isMobile?: boolean;
}

const ConfigGroup: React.FC<ConfigGroupProps> = ({
  groupName,
  configs,
  onSave,
  descriptions,
  secretFields = [], 
  isMobile = false
}) => {
  const [form] = Form.useForm();

  // 保存单个配置项
  const handleSaveSingle = async (key: string) => {
    try {
      const value = form.getFieldValue(key);
      await onSave(groupName, key, value);
    } catch (error) {
      console.error('保存配置失败:', error);
    }
  };

  // 保存所有配置项
  const handleSaveAll = async () => {
    try {
      const values = form.getFieldsValue();
      for (const key in values) {
        await onSave(groupName, key, values[key]);
      }
    } catch (error) {
      console.error('保存所有配置失败:', error);
    }
  };

  const isSecretField = (key: string): boolean => {
    return secretFields.includes(key);
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={configs}
      size={isMobile ? "middle" : "large"}
    >
      {Object.keys(configs).map(key => {
        const isSecret = isSecretField(key);
        
        return (
          <Row key={key} gutter={isMobile ? [8, 8] : [16, 16]} align="middle">
            <Col xs={24} lg={16}>
              <Form.Item
                name={key}
                label={
                  <Space>
                    {key}
                    {isSecret && <LockOutlined style={{ color: '#faad14' }} />}
                    {descriptions[key] && (
                      <Tooltip title={descriptions[key]}>
                        <QuestionCircleOutlined />
                      </Tooltip>
                    )}
                  </Space>
                }
                extra={isSecret && 
                  <div style={{ fontSize: '12px', color: '#faad14', marginTop: '4px' }}>
                    此为私密字段，出于安全考虑不显示实际值。如需修改，请输入新值。
                  </div>
                }
              >
                {isSecret ? (
                  <Input.Password 
                    placeholder={configs[key] === '' ? '请输入新值' : '******（已设置，输入新值以更新）'} 
                  />
                ) : (
                  <Input placeholder={`请输入${key}`} />
                )}
              </Form.Item>
            </Col>
            <Col xs={24} lg={8} style={{ 
              textAlign: isMobile ? 'left' : 'right',
              marginTop: isMobile ? -10 : 0,
              marginBottom: isMobile ? 10 : 0
            }}>
              <Button 
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => handleSaveSingle(key)}
                style={{ 
                  marginBottom: isMobile ? 16 : 24,
                  width: isMobile ? '100%' : 'auto'
                }}
                size={isMobile ? "middle" : "large"}
              >
                保存
              </Button>
            </Col>
          </Row>
        );
      })}

      <Form.Item>
        <Button
          type="primary"
          onClick={handleSaveAll}
          style={{ marginTop: isMobile ? 8 : 16 }}
          block
          size={isMobile ? "middle" : "large"}
        >
          保存所有
        </Button>
      </Form.Item>
    </Form>
  );
};

export default ConfigGroup;
