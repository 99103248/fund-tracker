// Edge runtime for Cloudflare Pages
export const runtime = 'edge';

// 数据源配置
const DATA_SOURCES = {
    tiantian: {
        name: '天天基金',
        hasScale: false,
        priority: 1,
        description: '实时估值'
    },
    eastmoney_mobile: {
        name: '东方财富(移动)',
        hasScale: false,
        priority: 2,
        description: '移动端API'
    },
    eastmoney_lsjz: {
        name: '东方财富(LSJZ)',
        hasScale: false,
        priority: 3,
        description: '历史净值API'
    },
    danjuan: {
        name: '蛋卷基金',
        hasScale: false,
        priority: 4,
        description: '蛋卷投资'
    },
    eastmoney_f10: {
        name: '东方财富(F10)',
        hasScale: false,
        priority: 5,
        description: 'F10数据接口'
    }
};

// 从天天基金获取数据（实时估值）
async function fetchFromTiantian(code) {
    const response = await fetch(
        `http://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`,
        {
            headers: {
                'Referer': 'http://fund.eastmoney.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }
    );

    if (!response.ok) {
        throw new Error('天天基金接口请求失败');
    }

    const text = await response.text();
    const match = text.match(/jsonpgz\((.*)\)/);
    if (!match) {
        throw new Error('无效的基金代码');
    }

    const fundData = JSON.parse(match[1]);

    return {
        code: fundData.fundcode,
        name: fundData.name,
        netValue: fundData.dwjz,
        netValueDate: fundData.jzrq,
        estimateValue: fundData.gsz,
        estimateChange: parseFloat(fundData.gszzl),
        updateTime: fundData.gztime,
        scale: '--',
        source: 'tiantian'
    };
}

// 从东方财富移动端API获取数据
async function fetchFromEastmoneyMobile(code) {
    const response = await fetch(
        `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNFInfo?plat=Android&appType=ttjj&product=EFund&Version=1&deviceid=1&Fcodes=${code}`,
        {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }
    );

    if (!response.ok) {
        throw new Error('东方财富移动API请求失败');
    }

    const data = await response.json();

    if (!data.Datas || data.Datas.length === 0) {
        throw new Error('未找到基金数据');
    }

    const fundData = data.Datas[0];

    // 尝试获取基金名称
    let fundName = fundData.SHORTNAME || code;

    return {
        code: fundData.FCODE,
        name: fundName,
        netValue: fundData.NAV,
        netValueDate: fundData.PDATE,
        estimateValue: fundData.GSZ || fundData.NAV,
        estimateChange: parseFloat(fundData.GSZZL || fundData.NAVCHGRT || 0),
        updateTime: data.Expansion?.FSRQ || fundData.PDATE,
        scale: '--',
        source: 'eastmoney_mobile'
    };
}

// 从东方财富LSJZ API获取数据
async function fetchFromEastmoneyLSJZ(code) {
    const response = await fetch(
        `http://api.fund.eastmoney.com/f10/lsjz?callback=jQuery&fundCode=${code}&pageIndex=1&pageSize=1`,
        {
            headers: {
                'Referer': 'http://fund.eastmoney.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }
    );

    if (!response.ok) {
        throw new Error('东方财富LSJZ API请求失败');
    }

    const text = await response.text();
    // 解析 jQuery(...) 格式
    const jsonMatch = text.match(/jQuery\((.*)\)/);
    if (!jsonMatch) {
        throw new Error('LSJZ数据解析失败');
    }

    const data = JSON.parse(jsonMatch[1]);

    if (!data.Data || !data.Data.LSJZList || data.Data.LSJZList.length === 0) {
        throw new Error('未找到基金数据');
    }

    const fundData = data.Data.LSJZList[0];

    // 获取基金名称
    let fundName = code;
    try {
        const nameResponse = await fetch(
            `http://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`,
            { headers: { 'Referer': 'http://fund.eastmoney.com/', 'User-Agent': 'Mozilla/5.0' } }
        );
        if (nameResponse.ok) {
            const nameText = await nameResponse.text();
            const nameMatch = nameText.match(/jsonpgz\((.*)\)/);
            if (nameMatch) {
                fundName = JSON.parse(nameMatch[1]).name;
            }
        }
    } catch (e) { /* ignore */ }

    return {
        code: code,
        name: fundName,
        netValue: fundData.DWJZ,
        netValueDate: fundData.FSRQ,
        estimateValue: fundData.DWJZ,
        estimateChange: parseFloat(fundData.JZZZL || 0),
        updateTime: fundData.FSRQ + ' 15:00',
        scale: '--',
        source: 'eastmoney_lsjz'
    };
}

// 从蛋卷基金获取数据
async function fetchFromDanjuan(code) {
    const response = await fetch(
        `https://danjuanfunds.com/djapi/fund/nav-history/${code}?size=1&page=1`,
        {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }
    );

    if (!response.ok) {
        throw new Error('蛋卷基金API请求失败');
    }

    const data = await response.json();

    if (data.result_code !== 0 || !data.data || !data.data.items || data.data.items.length === 0) {
        throw new Error('未找到基金数据');
    }

    const fundData = data.data.items[0];

    // 获取基金名称
    let fundName = code;
    try {
        const nameResponse = await fetch(
            `http://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`,
            { headers: { 'Referer': 'http://fund.eastmoney.com/', 'User-Agent': 'Mozilla/5.0' } }
        );
        if (nameResponse.ok) {
            const nameText = await nameResponse.text();
            const nameMatch = nameText.match(/jsonpgz\((.*)\)/);
            if (nameMatch) {
                fundName = JSON.parse(nameMatch[1]).name;
            }
        }
    } catch (e) { /* ignore */ }

    return {
        code: code,
        name: fundName,
        netValue: fundData.gr_nav,
        netValueDate: fundData.date,
        estimateValue: fundData.gr_nav,
        estimateChange: parseFloat(fundData.gr_per || 0),
        updateTime: fundData.date + ' 15:00',
        scale: '--',
        source: 'danjuan'
    };
}

// 从东方财富F10获取数据（历史净值）
async function fetchFromEastmoneyF10(code) {
    const response = await fetch(
        `http://fund.eastmoney.com/f10/F10DataApi.aspx?type=lsjz&code=${code}&page=1&per=1`,
        {
            headers: {
                'Referer': 'http://fund.eastmoney.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }
    );

    if (!response.ok) {
        throw new Error('东方财富F10接口请求失败');
    }

    const text = await response.text();

    // 解析返回的HTML表格数据
    const dateMatch = text.match(/<td[^>]*>(\d{4}-\d{2}-\d{2})<\/td>/);
    const navMatch = text.match(/<td[^>]*class='tor bold'[^>]*>([0-9.]+)<\/td>/);
    const changeMatch = text.match(/<td[^>]*class='tor bold (grn|red)'[^>]*>([+-]?[0-9.]+)%<\/td>/);

    if (!dateMatch || !navMatch) {
        throw new Error('东方财富数据解析失败');
    }

    // 获取基金名称
    let fundName = code;
    try {
        const nameResponse = await fetch(
            `http://fundgz.1234567.com.cn/js/${code}.js?rt=${Date.now()}`,
            { headers: { 'Referer': 'http://fund.eastmoney.com/', 'User-Agent': 'Mozilla/5.0' } }
        );
        if (nameResponse.ok) {
            const nameText = await nameResponse.text();
            const nameMatch = nameText.match(/jsonpgz\((.*)\)/);
            if (nameMatch) {
                fundName = JSON.parse(nameMatch[1]).name;
            }
        }
    } catch (e) { /* ignore */ }

    const netValue = navMatch[1];
    const changeValue = changeMatch ? parseFloat(changeMatch[2]) : 0;

    return {
        code: code,
        name: fundName,
        netValue: netValue,
        netValueDate: dateMatch[1],
        estimateValue: netValue,
        estimateChange: changeValue,
        updateTime: dateMatch[1] + ' 15:00',
        scale: '--',
        source: 'eastmoney_f10'
    };
}

// 获取数据源列表（按优先级排序，偏好源优先）
function getSourcePriority(preferredSource) {
    const sources = Object.keys(DATA_SOURCES).sort(
        (a, b) => DATA_SOURCES[a].priority - DATA_SOURCES[b].priority
    );

    if (preferredSource && DATA_SOURCES[preferredSource]) {
        const idx = sources.indexOf(preferredSource);
        if (idx > 0) {
            sources.splice(idx, 1);
            sources.unshift(preferredSource);
        }
    }

    return sources;
}

// 根据数据源名称获取对应的获取函数
async function fetchFromSource(source, code) {
    switch (source) {
        case 'tiantian':
            return await fetchFromTiantian(code);
        case 'eastmoney_mobile':
            return await fetchFromEastmoneyMobile(code);
        case 'eastmoney_lsjz':
            return await fetchFromEastmoneyLSJZ(code);
        case 'danjuan':
            return await fetchFromDanjuan(code);
        case 'eastmoney_f10':
            return await fetchFromEastmoneyF10(code);
        default:
            throw new Error(`未知数据源: ${source}`);
    }
}

// 主数据获取函数，支持自动故障转移
async function fetchFundData(code, preferredSource) {
    const sources = getSourcePriority(preferredSource);
    const errors = [];

    for (const source of sources) {
        try {
            const data = await fetchFromSource(source, code);
            return data;
        } catch (e) {
            errors.push(`${DATA_SOURCES[source].name}: ${e.message}`);
            continue;
        }
    }

    throw new Error('所有数据源都不可用: ' + errors.join('; '));
}

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const source = searchParams.get('source');

    if (!code) {
        return Response.json({ error: '请提供基金代码' }, { status: 400 });
    }

    try {
        const data = await fetchFundData(code, source);
        return Response.json(data);
    } catch (error) {
        return Response.json(
            { error: error.message || '获取数据失败' },
            { status: 500 }
        );
    }
}

// 导出数据源列表供前端使用
export async function OPTIONS(request) {
    return Response.json({
        sources: Object.entries(DATA_SOURCES).map(([key, value]) => ({
            id: key,
            name: value.name,
            description: value.description,
            hasScale: value.hasScale
        }))
    });
}
