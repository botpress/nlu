module.exports = {
  preset: "ts-jest",
  globals: {
    "ts-jest": {
      babelConfig: true,
      diagnostics: false,
    },
  },
  testEnvironment: "node",
};
