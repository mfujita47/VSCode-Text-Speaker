import tseslint from "typescript-eslint";

export default tseslint.config(
    { ignores: ["dist/**", "out/**", "*.vsix"] },

    // Type-aware rules are worth the cost here: this extension is almost entirely async, and
    // a dropped promise in an editor extension fails silently.
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            // Unused arguments are allowed when prefixed with an underscore.
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
            "no-console": "warn",
            eqeqeq: ["error", "always"],
        },
    },
    {
        // Empty catch blocks are the point in a few places: teardown must not throw.
        files: ["src/tts/*.ts"],
        rules: { "no-empty": ["error", { allowEmptyCatch: true }] },
    },
    {
        files: ["eslint.config.mjs"],
        ...tseslint.configs.disableTypeChecked,
    },
);
