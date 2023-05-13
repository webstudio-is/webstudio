declare module "css-box-shadow" {
  type ParsedBoxShadowValue = {
    inset: boolean;
    offsetX: string | number;
    offsetY: string | number;
    blurRadius: string | number;
    spreadRadius: string | number;
    color: string;
  };

  export function parse(value: string): ParsedBoxShadowValue[];

  export function stringify(value: ParsedBoxShadowValue[]): string;
}
