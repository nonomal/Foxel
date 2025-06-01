// 重新导出类型
export * from './authApi';
export * from './types';

// 导出fetch客户端
export { fetchApi, BASE_URL } from './fetchClient';

// 导出Auth API
export {
    register,
    login,
    getCurrentUser,
    updateUserInfo,  
    saveAuthData,
    clearAuthData,
    isAuthenticated,
    getStoredUser,
    bindAccount,
    getGitHubLoginUrl,
    getLinuxDoLoginUrl
} from './authApi';

// 导出Picture API
export {
    getPictures,
    favoritePicture,
    unfavoritePicture,
    getUserFavorites,
    uploadPicture,
    deleteMultiplePictures, 
    updatePicture, 
} from './pictureApi';

// 导出Album API
export {
    getAlbums,
    getAlbumById,
    createAlbum,
    updateAlbum,
    deleteAlbum,
    addPictureToAlbum,
    addPicturesToAlbum,
    removePictureFromAlbum
} from './albumApi';

// 导出BackgroundTask API
export {
    getUserTasks,
    getPictureProcessingStatus,
} from './backgroundTaskApi';

// 导出Config API
export {
    getAllConfigs,
    getConfig,
    setConfig,
    deleteConfig,
    hasRole,
    backupConfigs,
    restoreConfigs
} from './configApi';

// 导出UserManagement API
export {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    batchDeleteUsers
} from './userManagementApi';

// 导出PictureManagement API
export {
    getManagementPictures,
    getManagementPictureById,
    deleteManagementPicture,
    batchDeleteManagementPictures,
    getManagementPicturesByUserId
} from './pictureManagementApi';

// 导出向量数据库 API
export {
    getCurrentVectorDb,
    switchVectorDb,
    clearVectors,
    rebuildVectors
} from './vectorDbApi';

