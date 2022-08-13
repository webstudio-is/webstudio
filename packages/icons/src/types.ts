import type {
  SVGAttributes,
  RefAttributes,
  ForwardRefExoticComponent,
} from "react";

export interface IconProps extends SVGAttributes<SVGElement> {
  children?: never;
  color?: string;
}

export type IconComponent = ForwardRefExoticComponent<
  IconProps & RefAttributes<SVGSVGElement>
>;

export type IconRecord = Record<string, IconComponent>;
export type IconRecords = Record<string, IconRecord>;
