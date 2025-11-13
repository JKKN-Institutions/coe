/**
 * PREMIUM SAAS TAILWIND CONFIG
 *
 * Features:
 * - Space Grotesk display font
 * - Emerald primary accent (#059669)
 * - Enhanced spacing scale
 * - Custom shadows
 * - Smooth animations
 */

import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		"./lib/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ['Inter', 'system-ui', 'sans-serif'],
				display: ['Poppins', 'sans-serif'],
				inter: ['var(--font-inter)', 'Helvetica Neue', 'Arial', 'sans-serif'],
				poppins: ['var(--font-poppins)', 'Poppins', 'sans-serif'],
				grotesk: ['var(--font-space-grotesk)', 'Space Grotesk', 'sans-serif'], // Legacy
				montserrat: ['var(--font-montserrat)', 'Montserrat', 'Segoe UI', 'Arial', 'sans-serif'],
				heading: ['var(--font-montserrat)', 'Montserrat', 'Segoe UI', 'Arial', 'sans-serif'], // Alias for montserrat
			},
			colors: {
				// Brand Primary Green (from brand-styling skill)
				'brand-green': {
					DEFAULT: '#0b6d41',  // PRIMARY BRAND GREEN
					50: '#e6f5ee',
					100: '#b3e0cc',
					200: '#80cbaa',
					300: '#4db688',
					400: '#2a9966',
					500: '#0b6d41',  // PRIMARY
					600: '#095a35',
					700: '#074829',
					800: '#05351d',
					900: '#032211',
				},
				// Legacy emerald colors for backward compatibility
				emerald: {
					50: '#ECFDF5',
					100: '#D1FAE5',
					200: '#A7F3D0',
					300: '#6EE7B7',
					400: '#34D399',
					500: '#10B981',
					600: '#059669',
					700: '#047857',
					800: '#065F46',
					900: '#064E3B',
					950: '#022C22',
				},
				'brand-yellow': {
					DEFAULT: '#ffde59',
					50: '#fffdf0',
					100: '#fffae0',
					200: '#fff5c2',
					300: '#fff0a3',
					400: '#ffeb85',
					500: '#ffde59',
					600: '#ffd033',
					700: '#ffc20d',
					800: '#e6a600',
					900: '#b38000',
				},
				'brand-cream': {
					DEFAULT: '#fbfbee',
					50: '#fefef9',
					100: '#fdfdf4',
					200: '#fbfbee',
					300: '#f9f9e8',
					400: '#f7f7e2',
					500: '#f5f5dc',
					600: '#d9d9c0',
					700: '#bdbda4',
					800: '#a1a188',
					900: '#85856c',
				},
				// Shadcn theme colors (updated for emerald)
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				info: {
					DEFAULT: 'hsl(var(--info))',
					foreground: 'hsl(var(--info-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				'none': '0',
				'sm': '0.25rem',      // 4px
				'DEFAULT': '0.5rem',  // 8px
				'md': '0.625rem',     // 10px
				'lg': '0.75rem',      // 12px
				'xl': '1rem',         // 16px
				'2xl': '1.25rem',     // 20px
				'3xl': '1.5rem',      // 24px
				'full': '9999px',
			},
			boxShadow: {
				'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
				'sm': '0 1px 3px 0 rgb(0 0 0 / 0.08)',
				DEFAULT: '0 2px 8px -2px rgb(0 0 0 / 0.1)',
				'md': '0 4px 12px -2px rgb(0 0 0 / 0.12)',
				'lg': '0 8px 24px -4px rgb(0 0 0 / 0.15)',
				'xl': '0 12px 32px -8px rgb(0 0 0 / 0.18)',
				'2xl': '0 20px 40px -12px rgb(0 0 0 / 0.2)',
				'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
			},
			spacing: {
				'0.5': '0.125rem',   // 2px
				'4.5': '1.125rem',   // 18px
				'18': '4.5rem',      // 72px
				'88': '22rem',       // 352px
				'112': '28rem',      // 448px
				'128': '32rem',      // 512px
			},
			keyframes: {
				// Existing animations
				spin: {
					from: { transform: 'rotate(0deg)' },
					to: { transform: 'rotate(360deg)' }
				},
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' }
				},
				slideUp: {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				slideDown: {
					'0%': { opacity: '0', transform: 'translateY(-10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				slideInFromLeft: {
					'0%': { opacity: '0', transform: 'translateX(-20px)' },
					'100%': { opacity: '1', transform: 'translateX(0)' }
				},
				slideInFromRight: {
					'0%': { opacity: '0', transform: 'translateX(20px)' },
					'100%': { opacity: '1', transform: 'translateX(0)' }
				},
				scaleIn: {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				},
				bounceSubtle: {
					'0%, 20%, 50%, 80%, 100%': {
						transform: 'translateY(0)'
					},
					'40%': {
						transform: 'translateY(-4px)'
					},
					'60%': {
						transform: 'translateY(-2px)'
					}
				},
				// Premium animations
				'fade-slide-in': {
					'0%': { opacity: '0', transform: 'translateY(8px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'scale-bounce': {
					'0%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.02)' },
					'100%': { transform: 'scale(1)' }
				},
				shimmer: {
					'0%': { backgroundPosition: '-200% 0' },
					'100%': { backgroundPosition: '200% 0' }
				},
				pulse: {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.5' }
				},
			},
			animation: {
				spin: 'spin 1s linear infinite',
				fadeIn: 'fadeIn 0.5s ease-in-out',
				slideUp: 'slideUp 0.3s ease-out',
				slideDown: 'slideDown 0.3s ease-out',
				slideInFromLeft: 'slideInFromLeft 0.3s ease-out',
				slideInFromRight: 'slideInFromRight 0.3s ease-out',
				scaleIn: 'scaleIn 0.2s ease-out',
				bounceSubtle: 'bounceSubtle 0.6s ease-in-out',
				'fade-slide-in': 'fade-slide-in 0.4s ease-out',
				'scale-bounce': 'scale-bounce 0.3s ease-in-out',
				shimmer: 'shimmer 1.5s infinite',
				pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
			},
			transitionTimingFunction: {
				'ease-smooth': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
				'ease-bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
			},
			transitionDuration: {
				'2000': '2000ms',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
};

export default config;
