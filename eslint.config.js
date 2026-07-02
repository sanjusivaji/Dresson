
import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    languageOptions: {
      globals: {
        ...globals.node, // <-- THIS IS THE MAGIC LINE
      },
    },
  },
  pluginJs.configs.recommended,
];