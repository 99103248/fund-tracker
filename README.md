# 基金实时涨跌 - Fund Tracker

一个简洁美观的基金实时涨跌查询工具，支持添加/删除基金，数据自动保存。

![预览](https://img.shields.io/badge/Next.js-14-black) ![部署](https://img.shields.io/badge/Vercel-Ready-blue)

## ✨ 功能特点

- 📈 实时查看基金估值和涨跌幅
- ➕ 添加/删除基金
- 💾 本地保存（无需登录）
- 🔄 一键刷新数据
- 📱 响应式设计，支持手机访问
- 🎨 现代化深色主题

## 🚀 一键部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/fund-tracker)

## 💻 本地运行

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 打开浏览器访问
# http://localhost:3000
```

## 📁 项目结构

```
fund-tracker/
├── app/
│   ├── api/fund/route.js   # API 接口
│   ├── globals.css         # 全局样式
│   ├── layout.js           # 布局
│   └── page.js             # 主页面
├── package.json
└── README.md
```

## 🔧 常用基金代码

| 基金名称 | 代码 |
|---------|------|
| 易方达蓝筹精选 | 005827 |
| 招商中证白酒 | 161725 |
| 广发纳斯达克100 | 270042 |
| 华夏上证50ETF | 510050 |

## 📝 数据来源

基金数据来自天天基金实时估值接口，仅供参考，不构成投资建议。

## 📄 License

MIT
