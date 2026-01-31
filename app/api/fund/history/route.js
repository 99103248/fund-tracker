// Edge runtime for Cloudflare Pages
export const runtime = 'edge';

// 获取基金历史净值数据
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const days = parseInt(searchParams.get('days') || '30');

    if (!code) {
        return Response.json({ error: '请提供基金代码' }, { status: 400 });
    }

    try {
        // 计算需要获取的数据量（考虑周末和节假日，多取一些）
        const per = Math.min(Math.ceil(days * 1.5), 365);

        const response = await fetch(
            `http://fund.eastmoney.com/f10/F10DataApi.aspx?type=lsjz&code=${code}&page=1&per=${per}`,
            {
                headers: {
                    'Referer': 'http://fund.eastmoney.com/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            }
        );

        if (!response.ok) {
            throw new Error('历史数据获取失败');
        }

        const text = await response.text();

        // 解析HTML表格数据
        const history = [];
        const rowRegex = /<tr><td>(\d{4}-\d{2}-\d{2})<\/td><td class='tor bold'>([0-9.]+)<\/td><td class='tor bold'>([0-9.]+)<\/td><td class='tor bold (grn|red)?'>([+-]?[0-9.]+)?%?<\/td>/g;

        let match;
        while ((match = rowRegex.exec(text)) !== null && history.length < days) {
            history.push({
                date: match[1],
                nav: parseFloat(match[2]),
                accNav: parseFloat(match[3]),
                change: parseFloat(match[5] || 0)
            });
        }

        // 计算不同时期的涨跌幅
        const calcChange = (currentNav, targetNav) => {
            if (!targetNav || targetNav === 0) return null;
            return ((currentNav - targetNav) / targetNav * 100).toFixed(2);
        };

        const latestNav = history[0]?.nav;

        // 日涨跌（今日 vs 昨日）
        const dayChange = history.length > 1 ? calcChange(latestNav, history[1]?.nav) : null;

        // 周涨跌（今日 vs 5个交易日前）
        const weekChange = history.length > 5 ? calcChange(latestNav, history[5]?.nav) : null;

        // 月涨跌（今日 vs 约22个交易日前）
        const monthIdx = Math.min(22, history.length - 1);
        const monthChange = history.length > monthIdx ? calcChange(latestNav, history[monthIdx]?.nav) : null;

        // 年涨跌（今日 vs 约250个交易日前，如果有的话）
        const yearIdx = Math.min(250, history.length - 1);
        const yearChange = history.length > yearIdx ? calcChange(latestNav, history[yearIdx]?.nav) : null;

        return Response.json({
            code,
            history: history.slice(0, days).reverse(), // 按时间正序返回
            changes: {
                day: dayChange,
                week: weekChange,
                month: monthChange,
                year: yearChange
            }
        });

    } catch (error) {
        return Response.json(
            { error: error.message || '获取历史数据失败' },
            { status: 500 }
        );
    }
}
