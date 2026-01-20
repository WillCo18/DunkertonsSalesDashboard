/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './src/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                // Night Ops Theme Colors
                background: '#1D1D1D',
                surface: '#2A2A2A',
                'surface-elevated': '#333333',
                border: 'rgba(238, 238, 238, 0.10)',
                'border-strong': 'rgba(238, 238, 238, 0.20)',

                // Text
                foreground: '#EEEEEE',
                'foreground-secondary': 'rgba(238, 238, 238, 0.65)',
                'foreground-muted': 'rgba(238, 238, 238, 0.45)',

                // Accent
                accent: {
                    DEFAULT: '#44D1B8',
                    light: '#5DDFC7',
                    dark: '#36B89F',
                    muted: 'rgba(68, 209, 184, 0.15)',
                },

                // Status
                success: '#10B981',
                warning: '#F59E0B',
                danger: '#EF4444',
                info: '#06B6D4',
            },
            fontFamily: {
                sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
                mono: ['var(--font-jetbrains-mono)', 'JetBrains Mono', 'monospace'],
            },
            fontSize: {
                'kpi': ['2.5rem', { lineHeight: '1', fontWeight: '700' }],
                'kpi-label': ['0.75rem', { lineHeight: '1.2', letterSpacing: '0.05em', fontWeight: '500' }],
            },
            boxShadow: {
                'glow': '0 0 20px rgba(68, 209, 184, 0.3)',
                'glow-sm': '0 0 10px rgba(68, 209, 184, 0.2)',
                'card': '0 4px 6px rgba(0, 0, 0, 0.3)',
            },
            borderRadius: {
                lg: '12px',
                md: '8px',
                sm: '4px',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
}
