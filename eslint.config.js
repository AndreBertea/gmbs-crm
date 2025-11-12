const path = require("path")
const { FlatCompat } = require("@eslint/eslintrc")

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
})

module.exports = [
  {
    ignores: [
      "**/node_modules/**",
      ".next/**",
      "dist/**",
      "out/**",
      "build/**",
      "coverage/**",
    ],
  },
  ...compat.config({
    extends: ["next/core-web-vitals"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/src/*"],
              message: "N'utilise jamais @/src — utilise @/ direct.",
            },
            {
              group: ["../*", "../../*", "../../../*"],
              message: "Utilise l'alias @/ pour les imports cross-feature.",
            },
          ],
        },
      ],
    },
  }),
  {
    files: [
      "scripts/**/*.{js,ts,tsx}",
      "examples/**/*.{js,ts,tsx}",
      "tests/**/*.{js,ts,tsx}",
      "supabase/functions/**/*.{js,ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]
