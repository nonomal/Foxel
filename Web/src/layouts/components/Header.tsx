import React, { useRef, useState } from 'react';
import { Layout, Button, Dropdown, Space, theme, Breadcrumb, Input } from 'antd';
import {
    MenuFoldOutlined,
    MenuUnfoldOutlined,
    UserOutlined,
    LogoutOutlined,
    DashboardOutlined,
    RightOutlined,
    SearchOutlined
} from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { getMainRoutes, getAdminRoutes, type RouteConfig } from '../../routes';
import UserAvatar from '../../components/UserAvatar';
import { UserRole } from '../../api/types';
import SearchDialog from '../../components/search/SearchDialog';
import useIsMobile from '../../hooks/useIsMobile';

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

const Header: React.FC<HeaderProps> = ({
    collapsed,
    toggleCollapsed,
    onLogout,
    currentRouteData,
    isMobile = false
}) => {
    const { user, hasRole } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const headerRef = useRef<HTMLDivElement>(null);
    const isMobileDevice = useIsMobile();
    const [searchDialogVisible, setSearchDialogVisible] = useState(false);
    const [searchText, setSearchText] = useState('');

    const { token: { colorBgContainer } } = theme.useToken();

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
                onClick: () => navigate('/admin/dashboard')
            }
        ] : []),
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: '退出登录',
            onClick: onLogout
        }
    ];

    const renderBreadcrumb = () => {
        const { routeInfo, params, title: explicitTitle } = currentRouteData;
        const antdBreadcrumbItems: Array<{ title: React.ReactNode; href?: string }> = [];
        
        const currentPath = location.pathname;
        const isAdminArea = routeInfo?.area === 'admin';
        const baseHref = isAdminArea ? '/admin/dashboard' : '/';
        const baseTitle = isAdminArea ? '管理后台' : '首页';

        if (currentPath === baseHref && !explicitTitle && (!routeInfo || routeInfo.path === '')) {
            antdBreadcrumbItems.push({ title: baseTitle });
        } else {
            antdBreadcrumbItems.push({ title: <Link to={baseHref}>{baseTitle}</Link> });
        }

        if (explicitTitle) {
            if (!(antdBreadcrumbItems.length === 1 && !antdBreadcrumbItems[0].href && antdBreadcrumbItems[0].title === explicitTitle)) {
                if (antdBreadcrumbItems.length === 1 && antdBreadcrumbItems[0].href && antdBreadcrumbItems[0].title !== explicitTitle) {
                    antdBreadcrumbItems.push({ title: explicitTitle });
                } else if (antdBreadcrumbItems.length === 0 || antdBreadcrumbItems[0].title !== explicitTitle) {
                    antdBreadcrumbItems.push({ title: explicitTitle });
                } else if (antdBreadcrumbItems.length === 1 && !antdBreadcrumbItems[0].href && antdBreadcrumbItems[0].title !== explicitTitle) {
                    antdBreadcrumbItems[0].title = <Link to={baseHref}>{baseTitle}</Link>;
                    antdBreadcrumbItems.push({ title: explicitTitle });
                }
            }
        } else if (routeInfo) {
            const allRoutesForArea = isAdminArea ? getAdminRoutes() : getMainRoutes();
            const { breadcrumb: breadcrumbConfig, label: routeLabel, path: routeConfigPath } = routeInfo;

            if (breadcrumbConfig?.parent) {
                const parentRoute = allRoutesForArea.find(r => r.key === breadcrumbConfig.parent);
                if (parentRoute) {
                    const parentTitle = parentRoute.breadcrumb?.title || parentRoute.label;
                    let parentHref: string;
                    
                    if (isAdminArea) {
                        parentHref = parentRoute.path ? `/admin/${parentRoute.path}` : '/admin';
                    } else {
                        if (parentRoute.path === '') {
                            parentHref = '/';
                        } else if (parentRoute.path.startsWith('/')) {
                            parentHref = parentRoute.path;
                        } else {
                            parentHref = `/${parentRoute.path}`;
                        }
                    }

                    if (parentHref !== baseHref) {
                        if (currentPath === parentHref) {
                            antdBreadcrumbItems.push({ title: parentTitle });
                        } else {
                            antdBreadcrumbItems.push({ title: <Link to={parentHref}>{parentTitle}</Link> });
                        }
                    } else if (antdBreadcrumbItems.length > 0 && antdBreadcrumbItems[0].title !== parentTitle && currentPath !== baseHref) {
                        antdBreadcrumbItems[0].title = <Link to={baseHref}>{parentTitle}</Link>;
                    } else if (antdBreadcrumbItems.length > 0 && antdBreadcrumbItems[0].title !== parentTitle && currentPath === baseHref) {
                        antdBreadcrumbItems[0].title = parentTitle;
                    }
                }
            }

            let currentPageTitle = breadcrumbConfig?.title || routeLabel;
            
            if (breadcrumbConfig?.title && params) {
                Object.entries(params).forEach(([key, value]) => {
                    currentPageTitle = currentPageTitle.replace(`:${key}`, String(value));
                });
            }

            const lastItem = antdBreadcrumbItems.length > 0 ? antdBreadcrumbItems[antdBreadcrumbItems.length - 1] : null;
            const lastItemTitle = lastItem ? ((lastItem.title as any)?.props?.children || lastItem.title) : null;

            if (lastItemTitle !== currentPageTitle || lastItem?.href) {
                if (!(routeConfigPath === '' && antdBreadcrumbItems.length === 1 && !antdBreadcrumbItems[0].href && lastItemTitle === currentPageTitle)) {
                    antdBreadcrumbItems.push({ title: currentPageTitle });
                } else if (routeConfigPath === '' && antdBreadcrumbItems.length === 1 && !antdBreadcrumbItems[0].href && lastItemTitle !== currentPageTitle) {
                    antdBreadcrumbItems[0].title = currentPageTitle;
                }
            }
        }
        
        const uniqueItems = antdBreadcrumbItems.reduce((acc, item) => {
            if (acc.length === 0) {
                acc.push(item);
            } else {
                const prevItem = acc[acc.length - 1];
                const prevTitleContent = (prevItem.title as any)?.props?.children ?? prevItem.title;
                const currentTitleContent = (item.title as any)?.props?.children ?? item.title;

                if (prevTitleContent !== currentTitleContent) {
                    acc.push(item);
                } else {
                    if (!item.href) {
                        acc[acc.length - 1] = item;
                    }
                }
            }
            return acc;
        }, [] as Array<{ title: React.ReactNode; href?: string }>);

        return (
            <Breadcrumb
                separator={<RightOutlined style={{ fontSize: 12 }} />}
                style={{ margin: 0 }}
                items={uniqueItems.map(item => ({
                    title: item.title,
                    href: item.href,
                }))}
            />
        );
    };

    const handleSearch = (value: string) => {
        setSearchText(value);
        setSearchDialogVisible(true);
    };

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
                {!isMobileDevice && renderBreadcrumb()}
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
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

            <SearchDialog
                visible={searchDialogVisible}
                onClose={handleSearchDialogClose}
                initialSearchText={searchText}
            />
        </AntHeader>
    );
};

export default Header;
