/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./views/**/*.ejs",                      
    "./public/**/*.html",
    "./src/**/*.js",
    "./**/*.ejs",                     
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
