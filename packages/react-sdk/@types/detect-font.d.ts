declare module "detect-font" {
  type Options = {
    text?: string;
    fontSize?: number;
    baseFont?: string;
  };
  export function detectFont(element: Element, options?: Options): string;
}
