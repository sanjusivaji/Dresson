/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./views/**/*.ejs",           // Better than ./**/*
    "./public/**/*.html",
    "./src/**/*.js",
    "./**/*.ejs",                 // keep as fallback
  ],
 theme: {
    extend: {
      colors: {
        'primary-violet': '#8B8DF8', //  Tailwind now owns this color permanently!
      }
    },
  },
  plugins: [],
}
