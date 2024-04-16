// Build time private variables
// The values exported from this module are statically injected into your bundle at build time.

// For easy search names are same as at github action
// https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables

// Every entry must be a `{key}: process.env.{key}`
// See vite.config.ts for more details
export const staticEnv = {
  GITHUB_REF_NAME: process.env.GITHUB_REF_NAME,
  GITHUB_SHA: process.env.GITHUB_SHA,
};
