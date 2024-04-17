/**
 * Build-time Environment Variables
 *
 * These variables are injected into your bundle at build time based on the environment settings.
 * - Configuration: See envPrefix in [vite.config.ts](../../vite.config.ts)  (GITHUB_)
 * - Documentation: Refer to the [Vite documentation](https://vitejs.dev/guide/env-and-mode)
 * - Type Definitions: See [vite-env.d.ts](./vite-env.d.ts) in this directory
 */
export const staticEnv = {
  GITHUB_REF_NAME: import.meta.env.GITHUB_REF_NAME,
  GITHUB_SHA: import.meta.env.GITHUB_SHA,
};
