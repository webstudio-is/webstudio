declare module "culori" {
  export function converter(mode: string): (color: unknown) => unknown;
  export function parse(input: string): unknown;
  export function formatCss(color: unknown): string | undefined;
}
