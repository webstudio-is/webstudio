import type { Config } from "vike/types";

export default {
  prerender: { disableAutoRun: true },
  meta: {
    Head: {
      env: { server: true, client: true },
    },
    lang: {
      env: { server: true, client: true },
    },
  },
} satisfies Config;
