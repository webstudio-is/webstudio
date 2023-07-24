/**
 * Variables source:
 * https://github.com/shadcn-ui/ui/blob/main/apps/www/registry/themes.ts#L1
 * https://github.com/shadcn-ui/ui/blob/5e172fc34fdf015aa0d141f52cc8c082b8ae6613/apps/www/scripts/build-registry.ts#L220
 *
 * Attributions
 * MIT License
 * Copyright (c) 2023 shadcn
 **/

import type { StyleValue } from "@webstudio-is/css-data";

/**
 * --popover: 0 0% 100%;
 * same as rgb(255, 255, 255)
 **/
export const popover = {
  type: "rgb",
  alpha: 1,
  r: 255,
  g: 255,
  b: 255,
} as const satisfies StyleValue;

/**
 * --popover-foreground: 222.2 84% 4.9%;
 * same as rgb(2, 8, 23)
 **/
export const popoverForeground = {
  type: "rgb",
  alpha: 1,
  r: 2,
  g: 8,
  b: 23,
} as const satisfies StyleValue;

/**
 * --border: 214.3 31.8% 91.4%;
 * same as --border:rgb(226, 232, 240)
 **/
export const border = {
  type: "rgb",
  alpha: 1,
  r: 226,
  g: 232,
  b: 240,
} as const satisfies StyleValue;

/**
 * --radius: 0.5rem;
 **/
export const radius = {
  type: "unit",
  value: 0.5,
  unit: "rem",
} as const satisfies StyleValue;

/*
// Not used, leave it for the following components.

--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;

--muted: 210 40% 96.1%;
--muted-foreground: 215.4 16.3% 46.9%;

--card: 0 0% 100%;
--card-foreground: 222.2 84% 4.9%;

--input: 214.3 31.8% 91.4%;

--primary: 222.2 47.4% 11.2%;
--primary-foreground: 210 40% 98%;

--secondary: 210 40% 96.1%;
--secondary-foreground: 222.2 47.4% 11.2%;

--accent: 210 40% 96.1%;
--accent-foreground: 222.2 47.4% 11.2%;

--destructive: 0 84.2% 60.2%;
--destructive-foreground: 210 40% 98%;

--ring: 215 20.2% 65.1%;
*/
