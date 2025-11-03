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
  			sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
  			inter: ['var(--font-inter)', 'system-ui', 'sans-serif'],
  			heading: ['var(--font-poppins)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
  			poppins: ['var(--font-poppins)', 'system-ui', 'sans-serif'],
  		},
  		colors: {
  			// Brand Colors
  			'brand-green': {
  				DEFAULT: '#0b6d41',
  				50: '#e6f4ed',
  				100: '#cce9dc',
  				200: '#99d3b9',
  				300: '#66bd96',
  				400: '#33a773',
  				500: '#0b6d41',
  				600: '#095734',
  				700: '#074127',
  				800: '#052c1a',
  				900: '#02160d',
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
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			spin: {
  				from: {
  					transform: 'rotate(0deg)'
  				},
  				to: {
  					transform: 'rotate(360deg)'
  				}
  			},
  			fadeIn: {
  				'0%': { opacity: '0' },
  				'100%': { opacity: '1' }
  			},
  			slideUp: {
  				'0%': { 
  					opacity: '0',
  					transform: 'translateY(10px)'
  				},
  				'100%': { 
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			slideDown: {
  				'0%': { 
  					opacity: '0',
  					transform: 'translateY(-10px)'
  				},
  				'100%': { 
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			scaleIn: {
  				'0%': { 
  					opacity: '0',
  					transform: 'scale(0.95)'
  				},
  				'100%': { 
  					opacity: '1',
  					transform: 'scale(1)'
  				}
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
  			shimmer: {
  				'0%': {
  					backgroundPosition: '-200% 0'
  				},
  				'100%': {
  					backgroundPosition: '200% 0'
  				}
  			}
  		},
  		animation: {
  			spin: 'spin 1s linear infinite',
  			fadeIn: 'fadeIn 0.5s ease-in-out',
  			slideUp: 'slideUp 0.3s ease-out',
  			slideDown: 'slideDown 0.3s ease-out',
  			scaleIn: 'scaleIn 0.2s ease-out',
  			bounceSubtle: 'bounceSubtle 0.6s ease-in-out',
  			shimmer: 'shimmer 1.5s infinite'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;