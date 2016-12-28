# babel-plugin-transform-dead-code-elimination [![Build Status](https://travis-ci.org/erikdesjardins/babel-plugin-transform-dead-code-elimination.svg?branch=master)](https://travis-ci.org/erikdesjardins/babel-plugin-transform-dead-code-elimination) [![Coverage Status](https://coveralls.io/repos/github/erikdesjardins/babel-plugin-transform-dead-code-elimination/badge.svg?branch=master)](https://coveralls.io/github/erikdesjardins/babel-plugin-transform-dead-code-elimination?branch=master)


Babel 6 fork of babel-plugin-dead-code-elimination.

Incorporates fixes from [achicu/babel-plugin-dead-code-elimination](https://github.com/achicu/babel-plugin-dead-code-elimination).

## Installation

`npm install --save-dev babel-plugin-transform-dead-code-elimination`

## Usage

**.babelrc:**

```json
{
  "plugins": [
    "transform-dead-code-elimination"
  ]
}
```

Or, with options (note: `experimentalInlining` will almost definitely break your code):

```json
{
  "plugins": [
    ["transform-dead-code-elimination", {
      "experimentalInlining": true
    }]
  ]
}
```
