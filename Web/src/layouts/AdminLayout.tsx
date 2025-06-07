import { useState, useEffect, useCallback, useMemo } from 'react';
import { Outlet, useNavigate, useLocation, matchPath, Navigate } from 'react-router';
import { Layout, theme, message } from 'antd';
import { clearAuthData, isAuthenticated } from '../api';
import useIsMobile from '../hooks/useIsMobile';
import { useAuth } from '../auth/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import { UserRole } from '../api';
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
    }), [currentRouteData]);

    const { token: { colorBgContainer } } = theme.useToken();

    const findCurrentRoute = useCallback(() => {
        const pathname = location.pathname;
        const adminBasePrefix = '/admin';

        if (!pathname.startsWith(adminBasePrefix)) {
            return { routeInfo: undefined, params: {} };
        }

        let adminPath = pathname.substring(adminBasePrefix.length);
        if (adminPath.startsWith('/')) {
            adminPath = adminPath.substring(1);
        }

        if (adminPath.length > 0 && adminPath.endsWith('/')) {
            adminPath = adminPath.slice(0, -1);
        }

        if (adminPath === '') {
            const defaultRoute = routes.find(route => route.path === '');
            if (defaultRoute) {
                return { routeInfo: defaultRoute, params: {} };
            }
        }

        for (const route of routes) {
            if (route.path === '' && adminPath !== '') continue;
            if (route.path !== '' && adminPath === '') continue;

            if (route.path === adminPath) {
                return { routeInfo: route, params: {} };
            }

            if (route.path.includes(':')) {
                const match = matchPath({ path: route.path, end: true }, adminPath);
                if (match) {
                    return {
                        routeInfo: route,
                        params: Object.fromEntries(
                            Object.entries(match.params || {}).filter(
                                ([, value]) => value !== undefined && value !== ""
                            ).map(([key, value]) => [key, String(value)])
                        ) as Record<string, string>
                    };
                }
            }
        }

        return { routeInfo: undefined, params: {} };
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

    const handleLogout = () => {
        clearAuthData();
        navigate('/login');
    };

    const toggleCollapsed = () => {
        setCollapsed(!collapsed);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                加载中...
            </div>
        );
    }

    if (user && !hasRole(UserRole.Administrator)) {
        return <Navigate to="/" replace />;
    }

    return (
        <Layout style={{ height: '100vh', background: '#f0f2f5', fontWeight: 400 }}>
            <Sidebar collapsed={collapsed} isMobile={isMobile} onClose={toggleCollapsed} area="admin" />
            
            <Layout>
                <Header
                    collapsed={collapsed}
                    toggleCollapsed={toggleCollapsed}
                    onLogout={handleLogout}
                    currentRouteData={headerRouteData}
                    isMobile={isMobile}
                />

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
                        <Outlet context={{ isMobile, isAdminPanel: true }} />
                    </div>
                </Content>
                
                <Footer isMobile={isMobile} />
            </Layout>
        </Layout>
    );
}

export default AdminLayout;
