import React from 'react';
import {
  PictureOutlined,
  FolderOutlined,
  HeartOutlined,
  CloudUploadOutlined,
  SettingOutlined,
  CompassOutlined,
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined
} from '@ant-design/icons';

import AllImages from '../pages/allImages/Index';
import Albums from '../pages/albums/Index';
import AlbumDetail from '../pages/albumDetail/Index';
import Favorites from '../pages/favorites/Index';
import Settings from '../pages/settings/Index';
import BackgroundTasks from '../pages/backgroundTasks/Index';
import PixHub from '../pages/pixHub/Index';
import AdminDashboard from '../pages/admin/dashboard/Index';
import System from '../pages/admin/system/Index';
import UserManagement from '../pages/admin/users/Index';
import PictureManagement from '../pages/admin/pictures/Index';
import UserDetail from '../pages/admin/users/UserDetail';
import AdminLogManagement from '../pages/admin/log/Index';

export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  key: string;
  icon?: React.ReactNode;
  label: string;
  area: 'main' | 'admin';
  hideInMenu?: boolean;
  groupLabel?: string;
  divider?: boolean;
  breadcrumb?: {
    title: string;
    parent?: string;
  };
}

// 统一的路由配置
const routes: RouteConfig[] = [
  // 主应用路由
  {
    path: '/',
    key: 'all-images',
    icon: <PictureOutlined />,
    label: '所有图片',
    element: <AllImages />,
    area: 'main',
    breadcrumb: {
      title: '所有图片'
    }
  },
  {
    path: 'albums',
    key: 'albums',
    icon: <FolderOutlined />,
    label: '相册',
    element: <Albums />,
    area: 'main',
    breadcrumb: {
      title: '相册'
    }
  },
  {
    path: 'albums/:id',
    key: 'album-detail',
    label: '相册详情',
    element: <AlbumDetail />,
    area: 'main',
    hideInMenu: true,
    breadcrumb: {
      title: '相册详情',
      parent: 'albums'
    }
  },
  {
    path: 'favorites',
    key: 'favorites',
    icon: <HeartOutlined />,
    label: '收藏',
    element: <Favorites />,
    area: 'main',
    breadcrumb: {
      title: '收藏'
    }
  },
  {
    path: 'square',
    key: 'square',
    icon: <CompassOutlined />,
    label: '图片广场',
    element: <PixHub />,
    area: 'main',
    groupLabel: '社区发现',
    breadcrumb: {
      title: '图片广场'
    }
  },
  {
    path: 'tasks',
    key: 'tasks',
    icon: <CloudUploadOutlined />,
    label: '任务中心',
    element: <BackgroundTasks />,
    area: 'main',
    groupLabel: '系统功能',
    breadcrumb: {
      title: '任务中心'
    }
  },
  {
    path: 'settings',
    key: 'settings',
    icon: <SettingOutlined />,
    label: '设置',
    element: <Settings />,
    area: 'main',
    breadcrumb: {
      title: '设置'
    }
  },

  // 管理后台路由
  {
    path: '',
    key: 'admin-dashboard',
    icon: <DashboardOutlined />,
    label: '控制面板',
    element: <AdminDashboard />,
    area: 'admin',
    breadcrumb: {
      title: '控制面板'
    }
  },
  {
    path: 'users',
    key: 'admin-user',
    icon: <UserOutlined />,
    label: '用户管理',
    element: <UserManagement />,
    area: 'admin',
    breadcrumb: {
      title: '用户管理'
    }
  },
  {
    path: 'users/:id',
    key: 'user-detail',
    label: '用户详情',
    element: <UserDetail />,
    area: 'admin',
    hideInMenu: true,
    breadcrumb: {
      title: '用户详情',
      parent: 'users'
    }
  },
  {
    path: 'pictures',
    key: 'admin-picture',
    icon: <PictureOutlined />,
    label: '图片管理',
    element: <PictureManagement />,
    area: 'admin',
    breadcrumb: {
      title: '图片管理'
    }
  },
  {
    path: 'log',
    key: 'admin-log',
    icon: <FileTextOutlined />,
    label: '日志中心',
    element: <AdminLogManagement />,
    area: 'admin',
    breadcrumb: {
      title: '日志中心'
    }
  },
  {
    path: 'system',
    key: 'admin-system',
    icon: <SettingOutlined />,
    label: '系统设置',
    element: <System />,
    area: 'admin',
    breadcrumb: {
      title: '系统设置'
    }
  },
];

let mainRoutesCache: RouteConfig[] | null = null;
export const getMainRoutes = () => {
  if (!mainRoutesCache) {
    mainRoutesCache = routes.filter(route => route.area === 'main');
  }
  return mainRoutesCache;
};

let adminRoutesCache: RouteConfig[] | null = null;
export const getAdminRoutes = () => {
  if (!adminRoutesCache) {
    adminRoutesCache = routes.filter(route => route.area === 'admin');
  }
  return adminRoutesCache;
};

export default routes;
