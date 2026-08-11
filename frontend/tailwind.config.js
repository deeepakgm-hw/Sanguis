/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        sanguis: {
          50: "#FFF1F2",
          100: "#FFE4E6",
          200: "#FECDD3",
          500: "#E5384D",
          600: "#E5384D",
          700: "#D42D42",
          900: "#881337",
        },
        primary: { DEFAULT: "#E5384D", foreground: "#FFFFFF" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        destructive: { DEFAULT: "#E5384D", foreground: "#FFFFFF" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
