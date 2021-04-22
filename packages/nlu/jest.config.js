module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["dist", "node_modules"],
  rootDir: ".",
  setupFiles: ["./src/jest-before.ts"],
  globalSetup: "./src/jest-rewire.ts",
};
