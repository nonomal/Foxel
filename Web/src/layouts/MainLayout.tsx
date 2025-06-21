import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, matchPath } from 'react-router';
import { Layout, theme } from 'antd';
import { clearAuthData, isAuthenticated } from '../api';
import useIsMobile from '../hooks/useIsMobile';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Footer from './components/Footer';
import { getMainRoutes, type RouteConfig } from '../routes';

const { Content } = Layout;

function MainLayout() {
    const { refreshUser } = useAuth();
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
    const routes = getMainRoutes();

    const {
        token: { colorBgContainer },
    } = theme.useToken();

    // 查找当前路由信息
    const findCurrentRoute = () => {
        const pathname = location.pathname;

        // 测试每个路由是否匹配当前路径
        for (const route of routes) {
            const match = matchPath(
                { path: `/${route.path}`, end: true },
                pathname
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

        // 如果没有完全匹配，尝试找到包含参数的路由
        for (const route of routes) {
            const pattern = route.path.includes(':')
                ? `/${route.path.split('/:')[0]}`
                : `/${route.path}`;

            if (pathname.startsWith(pattern)) {
                const match = matchPath(
                    { path: `/${route.path}`, end: false },
                    pathname
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

        return {
            routeInfo: undefined,
            params: {}
        };
    };

    useEffect(() => {
        if (!isAuthenticated()) {
            navigate('/login');
            return;
        }
        refreshUser();
    }, [navigate, refreshUser]);

    // 监听路由变化，更新当前路由信息
    useEffect(() => {
        const routeData = findCurrentRoute();
        setCurrentRouteData(routeData);
    }, [location.pathname]);

    // 当设备类型改变时，自动调整侧边栏状态
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

    return (
        <Layout style={{
            height: '100vh',
            background: '#fcfcfc',
            fontWeight: 400
        }}>
            {/* 侧边栏组件 */}
            <Sidebar
                collapsed={collapsed}
                isMobile={isMobile}
                onClose={toggleCollapsed}
                area="main"
            />

            <Layout>
                {/* 顶部导航栏组件 */}
                <Header
                    collapsed={collapsed}
                    toggleCollapsed={toggleCollapsed}
                    onLogout={handleLogout}
                    currentRouteData={currentRouteData}
                    isMobile={isMobile}
                />

                {/* 主要内容区 */}
                <Content style={{
                    padding: isMobile ? '10px' : '20px',
                    background: colorBgContainer,
                    position: 'relative',
                    overflowY: 'auto'
                }}>
                    <div style={{
                        minHeight: '100%',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        {/* 渲染子路由组件 */}
                        <Outlet context={{
                            isMobile
                        }} />
                    </div>
                </Content>
                {/* 页脚组件 */}
                <Footer isMobile={isMobile} />
            </Layout>
        </Layout>
    );
}

export default MainLayout;
