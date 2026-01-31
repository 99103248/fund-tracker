import './globals.css'

export const metadata = {
    title: '基金实时涨跌 - Fund Tracker',
    description: '实时追踪您的基金涨跌情况',
}

export default function RootLayout({ children }) {
    return (
        <html lang="zh-CN">
            <body>{children}</body>
        </html>
    )
}
