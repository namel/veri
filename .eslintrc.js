module.exports = {
    "extends": "google",
    "env": {
        "amd": true,
        "browser": true
    },
    "installedESLint": true,
    "parserOptions": {
        "ecmaVersion": 6
    },
    "rules": {
        "brace-style": "off",
        "comma-dangle": 0,
        "dot-notation": "off",
        "indent": ["error", 4],
        "linebreak-style": [2, "unix"],
        "max-len": ["error", {
            "code": 120
        } ],
        "max-statements-per-line": "off",
        "new-cap": "off",
        "no-console": "off",
        "no-unused-expressions": "off",
        "no-warning-comments": "off",
        "object-curly-spacing": ["error", "always"],
        "padded-blocks": "off",
        "require-jsdoc": "off",
        "space-before-function-paren": "off"
    }

};
