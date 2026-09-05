import react from "eslint-plugin-react";
export default [{
  files: ["App.js", "src/**/*.js"],
  plugins: { react },
  languageOptions: {
    ecmaVersion: 2022, sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } },
    globals: { console: "readonly", setTimeout: "readonly", clearTimeout: "readonly", setInterval: "readonly", clearInterval: "readonly", require: "readonly", FormData: "readonly", fetch: "readonly", URL: "readonly" },
  },
  settings: { react: { version: "19.0" } },
  rules: { "no-undef": "error", "react/jsx-no-undef": "error", "react/jsx-uses-vars": "error", "react/jsx-uses-react": "error", "no-unused-vars": ["warn", { args: "none", caughtErrors: "none" }] },
}];
