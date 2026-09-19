import globals from "globals";
import pluginJs from "@eslint/js";

export default [

  {
    ignores: ["node_modules/", ".git/"]
  },

  {
    languageOptions: {
      globals: {
        ...globals.node, 
      },
    },
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
    }
  },


  pluginJs.configs.recommended,

  {
    files: ["public/**/*.js"],
    languageOptions: {
      globals: {
        ...globals.browser, // Fixes 'window', 'document', 'FileReader', 'requestAnimationFrame'
        Cropper: "readonly" // Fixes the 'Cropper' is not defined error
      },
    },
  }
];











// import globals from "globals";
// import pluginJs from "@eslint/js";

// export default [
//   {
//     languageOptions: {
//       globals: {
//         ...globals.node, 
//       },
//     },
//   },
//   pluginJs.configs.recommended,
// ];