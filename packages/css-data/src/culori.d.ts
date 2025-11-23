declare module "culori" {
  // Minimal surface we use; culori ships JS only.
  export function converter(mode: string): (color: unknown) => unknown;
  export function parse(input: string): unknown;
  export function formatCss(color: unknown): string | undefined;
}
