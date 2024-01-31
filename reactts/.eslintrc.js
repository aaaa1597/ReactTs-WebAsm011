module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:react/recommended",
        "prettier"
    ],
    "overrides": [
        {
            "env": {
                "node": true
            },
            "files": [
                ".eslintrc.{js,cjs}"
            ],
            "parserOptions": {
                "sourceType": "script"
            }
        }
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint",
        "react"
    ],
	"globals": {
		"read": false,
		"readbuffer": false,
		"readline": false,
		"scriptArgs": false,
		"arguments": false,
		"quit": false,
		"printErr": false,
	},
    "rules": {
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-empty-function": "off",
        "no-global-assign": "off",
        "no-constant-condition": ["error", { "checkLoops": false }],
        "getter-return": "off",
        "no-fallthrough": "off",
        "no-empty":  "off",
        "no-prototype-builtins":  "off",
        "no-redeclare":  "off",
        "no-useless-escape": "off",
        "no-useless-catch": "off",
        "@typescript-eslint/no-this-alias": "off",
        "no-undef": "off",
        "no-inner-declarations": "off",
    }
}
