import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, Row, Col, Card, message, Alert } from 'antd';
import { UserOutlined, LockOutlined, GithubOutlined, LinkOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router';
import { bindAccount, BindType } from '../../api';
import useIsMobile from '../../hooks/useIsMobile';

const { Title, Text } = Typography;

const Bind: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    const githubId = searchParams.get('githubId');
    const linuxdoId = searchParams.get('linuxdoId');
    const thirdPartyUserId = githubId || linuxdoId;
    const bindType = githubId ? BindType.GitHub : BindType.LinuxDo; 

    useEffect(() => {
        // 检查是否有必要的参数
        if (!thirdPartyUserId) {
            message.error('缺少必要的绑定参数');
            navigate('/login');
        }
    }, [thirdPartyUserId, navigate]);

    const onFinish = async (values: any) => {
        if (!thirdPartyUserId) {
            message.error('缺少第三方用户ID');
            return;
        }

        setLoading(true);
        try {
            const response = await bindAccount({
                email: values.email,
                password: values.password,
                bindType: bindType,
                thirdPartyUserId: thirdPartyUserId
            });

            if (response.success && response.data) {
                message.success(response.message || '账户绑定成功！');
                navigate('/');
            } else {
                message.error(response.message || '绑定失败，请检查邮箱和密码');
            }
        } catch (error) {
            console.error('绑定出错:', error);
            message.error('绑定过程中出现错误，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    const getBindTypeIcon = () => {
        switch (bindType) {
            case BindType.GitHub:
                return <GithubOutlined style={{ fontSize: '24px', color: '#24292e' }} />;
            case BindType.LinuxDo:
                return <img src="/images/linuxdo.svg" alt="LinuxDo" style={{ width: '32px', height: '32px' }} />;
            default:
                return <LinkOutlined style={{ fontSize: '24px' }} />;
        }
    };

    const getBindTypeText = () => {
        switch (bindType) {
            case BindType.GitHub:
                return 'GitHub';
            case BindType.LinuxDo:
                return 'LinuxDo';
            default:
                return '第三方';
        }
    };

    if (!thirdPartyUserId) {
        return null;
    }

    return (
        <Row style={{ minHeight: '100vh', backgroundColor: '#f5f5f5', padding: isMobile ? '20px' : '40px' }}>
            <Col
                xs={24}
                sm={20}
                md={16}
                lg={12}
                xl={8}
                style={{
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Card
                    style={{
                        width: '100%',
                        maxWidth: '500px',
                        borderRadius: '12px',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                        border: 'none'
                    }}
                    bodyStyle={{ padding: isMobile ? '24px' : '40px' }}
                >
                    <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                        <div style={{ marginBottom: '16px' }}>
                            {getBindTypeIcon()}
                        </div>
                        <Title level={2} style={{
                            marginBottom: '8px',
                            fontWeight: 700,
                            color: '#18181b'
                        }}>
                            绑定{getBindTypeText()}账户
                        </Title>
                        <Text style={{ fontSize: '16px', color: '#666' }}>
                            请输入您的Foxel账户信息来绑定{getBindTypeText()}账户
                        </Text>
                    </div>

                    <Alert
                        message="账户绑定说明"
                        description={
                            <div>
                                <p>• 如果您已有Foxel账户，请输入邮箱和密码进行绑定</p>
                                <p>• 如果您还没有Foxel账户，系统将自动为您创建一个新账户</p>
                                <p>• 绑定后您可以使用{getBindTypeText()}账户快速登录</p>
                            </div>
                        }
                        type="info"
                        showIcon
                        style={{ marginBottom: '24px' }}
                    />

                    <Form
                        name="bind_form"
                        onFinish={onFinish}
                        size="large"
                        layout="vertical"
                    >
                        <Form.Item
                            label="邮箱"
                            name="email"
                            rules={[
                                { required: true, message: '请输入您的邮箱' },
                                { type: 'email', message: '请输入有效的邮箱地址' }
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
                                placeholder="请输入邮箱地址"
                                style={{
                                    height: '48px',
                                    borderRadius: '8px'
                                }}
                            />
                        </Form.Item>

                        <Form.Item
                            label="密码"
                            name="password"
                            rules={[
                                { required: true, message: '请输入您的密码' },
                                { min: 6, message: '密码长度不能少于6位' }
                            ]}
                        >
                            <Input.Password
                                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                                placeholder="请输入密码（6位以上）"
                                style={{
                                    height: '48px',
                                    borderRadius: '8px'
                                }}
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: '16px' }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                style={{
                                    width: '100%',
                                    height: '48px',
                                    borderRadius: '8px',
                                    fontWeight: 500,
                                    fontSize: '16px'
                                }}
                            >
                                {loading ? '绑定中...' : `绑定${getBindTypeText()}账户`}
                            </Button>
                        </Form.Item>

                        <div style={{ textAlign: 'center' }}>
                            <Button
                                type="link"
                                onClick={() => navigate('/login')}
                                style={{ padding: '0', color: '#666' }}
                            >
                                返回登录页面
                            </Button>
                        </div>
                    </Form>
                </Card>
            </Col>
        </Row>
    );
};

export default Bind;
