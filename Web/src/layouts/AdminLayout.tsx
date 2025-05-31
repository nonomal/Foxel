import { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, useNavigate, useLocation, matchPath, Navigate } from 'react-router';
import { Layout, theme, message } from 'antd';
import { clearAuthData, isAuthenticated } from '../api';
import useIsMobile from '../hooks/useIsMobile';
import { useAuth } from '../auth/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import { UserRole } from '../api/types';
import { getAdminRoutes, type RouteConfig } from '../routes';

const { Content } = Layout;

function AdminLayout() {
    const { refreshUser, hasRole, user, loading } = useAuth();
    const isMobile = useIsMobile();
    const [collapsed, setCollapsed] = useState(isMobile);
    const [currentRouteData, setCurrentRouteData] = useState<{
        routeInfo: RouteConfig | undefined;
        params: Record<string, string>;
        title?: string;
    }>({
        routeInfo: undefined,
        params: {}
    });

    const navigate = useNavigate();
    const location = useLocation();

    const routes = useMemo(() => getAdminRoutes(), []);

    const headerRouteData = useMemo(() => ({
        routeInfo: currentRouteData.routeInfo,
        params: currentRouteData.params,
        title: (currentRouteData.routeInfo?.label || '')
    }), [currentRouteData]);

    const {
        token: { colorBgContainer },
    } = theme.useToken();

    const findCurrentRoute = useCallback(() => {
        const pathname = location.pathname;
        const adminPath = pathname.replace(/^\/admin\/?/, '');

        if (adminPath === '') {
            const defaultRoute = routes.find(route => route.path === '');
            if (defaultRoute) {
                return {
                    routeInfo: defaultRoute,
                    params: {}
                };
            }
        }

        // 查找精确匹配的路由
        for (const route of routes) {
            const match = matchPath(
                { path: route.path, end: true },
                adminPath
            );

            if (match) {
                return {
                    routeInfo: route,
                    params: Object.fromEntries(
                        Object.entries(match.params || {}).filter(
                            ([, value]) => value !== undefined
                        )
                    ) as Record<string, string>
                };
            }
        }

        // 查找包含参数的路由
        for (const route of routes) {
            if (route.path.includes(':')) {
                const basePath = route.path.split('/:')[0];
                if (adminPath.startsWith(basePath)) {
                    const match = matchPath(
                        { path: route.path, end: false },
                        adminPath
                    );

                    if (match) {
                        return {
                            routeInfo: route,
                            params: Object.fromEntries(
                                Object.entries(match.params || {}).filter(
                                    ([, value]) => value !== undefined
                                )
                            ) as Record<string, string>
                        };
                    }
                }
            }
        }

        return {
            routeInfo: undefined,
            params: {}
        };
    }, [location.pathname, routes]);

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }

        if (!user) {
            refreshUser();
        }
    }, [navigate, refreshUser, user]);

    useEffect(() => {
        if (!loading && user && !hasRole(UserRole.Administrator)) {
            message.error('您没有权限访问管理后台');
            navigate('/');
        }
    }, [user, hasRole, navigate, loading]);
    useEffect(() => {
        const routeData = findCurrentRoute();
        setCurrentRouteData(routeData);
    }, [location.pathname, findCurrentRoute]);
    useEffect(() => {
        setCollapsed(isMobile);
    }, [isMobile]);

    // 退出登录处理
    const handleLogout = () => {
        clearAuthData();
        navigate('/login');
    };

    const toggleCollapsed = () => {
        setCollapsed(!collapsed);
    };

    // 加载状态
    if (loading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
            加载中...
        </div>;
    }

    // 权限检查
    if (user && !hasRole(UserRole.Administrator)) {
        return <Navigate to="/" replace />;
    }

    return (
        <Layout style={{
            height: '100vh',
            background: '#f0f2f5',
            fontWeight: 400
        }}>
            {/* 侧边栏组件 */}
            <Sidebar
                collapsed={collapsed}
                isMobile={isMobile}
                onClose={toggleCollapsed}
                area="admin"
            />

            <Layout>
                {/* 顶部导航栏组件 */}
                <Header
                    collapsed={collapsed}
                    toggleCollapsed={toggleCollapsed}
                    onLogout={handleLogout}
                    currentRouteData={headerRouteData}
                    isMobile={isMobile}
                />

                {/* 主要内容区 */}
                <Content style={{
                    margin: isMobile ? '10px' : '20px',
                    background: '#f0f2f5',
                    position: 'relative',
                    borderRadius: isMobile ? 10 : 20,
                    overflowY: 'auto'
                }}>
                    <div style={{
                        padding: isMobile ? '15px' : '25px',
                        minHeight: '100%',
                        background: colorBgContainer,
                        boxShadow: '0 6px 30px rgba(0,0,0,0.03)',
                        border: '1px solid #f0f0f0',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* 渲染子路由组件 */}
                        <Outlet context={{
                            isMobile,
                            isAdminPanel: true
                        }} />
                    </div>
                </Content>
                {/* 页脚组件 */}
                <Footer isMobile={isMobile} />
            </Layout>
        </Layout>
    );
}

export default AdminLayout;
