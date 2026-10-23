/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        navy: {
          50: "hsl(220, 100%, 97%)",
          100: "hsl(220, 91%, 91%)",
          200: "hsl(221, 83%, 83%)",
          300: "hsl(222, 76%, 72%)",
          400: "hsl(224, 69%, 60%)",
          500: "hsl(225, 65%, 48%)",
          600: "hsl(226, 66%, 40%)",
          700: "hsl(227, 68%, 32%)",
          800: "hsl(228, 70%, 24%)",
          900: "hsl(230, 75%, 16%)",
          950: "hsl(232, 80%, 10%)",
        },
        teal: {
          50: "hsl(166, 76%, 97%)",
          100: "hsl(167, 70%, 88%)",
          200: "hsl(168, 64%, 76%)",
          300: "hsl(170, 58%, 62%)",
          400: "hsl(172, 54%, 48%)",
          500: "hsl(174, 60%, 38%)",
          600: "hsl(175, 65%, 30%)",
          700: "hsl(176, 70%, 24%)",
          800: "hsl(177, 74%, 18%)",
          900: "hsl(178, 78%, 12%)",
        },
        forest: {
          DEFAULT: "#183D30",
          dark: "#102B22",
          light: "#245242",
        },
        gold: {
          DEFAULT: "#D9A34A",
          light: "#E5B96D",
          dark: "#B8842E",
        },
        sage: {
          DEFAULT: "#E6EDE5",
          light: "#F0F5EF",
          dark: "#C8D9C6",
        },
        warmwhite: "#F7F5EF",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.2s ease-out",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        serif: ["Merriweather", "Georgia", "serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
