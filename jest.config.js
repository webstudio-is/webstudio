module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/app/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": "esbuild-jest",
  },
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/app/$1",
  },
};
