import React, { useRef, useState } from 'react';
import { Layout, Button, Dropdown, Space, theme, Breadcrumb, Input } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
    LogoutOutlined,
    DashboardOutlined,
    HomeOutlined,
    RightOutlined,
    SearchOutlined
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { type RouteConfig } from '../../routes';
import UserAvatar from '../../components/UserAvatar';
import { UserRole } from '../../api/types';
import SearchDialog from '../../components/search/SearchDialog';

const { Header: AntHeader } = Layout;
interface HeaderProps {
    collapsed: boolean;
    toggleCollapsed: () => void;
    onLogout: () => void;
    currentRouteData: {
        routeInfo?: RouteConfig;
        params?: Record<string, string>;
        title?: string;
    };
    isMobile?: boolean;
}

// 面包屑项目类型定义
interface BreadcrumbItem {
    title: string;
    href?: string;
    icon?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({
    collapsed,
    toggleCollapsed,
    onLogout,
    currentRouteData,
    isMobile = false
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const headerRef = useRef<HTMLDivElement>(null);
    const { hasRole } = useAuth();

    // 添加搜索对话框状态
    const [searchDialogVisible, setSearchDialogVisible] = useState(false);
    const [searchText, setSearchText] = useState('');

    const {
        token: { colorBgContainer },
    } = theme.useToken();

    // 用户菜单项
    const userMenuItems = [
        {
            key: 'profile',
            icon: <UserOutlined />,
            label: '个人中心',
            onClick: () => navigate('/settings')
        },
        ...(hasRole(UserRole.Administrator) ? [
            {
                key: 'admin',
                icon: <DashboardOutlined />,
                label: '后台管理',
                onClick: () => navigate('/admin')
            }
        ] : []),
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
            onClick: onLogout
        }
    ];

    // 根据路由信息生成面包屑导航
    const renderBreadcrumb = () => {
        // 如果有传入的标题，直接使用标题作为面包屑
        if (currentRouteData.title) {
            return (
                <Breadcrumb
                    separator={<RightOutlined style={{ fontSize: 12 }} />}
                    style={{ margin: 0 }}
                    items={[
                        {
                            title: '首页',
                            href: '/',
                        },
                        {
                            title: currentRouteData.title
                        }
                    ]}
                />
            );
        }

        // 如果没有路由信息，返回首页面包屑
        if (!currentRouteData.routeInfo) {
            return (
                <Breadcrumb
                    separator={<RightOutlined style={{ fontSize: 12 }} />}
                    style={{ margin: 0 }}
                    items={[
                        {
                            title: '首页',
                            href: '/',
                        }
                    ]}
                />
            );
        }

        // 获取当前路由信息
        const { routeInfo, params } = currentRouteData;
        const breadcrumb = routeInfo.breadcrumb;

        if (!breadcrumb) {
            return (
                <Breadcrumb
                    separator={<RightOutlined style={{ fontSize: 12 }} />}
                    style={{ margin: 0 }}
                    items={[
                        {
                            title: '首页',
                            href: '/',
                        },
                        {
                            title: routeInfo.label
                        }
                    ]}
                />
            );
        }

        // 准备面包屑项目
        const breadcrumbItems: BreadcrumbItem[] = [
            {
                title: routeInfo.area === 'admin' ? '管理后台' : '首页',
                href: routeInfo.area === 'admin' ? '/admin' : '/',
                icon: routeInfo.area === 'admin' ? <DashboardOutlined /> : <HomeOutlined />
            }
        ];

        // 如果有父级，添加父级面包屑
        if (breadcrumb.parent) {
            const parentPath = routeInfo.area === 'admin'
                ? `/admin/${breadcrumb.parent}`
                : `/${breadcrumb.parent}`;

            breadcrumbItems.push({
                title: breadcrumb.parent.charAt(0).toUpperCase() + breadcrumb.parent.slice(1),
                href: parentPath
            });
        }

        // 获取动态标题
        let title = breadcrumb.title;
        if (params && Object.keys(params).length > 0) {
            // 用参数替换标题中的占位符，如 ":id"
            Object.entries(params).forEach(([key, value]) => {
                title = title.replace(`:${key}`, value);
            });
        }

        // 添加当前页面面包屑
        breadcrumbItems.push({
            title: title
        });

        return (
            <Breadcrumb
                separator={<RightOutlined style={{ fontSize: 12 }} />}
                style={{ margin: 0 }}
                items={breadcrumbItems.map(item => ({
                    title: item.href ? (
                        <Link to={item.href} style={{ color: '#666', fontSize: isMobile ? 13 : 14 }}>
                            {item.icon && <span style={{ marginRight: 4 }}>{item.icon}</span>}
                            {isMobile && !item.icon ? '' : item.title}
                        </Link>
                    ) : (
                        <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 500 }}>
                            {item.icon && <span style={{ marginRight: 4 }}>{item.icon}</span>}
                            {item.title}
                        </span>
                    ),
                }))}
            />
        );
    };

    // 处理搜索
    const handleSearch = (value: string) => {
        setSearchText(value);
        setSearchDialogVisible(true);
    };

    // 关闭搜索对话框
    const handleSearchDialogClose = () => {
        setSearchDialogVisible(false);
    };

    return (
        <AntHeader
            ref={headerRef}
            style={{
                padding: isMobile ? '0 12px' : '0 24px',
                background: colorBgContainer,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: isMobile ? 56 : 64,
                borderBottom: '1px solid #f0f0f0',
                zIndex: 100,
                position: 'sticky',
                top: 0
            }}
        >
            {/* 左侧区域：折叠按钮和面包屑 */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <Button
                    type="text"
                    icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                    onClick={toggleCollapsed}
                    style={{
                        fontSize: '16px',
                        width: 36,
                        height: 36,
                        marginRight: 12
                    }}
                />
                {renderBreadcrumb()}
            </div>

            {/* 右侧区域：搜索框和用户菜单 */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
                {/* 搜索框 */}
                <div style={{
                    marginRight: 16,
                    display: 'flex',
                    alignItems: 'center',
                    height: '100%'
                }}>
                    <Input.Search
                        placeholder="搜索图片..."
                        onSearch={handleSearch}
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{
                            width: isMobile ? 150 : 220,
                            borderRadius: 4
                        }}
                        size={isMobile ? "middle" : "large"}
                        allowClear
                        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                    />
                </div>

                {/* 用户菜单 */}
                <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                    <Space style={{ cursor: 'pointer' }}>
                        <UserAvatar
                            size={isMobile ? 36 : 46}
                            email={user?.email}
                            text={user?.userName}
                        />
                    </Space>
                </Dropdown>
            </div>

            {/* 搜索对话框 */}
            <SearchDialog
                visible={searchDialogVisible}
                onClose={handleSearchDialogClose}
                initialSearchText={searchText}
            />
        </AntHeader>
    );
};

export default Header;
