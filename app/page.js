'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

// 数据源列表
const DATA_SOURCES = [
    { id: 'tiantian', name: '天天基金', desc: '实时估值' },
    { id: 'eastmoney_mobile', name: '东方财富(移动)', desc: '移动端API' },
    { id: 'eastmoney_lsjz', name: '东方财富(LSJZ)', desc: '历史净值' },
    { id: 'danjuan', name: '蛋卷基金', desc: '蛋卷投资' },
    { id: 'eastmoney_f10', name: '东方财富(F10)', desc: 'F10接口' }
];

// 排序选项
const SORT_OPTIONS = [
    { id: 'default', name: '默认顺序' },
    { id: 'change_desc', name: '涨幅从高到低' },
    { id: 'change_asc', name: '涨幅从低到高' },
    { id: 'value_desc', name: '估值从高到低' },
    { id: 'value_asc', name: '估值从低到高' }
];

export default function Home() {
    const [funds, setFunds] = useState([]);
    const [fundCode, setFundCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [dataSource, setDataSource] = useState('tiantian');
    const [currentSource, setCurrentSource] = useState('');
    const [sortBy, setSortBy] = useState('default');

    // 从 localStorage 加载基金列表和偏好
    useEffect(() => {
        const savedSource = localStorage.getItem('dataSource');
        if (savedSource) {
            setDataSource(savedSource);
        }

        const savedSort = localStorage.getItem('sortBy');
        if (savedSort) {
            setSortBy(savedSort);
        }

        const saved = localStorage.getItem('fundCodes');
        if (saved) {
            const codes = JSON.parse(saved);
            if (codes.length > 0) {
                fetchAllFunds(codes, savedSource || 'tiantian');
            }
        }
    }, []);

    // 获取单个基金数据
    const fetchFund = async (code, source) => {
        const response = await fetch(`/api/fund?code=${code}&source=${source || dataSource}`);
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        return data;
    };

    // 获取所有基金数据
    const fetchAllFunds = useCallback(async (codes, source) => {
        setRefreshing(true);
        try {
            const results = await Promise.all(
                codes.map(code => fetchFund(code, source).catch(() => null))
            );
            const validFunds = results.filter(f => f !== null);
            setFunds(validFunds);

            if (validFunds.length > 0 && validFunds[0].source) {
                setCurrentSource(validFunds[0].source);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setRefreshing(false);
        }
    }, [dataSource]);

    // 排序后的基金列表
    const sortedFunds = useMemo(() => {
        const sorted = [...funds];
        switch (sortBy) {
            case 'change_desc':
                sorted.sort((a, b) => b.estimateChange - a.estimateChange);
                break;
            case 'change_asc':
                sorted.sort((a, b) => a.estimateChange - b.estimateChange);
                break;
            case 'value_desc':
                sorted.sort((a, b) => parseFloat(b.estimateValue) - parseFloat(a.estimateValue));
                break;
            case 'value_asc':
                sorted.sort((a, b) => parseFloat(a.estimateValue) - parseFloat(b.estimateValue));
                break;
            default:
                break;
        }
        return sorted;
    }, [funds, sortBy]);

    // 保存基金代码到 localStorage
    const saveFundCodes = (fundList) => {
        const codes = fundList.map(f => f.code);
        localStorage.setItem('fundCodes', JSON.stringify(codes));
    };

    // 保存数据源偏好
    const handleSourceChange = (newSource) => {
        setDataSource(newSource);
        localStorage.setItem('dataSource', newSource);

        if (funds.length > 0) {
            const codes = funds.map(f => f.code);
            fetchAllFunds(codes, newSource);
        }
    };

    // 保存排序偏好
    const handleSortChange = (newSort) => {
        setSortBy(newSort);
        localStorage.setItem('sortBy', newSort);
    };

    // 添加基金
    const handleAddFund = async (e) => {
        e.preventDefault();
        const code = fundCode.trim();

        if (!code) {
            setError('请输入基金代码');
            return;
        }

        if (funds.some(f => f.code === code)) {
            setError('该基金已存在');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const fundData = await fetchFund(code);
            const newFunds = [...funds, fundData];
            setFunds(newFunds);
            saveFundCodes(newFunds);
            setFundCode('');
            setCurrentSource(fundData.source);
        } catch (err) {
            setError(err.message || '添加失败，请检查基金代码');
        } finally {
            setLoading(false);
        }
    };

    // 删除基金
    const handleDeleteFund = (code) => {
        const newFunds = funds.filter(f => f.code !== code);
        setFunds(newFunds);
        saveFundCodes(newFunds);
    };

    // 刷新数据
    const handleRefresh = () => {
        if (funds.length > 0) {
            const codes = funds.map(f => f.code);
            fetchAllFunds(codes, dataSource);
        }
    };

    // 计算总览数据
    const getSummary = () => {
        const upCount = funds.filter(f => f.estimateChange >= 0).length;
        const downCount = funds.filter(f => f.estimateChange < 0).length;
        const avgChange = funds.length > 0
            ? (funds.reduce((sum, f) => sum + f.estimateChange, 0) / funds.length).toFixed(2)
            : 0;
        return { upCount, downCount, avgChange };
    };

    // 获取数据源显示名称
    const getSourceName = (sourceId) => {
        const source = DATA_SOURCES.find(s => s.id === sourceId);
        return source ? source.name : sourceId;
    };

    const summary = getSummary();

    return (
        <div className="container">
            <header className="header">
                <div className="header-main">
                    <h1>📈 基金实时涨跌</h1>
                    <p>追踪您的基金实时估值</p>
                </div>

                {/* 数据源选择器 */}
                <div className="source-selector">
                    <label>数据源:</label>
                    <select
                        value={dataSource}
                        onChange={(e) => handleSourceChange(e.target.value)}
                        disabled={refreshing}
                    >
                        {DATA_SOURCES.map(source => (
                            <option key={source.id} value={source.id}>
                                {source.name}
                            </option>
                        ))}
                    </select>
                    {currentSource && (
                        <span className="current-source">
                            当前: {getSourceName(currentSource)}
                        </span>
                    )}
                </div>
            </header>

            {/* 添加基金表单 */}
            <form className="add-fund-form" onSubmit={handleAddFund}>
                <input
                    type="text"
                    value={fundCode}
                    onChange={(e) => setFundCode(e.target.value)}
                    placeholder="输入基金代码，如 005827"
                    disabled={loading}
                />
                <button type="submit" disabled={loading}>
                    {loading ? '添加中...' : '添加基金'}
                </button>
            </form>

            {/* 错误提示 */}
            {error && <div className="error-message">{error}</div>}

            {/* 总览卡片 */}
            {funds.length > 0 && (
                <div className="summary-card">
                    <div className="summary-item">
                        <h4>持有基金</h4>
                        <div className="value">{funds.length}</div>
                    </div>
                    <div className="summary-item">
                        <h4>上涨 / 下跌</h4>
                        <div className="value">
                            <span className="up">{summary.upCount}</span>
                            {' / '}
                            <span className="down">{summary.downCount}</span>
                        </div>
                    </div>
                    <div className="summary-item">
                        <h4>平均涨跌</h4>
                        <div className={`value ${summary.avgChange >= 0 ? 'up' : 'down'}`}>
                            {summary.avgChange >= 0 ? '+' : ''}{summary.avgChange}%
                        </div>
                    </div>
                </div>
            )}

            {/* 操作栏 */}
            {funds.length > 0 && (
                <div className="action-bar">
                    <span className="fund-count">共 {funds.length} 只基金</span>

                    {/* 排序选择器 */}
                    <div className="sort-selector">
                        <label>排序:</label>
                        <select
                            value={sortBy}
                            onChange={(e) => handleSortChange(e.target.value)}
                        >
                            {SORT_OPTIONS.map(option => (
                                <option key={option.id} value={option.id}>
                                    {option.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <span className="icon">🔄</span>
                        {refreshing ? '刷新中...' : '刷新数据'}
                    </button>
                </div>
            )}

            {/* 基金列表 */}
            <div className="fund-list">
                {funds.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">📊</div>
                        <h3>还没有添加基金</h3>
                        <p>输入基金代码开始追踪</p>
                        <p style={{ marginTop: '20px', fontSize: '0.85rem' }}>
                            常用代码：005827（易方达蓝筹）、161725（招商白酒）、270042（广发纳指）
                        </p>
                    </div>
                ) : (
                    sortedFunds.map((fund) => (
                        <div key={fund.code} className="fund-card">
                            <div className="fund-info">
                                <div className="fund-name">{fund.name}</div>
                                <div className="fund-code">{fund.code}</div>
                            </div>
                            <div className="fund-values">
                                <div className="fund-nav">净值: {fund.netValue} 元 <span className="date-label">({fund.netValueDate})</span></div>
                                <div className="fund-estimate">估算: {fund.estimateValue} 元</div>
                            </div>
                            <div className="fund-change">
                                <div className={`change-value ${fund.estimateChange >= 0 ? 'up' : 'down'}`}>
                                    {fund.estimateChange >= 0 ? '+' : ''}{fund.estimateChange.toFixed(2)}%
                                </div>
                                <div className="update-time">更新: {fund.updateTime}</div>
                            </div>
                            <button
                                className="delete-btn"
                                onClick={() => handleDeleteFund(fund.code)}
                                title="删除"
                            >
                                🗑️
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
