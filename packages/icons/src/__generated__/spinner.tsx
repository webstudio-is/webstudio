// Generated from icons/spinner.svg

import { forwardRef } from "react";
import type { IconProps } from "../types";

// prettier-ignore
export const SpinnerIcon = forwardRef<SVGSVGElement, IconProps>(
  ({ color = "currentColor", size = 16, ...props }, forwardedRef) => {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" id="e2CRglijn891" shapeRendering="geometricPrecision" textRendering="geometricPrecision" viewBox="0 0 128 128" width={size} height={size} fill={color} {...props} ref={forwardedRef}><style>{"@keyframes e2CRglijn892_tr__tr{0%{transform:translate(64px,64px) rotate(90deg);animation-timing-function:cubic-bezier(.42,0,.58,1)}50%{transform:translate(64px,64px) rotate(810deg);animation-timing-function:cubic-bezier(.42,0,.58,1)}to{transform:translate(64px,64px) rotate(1530deg)}}@keyframes e2CRglijn892_s_p{0%,to{stroke:#39fbbb}25%{stroke:#4a4efa}50%{stroke:#e63cfe}75%{stroke:#ffae3c}}@keyframes e2CRglijn892_s_do{0%{stroke-dashoffset:251.89}2.5%,52.5%{stroke-dashoffset:263.88;animation-timing-function:cubic-bezier(.42,0,.58,1)}25%,75%{stroke-dashoffset:131.945}to{stroke-dashoffset:251.885909}}#e2CRglijn892_tr{animation:e2CRglijn892_tr__tr 3000ms linear infinite normal forwards}#e2CRglijn892{animation-name:e2CRglijn892_s_p,e2CRglijn892_s_do;animation-duration:3000ms;animation-fill-mode:forwards;animation-timing-function:linear;animation-direction:normal;animation-iteration-count:infinite}"}</style><g id="e2CRglijn892_tr" transform="translate(64,64) rotate(90)"><circle id="e2CRglijn892" r="42" fill="none" stroke="#39fbbb" strokeDasharray="263.89" strokeDashoffset="251.89" strokeLinecap="round" strokeWidth="16" transform="scale(-1,1) translate(0,0)" /></g></svg>
    );
  }
);

SpinnerIcon.displayName = "SpinnerIcon";
