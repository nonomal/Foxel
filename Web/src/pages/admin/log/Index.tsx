import React, {useState, useEffect, useMemo} from 'react';
import {
    Card,
    Table,
    Button,
    Space,
    Tag,
    Typography,
    Input,
    Select,
    DatePicker,
    Row,
    Col,
    message,
    Modal,
    Tooltip,
    Badge,
    Popconfirm,
    Drawer,
    Alert,
    Statistic
} from 'antd';
import {
    SearchOutlined,
    DeleteOutlined,
    ClearOutlined,
    ReloadOutlined,
    ExclamationCircleOutlined,
    InfoCircleOutlined,
    WarningOutlined,
    EyeOutlined,
    FilterOutlined,
    FileTextOutlined
} from '@ant-design/icons';
import type {ColumnsType} from 'antd/es/table';
import type {TableRowSelection} from 'antd/es/table/interface';
import {useOutletContext} from 'react-router';
import dayjs from 'dayjs';
import type {Dayjs} from 'dayjs';
import {getLogs, deleteLog, batchDeleteLogs, clearLogs, getLogById, getLogStatistics} from '../../../api';
import type {LogResponse, LogLevel, LogFilterRequest, LogStatistics} from '../../../api/types';

const {Title, Text, Paragraph} = Typography;
const {RangePicker} = DatePicker;
const {confirm} = Modal;

// 日志级别数字到字符串的映射
const LOG_LEVEL_MAP: Record<number, LogLevel> = {
    0: 'Trace',
    1: 'Debug', 
    2: 'Information',
    3: 'Warning',
    4: 'Error',
    5: 'Critical'
};

// 日志级别颜色映射
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
    Trace: 'default',
    Debug: 'blue',
    Information: 'green',
    Warning: 'orange',
    Error: 'red',
    Critical: 'magenta'
};

// 日志级别图标映射
const LOG_LEVEL_ICONS: Record<LogLevel, React.ReactNode> = {
    Trace: <FileTextOutlined/>,
    Debug: <InfoCircleOutlined/>,
    Information: <InfoCircleOutlined/>,
    Warning: <WarningOutlined/>,
    Error: <ExclamationCircleOutlined/>,
    Critical: <ExclamationCircleOutlined/>
};

const AdminLogManagement: React.FC = () => {
    const {isMobile} = useOutletContext<{ isMobile: boolean; isAdminPanel?: boolean }>();

    // 状态管理
    const [loading, setLoading] = useState(false);
    const [logs, setLogs] = useState<LogResponse[]>([]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 20,
        total: 0,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total: number, range: [number, number]) =>
            `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
    });

    // 筛选条件
    const [filters, setFilters] = useState<LogFilterRequest>({});
    const [searchText, setSearchText] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<LogLevel | undefined>();
    const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);

    // 日志详情抽屉
    const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<LogResponse | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    // 统计信息
    const [logStats, setLogStats] = useState<LogStatistics>({
        totalCount: 0,
        todayCount: 0,
        errorCount: 0,
        warningCount: 0
    });

    // 获取日志统计
    const fetchLogStatistics = async () => {
        try {
            const response = await getLogStatistics();
            if (response.success && response.data) {
                setLogStats(response.data);
            }
        } catch (error) {
            console.error('Error fetching log statistics:', error);
            message.error('获取日志统计失败');
        }
    };

    // 获取日志列表
    const fetchLogs = async (params: LogFilterRequest = {}) => {
        setLoading(true);
        try {
            const response = await getLogs({
                page: params.page || pagination.current,
                pageSize: params.pageSize || pagination.pageSize,
                searchQuery: params.searchQuery || searchText,
                level: params.level || selectedLevel,
                startDate: params.startDate,
                endDate: params.endDate,
                ...params
            });

            if (response.success && response.data) {
                setLogs(response.data);
                setPagination(prev => ({
                    ...prev,
                    current: response.page,
                    total: response.totalCount
                }));
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
            message.error('获取日志列表失败');
        } finally {
            setLoading(false);
        }
    };

    // 查看日志详情
    const handleViewDetail = async (logId: number) => {
        setDetailLoading(true);
        try {
            const response = await getLogById(logId);
            if (response.success && response.data) {
                setSelectedLog(response.data);
                setDetailDrawerOpen(true);
            }
        } catch (error) {
            console.error('Error fetching log detail:', error);
            message.error('获取日志详情失败');
        } finally {
            setDetailLoading(false);
        }
    };

    // 删除单个日志
    const handleDelete = async (id: number) => {
        try {
            const response = await deleteLog(id);
            if (response.success) {
                message.success('日志删除成功');
                await Promise.all([fetchLogs(), fetchLogStatistics()]);
            }
        } catch (error) {
            console.error('Error deleting log:', error);
            message.error('删除日志失败');
        }
    };

    // 批量删除日志
    const handleBatchDelete = async () => {
        if (selectedRowKeys.length === 0) {
            message.warning('请选择要删除的日志');
            return;
        }

        confirm({
            title: '确认删除',
            content: `确定要删除选中的 ${selectedRowKeys.length} 条日志吗？`,
            icon: <ExclamationCircleOutlined/>,
            okText: '确定',
            cancelText: '取消',
            okType: 'danger',
            onOk: async () => {
                try {
                    const response = await batchDeleteLogs(selectedRowKeys as number[]);
                    if (response.success && response.data) {
                        message.success(`成功删除 ${response.data.successCount} 条日志`);
                        setSelectedRowKeys([]);
                        await Promise.all([fetchLogs(), fetchLogStatistics()]);
                    }
                } catch (error) {
                    console.error('Error batch deleting logs:', error);
                    message.error('批量删除日志失败');
                }
            }
        });
    };

    // 清空日志
    const handleClearLogs = (type: 'all' | 'old') => {
        const title = type === 'all' ? '清空所有日志' : '清空历史日志';
        const content = type === 'all'
            ? '确定要清空所有日志吗？此操作不可恢复！'
            : '确定要清空7天前的历史日志吗？此操作不可恢复！';

        confirm({
            title,
            content,
            icon: <ExclamationCircleOutlined/>,
            okText: '确定',
            cancelText: '取消',
            okType: 'danger',
            onOk: async () => {
                try {
                    const request = type === 'all'
                        ? {clearAll: true}
                        : {beforeDate: dayjs().subtract(7, 'day').toDate()};

                    const response = await clearLogs(request);
                    if (response.success) {
                        message.success(`成功清空 ${response.data} 条日志`);
                        await Promise.all([fetchLogs(), fetchLogStatistics()]);
                    }
                } catch (error) {
                    console.error('Error clearing logs:', error);
                    message.error('清空日志失败');
                }
            }
        });
    };

    // 搜索和筛选
    const handleSearch = () => {
        const newFilters: LogFilterRequest = {
            page: 1,
            searchQuery: searchText,
            level: selectedLevel,
        };

        if (dateRange) {
            newFilters.startDate = dateRange[0].format('YYYY-MM-DD');
            newFilters.endDate = dateRange[1].format('YYYY-MM-DD');
        }

        setFilters(newFilters);
        fetchLogs(newFilters);
    };

    // 重置筛选
    const handleResetFilters = () => {
        setSearchText('');
        setSelectedLevel(undefined);
        setDateRange(null);
        setFilters({});
        setPagination(prev => ({...prev, current: 1}));
        fetchLogs({page: 1});
    };

    // 获取日志级别字符串
    const getLogLevelString = (level: number | string): LogLevel => {
        if (typeof level === 'number') {
            return LOG_LEVEL_MAP[level] || 'Information';
        }
        return level as LogLevel;
    };

    // 表格列配置
    const columns = useMemo<ColumnsType<LogResponse>>(() => [
        {
            title: '时间',
            dataIndex: 'timestamp',
            key: 'timestamp',
            width: 160,
            render: (timestamp: Date) => (
                <Text type="secondary">
                    {dayjs(timestamp).format('MM-DD HH:mm:ss')}
                </Text>
            ),
            sorter: true,
        },
        {
            title: '级别',
            dataIndex: 'level',
            key: 'level',
            width: 120,
            render: (level: LogLevel | number) => {
                const levelString = getLogLevelString(level);
                return (
                    <Tag
                        color={LOG_LEVEL_COLORS[levelString]}
                        icon={LOG_LEVEL_ICONS[levelString]}
                    >
                        {levelString}
                    </Tag>
                );
            },
            filters: [
                {text: 'Trace', value: 0},
                {text: 'Debug', value: 1},
                {text: 'Information', value: 2},
                {text: 'Warning', value: 3},
                {text: 'Error', value: 4},
                {text: 'Critical', value: 5},
            ],
        },
        {
            title: '分类',
            dataIndex: 'category',
            key: 'category',
            width: 150,
            ellipsis: true,
            render: (category: string) => (
                <Tooltip title={category}>
                    <Text>{category}</Text>
                </Tooltip>
            ),
        },
        {
            title: '消息',
            dataIndex: 'message',
            key: 'message',
            ellipsis: true,
            render: (message: string) => (
                <Tooltip title={message}>
                    <Text>{message}</Text>
                </Tooltip>
            ),
        },
        {
            title: '请求信息',
            key: 'request',
            width: 120,
            responsive: ['lg'],
            render: (_, record) => {
                if (record.requestPath) {
                    return (
                        <Space direction="vertical" size={0}>
                            <Text type="secondary" style={{fontSize: '12px'}}>
                                {record.requestMethod} {record.statusCode}
                            </Text>
                            <Text type="secondary" style={{fontSize: '12px'}}>
                                {record.requestPath}
                            </Text>
                        </Space>
                    );
                }
                return '-';
            },
        },
        {
            title: 'IP地址',
            dataIndex: 'ipAddress',
            key: 'ipAddress',
            width: 120,
            responsive: ['xl'],
            render: (ip: string) => ip || '-',
        },
        {
            title: '操作',
            key: 'action',
            width: 120,
            render: (_, record) => (
                <Space>
                    <Tooltip title="查看详情">
                        <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined/>}
                            onClick={() => handleViewDetail(record.id)}
                            loading={detailLoading}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="确定删除此日志吗？"
                        onConfirm={() => handleDelete(record.id)}
                        okText="确定"
                        cancelText="取消"
                    >
                        <Tooltip title="删除">
                            <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined/>}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ], [detailLoading]);

    // 行选择配置
    const rowSelection: TableRowSelection<LogResponse> = {
        selectedRowKeys,
        onChange: setSelectedRowKeys,
        preserveSelectedRowKeys: true,
    };

    // 初始化加载
    useEffect(() => {
        Promise.all([fetchLogs(), fetchLogStatistics()]);
    }, []);

    return (
        <div className="admin-log-management">
            <Title level={2}>日志管理</Title>
            <Text type="secondary" style={{marginBottom: 24, display: 'block'}}>
                查看和管理系统运行日志，监控系统状态和问题排查。
            </Text>

            {/* 统计卡片 */}
            <Row gutter={[16, 16]} style={{marginBottom: 24}}>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title="总日志数"
                            value={logStats.totalCount}
                            prefix={<FileTextOutlined/>}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title="今日日志"
                            value={logStats.todayCount}
                            prefix={<InfoCircleOutlined/>}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title="错误日志"
                            value={logStats.errorCount}
                            prefix={<ExclamationCircleOutlined/>}
                            valueStyle={{color: '#cf1322'}}
                        />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small">
                        <Statistic
                            title="警告日志"
                            value={logStats.warningCount}
                            prefix={<WarningOutlined/>}
                            valueStyle={{color: '#fa8c16'}}
                        />
                    </Card>
                </Col>
            </Row>

            <Card>
                {/* 筛选条件 */}
                <Row gutter={[16, 16]} style={{marginBottom: 16}}>
                    <Col xs={24} sm={12} md={8}>
                        <Input
                            placeholder="搜索日志消息或分类"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            onPressEnter={handleSearch}
                            prefix={<SearchOutlined/>}
                            allowClear
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Select
                            placeholder="选择日志级别"
                            value={selectedLevel}
                            onChange={setSelectedLevel}
                            allowClear
                            style={{width: '100%'}}
                        >
                            <Select.Option value="Trace">Trace</Select.Option>
                            <Select.Option value="Debug">Debug</Select.Option>
                            <Select.Option value="Information">Information</Select.Option>
                            <Select.Option value="Warning">Warning</Select.Option>
                            <Select.Option value="Error">Error</Select.Option>
                            <Select.Option value="Critical">Critical</Select.Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={10}>
                        <Space size="small" style={{width: '100%', justifyContent: 'space-between'}}>
                            <RangePicker
                                value={dateRange}
                                onChange={(dates) => setDateRange(dates as [Dayjs, Dayjs] | null)}
                                placeholder={['开始日期', '结束日期']}
                                style={{flex: 1}}
                            />
                            <Space>
                                <Button
                                    type="primary"
                                    icon={<FilterOutlined/>}
                                    onClick={handleSearch}
                                >
                                    筛选
                                </Button>
                                <Button
                                    icon={<ReloadOutlined/>}
                                    onClick={handleResetFilters}
                                >
                                    重置
                                </Button>
                            </Space>
                        </Space>
                    </Col>
                </Row>

                {/* 操作按钮 */}
                <Row justify="space-between" style={{marginBottom: 16}}>
                    <Col>
                        <Space>
                            <Button
                                danger
                                icon={<DeleteOutlined/>}
                                onClick={handleBatchDelete}
                                disabled={selectedRowKeys.length === 0}
                            >
                                批量删除 ({selectedRowKeys.length})
                            </Button>
                            <Button
                                danger
                                icon={<ClearOutlined/>}
                                onClick={() => handleClearLogs('old')}
                            >
                                清空历史日志
                            </Button>
                            <Button
                                danger
                                icon={<ClearOutlined/>}
                                onClick={() => handleClearLogs('all')}
                            >
                                清空所有日志
                            </Button>
                        </Space>
                    </Col>
                    <Col>
                        <Button
                            icon={<ReloadOutlined/>}
                            onClick={() => fetchLogs()}
                            loading={loading}
                        >
                            刷新
                        </Button>
                    </Col>
                </Row>

                {/* 数据表格 */}
                <Table
                    columns={columns}
                    dataSource={logs}
                    rowKey="id"
                    rowSelection={rowSelection}
                    pagination={{
                        ...pagination,
                        onChange: (page, pageSize) => {
                            setPagination(prev => ({...prev, current: page, pageSize: pageSize || 20}));
                            fetchLogs({...filters, page, pageSize});
                        },
                    }}
                    loading={loading}
                    size={isMobile ? 'small' : 'middle'}
                    scroll={isMobile ? {x: 800} : undefined}
                />
            </Card>

            {/* 日志详情抽屉 */}
            <Drawer
                title="日志详情"
                placement="right"
                width={isMobile ? '100%' : 600}
                open={detailDrawerOpen}
                onClose={() => setDetailDrawerOpen(false)}
            >
                {selectedLog && (
                    <Space direction="vertical" size="large" style={{width: '100%'}}>
                        <Card title="基本信息" size="small">
                            <Row gutter={[16, 8]}>
                                <Col span={8}>
                                    <Text strong>时间:</Text>
                                </Col>
                                <Col span={16}>
                                    <Text>{dayjs(selectedLog.timestamp).format('YYYY-MM-DD HH:mm:ss')}</Text>
                                </Col>

                                <Col span={8}>
                                    <Text strong>级别:</Text>
                                </Col>
                                <Col span={16}>
                                    <Tag color={LOG_LEVEL_COLORS[getLogLevelString(selectedLog.level)]}
                                         icon={LOG_LEVEL_ICONS[getLogLevelString(selectedLog.level)]}>
                                        {getLogLevelString(selectedLog.level)}
                                    </Tag>
                                </Col>

                                <Col span={8}>
                                    <Text strong>分类:</Text>
                                </Col>
                                <Col span={16}>
                                    <Text>{selectedLog.category}</Text>
                                </Col>

                                {selectedLog.eventId != null && (
                                    <>
                                        <Col span={8}>
                                            <Text strong>事件ID:</Text>
                                        </Col>
                                        <Col span={16}>
                                            <Text>{selectedLog.eventId}</Text>
                                        </Col>
                                    </>
                                )}
                            </Row>
                        </Card>

                        <Card title="消息内容" size="small">
                            <Paragraph>
                                <Text>{selectedLog.message}</Text>
                            </Paragraph>
                        </Card>

                        {selectedLog.exception && (
                            <Card title="异常信息" size="small">
                                <Alert
                                    message="异常详情"
                                    description={
                                        <pre style={{whiteSpace: 'pre-wrap', fontSize: '12px'}}>
                      {selectedLog.exception}
                    </pre>
                                    }
                                    type="error"
                                    showIcon
                                />
                            </Card>
                        )}

                        {(selectedLog.requestPath || selectedLog.ipAddress) && (
                            <Card title="请求信息" size="small">
                                <Row gutter={[16, 8]}>
                                    {selectedLog.requestMethod && (
                                        <>
                                            <Col span={8}>
                                                <Text strong>请求方法:</Text>
                                            </Col>
                                            <Col span={16}>
                                                <Tag>{selectedLog.requestMethod}</Tag>
                                            </Col>
                                        </>
                                    )}

                                    {selectedLog.requestPath && (
                                        <>
                                            <Col span={8}>
                                                <Text strong>请求路径:</Text>
                                            </Col>
                                            <Col span={16}>
                                                <Text code>{selectedLog.requestPath}</Text>
                                            </Col>
                                        </>
                                    )}

                                    {selectedLog.statusCode && (
                                        <>
                                            <Col span={8}>
                                                <Text strong>状态码:</Text>
                                            </Col>
                                            <Col span={16}>
                                                <Badge
                                                    status={selectedLog.statusCode >= 400 ? 'error' : 'success'}
                                                    text={selectedLog.statusCode}
                                                />
                                            </Col>
                                        </>
                                    )}

                                    {selectedLog.ipAddress && (
                                        <>
                                            <Col span={8}>
                                                <Text strong>IP地址:</Text>
                                            </Col>
                                            <Col span={16}>
                                                <Text code>{selectedLog.ipAddress}</Text>
                                            </Col>
                                        </>
                                    )}

                                    {selectedLog.userId && (
                                        <>
                                            <Col span={8}>
                                                <Text strong>用户ID:</Text>
                                            </Col>
                                            <Col span={16}>
                                                <Text>{selectedLog.userId}</Text>
                                            </Col>
                                        </>
                                    )}
                                </Row>
                            </Card>
                        )}

                        {selectedLog.properties && (
                            <Card title="附加属性" size="small">
                <pre style={{whiteSpace: 'pre-wrap', fontSize: '12px'}}>
                  {selectedLog.properties}
                </pre>
                            </Card>
                        )}
                    </Space>
                )}
            </Drawer>
        </div>
    );
};

export default AdminLogManagement;
