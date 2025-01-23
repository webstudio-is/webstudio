import { forwardRef } from "react";
import type { IconComponent } from "../types";

export const AccordionIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.056 8H14.5V4.101a1.3 1.3 0 0 0-1.3-1.299H2.8a1.3 1.3 0 0 0-1.3 1.3V8H13.056ZM13.056 13.198h.145a1.3 1.3 0 0 0 1.299-1.3V8h-13v3.899a1.3 1.3 0 0 0 1.3 1.299h10.256Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m10.026 4.913.975.976.976-.976M10.026 10.111l.975.976.976-.976"
        />
      </svg>
    );
  }
);
AccordionIcon.displayName = "AccordionIcon";

export const AddTemplateInstanceIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 2H3.333A1.333 1.333 0 0 0 2 3.333V4.5M14 12.667c0 .021 0 .042-.002.063M11.5 14h1.167a1.333 1.333 0 0 0 1.331-1.27m0 0V11.5M2 11.5v1.167A1.333 1.333 0 0 0 3.333 14H4.5M7 14h2M2 7v2M8.461 4.77H14M11.23 2v5.538"
        />
      </svg>
    );
  }
);
AddTemplateInstanceIcon.displayName = "AddTemplateInstanceIcon";

export const AiLoadingIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        id="evA4hI5dD261"
        shapeRendering="geometricPrecision"
        textRendering="geometricPrecision"
        viewBox="0 0 17 17"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <style>
          {
            "@keyframes evA4hI5dD263_s_do{0%,to{stroke-dashoffset:6.2}17.5%,82.5%{stroke-dashoffset:-6.24}}@keyframes evA4hI5dD264_s_do{0%,10%,90%,to{stroke-dashoffset:6.8}22.5%,77.5%{stroke-dashoffset:-6.8}}@keyframes evA4hI5dD265_s_do{0%,17.5%,82.5%,to{stroke-dashoffset:2.32}27.5%,72.5%{stroke-dashoffset:-2.32}}@keyframes evA4hI5dD266_s_do{0%,22.5%,77.5%,to{stroke-dashoffset:2.47}32.5%,67.5%{stroke-dashoffset:-2.47}}@keyframes evA4hI5dD267_s_do{0%,27.5%,72.5%,to{stroke-dashoffset:5.42}40%,60%{stroke-dashoffset:-5.42}}@keyframes evA4hI5dD268_s_do{0%,32.5%,67.5%,to{stroke-dashoffset:6.13}50%{stroke-dashoffset:-6.1}}#evA4hI5dD263{animation:evA4hI5dD263_s_do 4000ms linear infinite normal forwards}#evA4hI5dD264{animation:evA4hI5dD264_s_do 4000ms linear infinite normal forwards}#evA4hI5dD265{animation:evA4hI5dD265_s_do 4000ms linear infinite normal forwards}#evA4hI5dD266{animation:evA4hI5dD266_s_do 4000ms linear infinite normal forwards}#evA4hI5dD267{animation:evA4hI5dD267_s_do 4000ms linear infinite normal forwards}#evA4hI5dD268{animation:evA4hI5dD268_s_do 4000ms linear infinite normal forwards}"
          }
        </style>
        <path
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeDasharray="0"
          strokeLinecap="round"
          strokeWidth="2.2"
          d="m2.816 12.956 1.513-6.051a2.563 2.563 0 0 1 4.974 0l1.159 4.634a1.888 1.888 0 0 0 1.816 1.417 1.892 1.892 0 0 0 1.872-1.872V4.956"
        />
        <path
          id="evA4hI5dD263"
          fill="none"
          stroke="#fff"
          strokeDasharray="6.24"
          strokeDashoffset="6.2"
          strokeLinecap="round"
          strokeWidth="3.3"
          d="m2.816 12.956 1.513-6.051"
        />
        <path
          id="evA4hI5dD264"
          fill="none"
          stroke="#fff"
          strokeDasharray="6.8"
          strokeDashoffset="6.8"
          strokeLinecap="round"
          strokeWidth="3.3"
          d="M4.329 6.905a2.563 2.563 0 0 1 4.974 0"
        />
        <path
          id="evA4hI5dD265"
          fill="none"
          stroke="#fff"
          strokeDasharray="2.32"
          strokeDashoffset="2.32"
          strokeLinecap="round"
          strokeWidth="3.3"
          d="m9.303 6.905.561 2.243"
        />
        <path
          id="evA4hI5dD266"
          fill="none"
          stroke="#fff"
          strokeDasharray="2.47"
          strokeDashoffset="2.47"
          strokeLinecap="round"
          strokeWidth="3.3"
          d="m9.864 9.148.598 2.391"
        />
        <path
          id="evA4hI5dD267"
          fill="none"
          stroke="#fff"
          strokeDasharray="5.42"
          strokeDashoffset="5.42"
          strokeLinecap="round"
          strokeWidth="3.3"
          d="M10.462 11.54a1.888 1.888 0 0 0 1.816 1.416 1.892 1.892 0 0 0 1.872-1.872"
        />
        <path
          id="evA4hI5dD268"
          fill="none"
          stroke="#fff"
          strokeDasharray="6.13"
          strokeDashoffset="6.13"
          strokeLinecap="round"
          strokeWidth="3.3"
          d="M14.15 11.084V4.956"
        />
      </svg>
    );
  }
);
AiLoadingIcon.displayName = "AiLoadingIcon";

export const AiIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          d="m1.5 12.588 1.735-6.94a2.94 2.94 0 0 1 5.705 0l1.33 5.315a2.165 2.165 0 0 0 2.083 1.625 2.17 2.17 0 0 0 2.147-2.147v-7.03"
        />
      </svg>
    );
  }
);
AiIcon.displayName = "AiIcon";

export const AlertCircleIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fillRule="evenodd"
          d="m11.28 1.023-.56.06A10.685 10.685 0 0 0 7.18 2.12c-1.135.551-1.987 1.165-2.942 2.119-.961.959-1.595 1.841-2.141 2.981C.301 10.968.728 15.286 3.226 18.633c.475.636 1.527 1.683 2.174 2.164 3.964 2.948 9.266 2.937 13.237-.027.609-.454 1.679-1.524 2.133-2.133 2.974-3.985 2.974-9.289 0-13.274-.454-.608-1.523-1.677-2.13-2.128-1.595-1.186-3.275-1.875-5.217-2.139C13 1.038 11.574.99 11.28 1.023m2.04 2.078c2.563.387 4.804 1.83 6.24 4.019.303.463.743 1.359.932 1.9.346.993.485 1.845.485 2.98 0 1.493-.257 2.621-.897 3.94-.705 1.454-1.769 2.667-3.153 3.592-.789.528-2.051 1.056-3.019 1.265a9.053 9.053 0 0 1-7.538-1.778c-1.513-1.212-2.648-2.99-3.103-4.859-.186-.763-.244-1.272-.244-2.16 0-1.493.257-2.621.897-3.94a8.983 8.983 0 0 1 5.24-4.594c.705-.233 1.272-.348 2.18-.442.322-.033 1.571.015 1.98.077m-1.625 3.956a1.04 1.04 0 0 0-.567.459l-.108.184v4.606l.121.197c.068.11.205.253.311.325.471.316 1.102.171 1.407-.325l.121-.197V7.7l-.108-.184a1.005 1.005 0 0 0-1.177-.459m0 7.998a1.05 1.05 0 0 0-.567.461c-.091.156-.108.23-.108.484 0 .257.016.327.113.492.518.882 1.865.526 1.865-.492a.994.994 0 0 0-.535-.888 1.17 1.17 0 0 0-.768-.057"
        />
      </svg>
    );
  }
);
AlertCircleIcon.displayName = "AlertCircleIcon";

export const AlertIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.487 12 9.153 2.667a1.333 1.333 0 0 0-2.32 0L1.5 12a1.333 1.333 0 0 0 1.167 2h10.666a1.333 1.333 0 0 0 1.154-2ZM8 6v2.667M8 11.333h.007"
        />
      </svg>
    );
  }
);
AlertIcon.displayName = "AlertIcon";

export const AlignBaselineIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M1.5 8h13M6.7 8.06v5.14a1.3 1.3 0 0 1-1.3 1.3H4.1a1.3 1.3 0 0 1-1.3-1.3V8.205M6.7 5.4V2.8a1.3 1.3 0 0 0-1.3-1.3H4.1a1.3 1.3 0 0 0-1.3 1.3v2.6M13.2 8.108v3.142a1.3 1.3 0 0 1-1.3 1.3h-1.3a1.3 1.3 0 0 1-1.3-1.3V8.108M13.2 5.4V2.8a1.3 1.3 0 0 0-1.3-1.3h-1.3a1.3 1.3 0 0 0-1.3 1.3v2.6"
        />
        <path
          fill="currentColor"
          d="M2.737 14.024V8.231h3.89v5.793h-3.89ZM9.44 12.085V8h3.89v4.085H9.44Z"
        />
      </svg>
    );
  }
);
AlignBaselineIcon.displayName = "AlignBaselineIcon";

export const AlignCenterHorizontalIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M1.5 8h13M6.7 10.6v2.6a1.3 1.3 0 0 1-1.3 1.3H4.1a1.3 1.3 0 0 1-1.3-1.3v-2.6M6.7 5.4V2.8a1.3 1.3 0 0 0-1.3-1.3H4.1a1.3 1.3 0 0 0-1.3 1.3v2.6M13.2 10.6v.65a1.3 1.3 0 0 1-1.3 1.3h-1.3a1.3 1.3 0 0 1-1.3-1.3v-.65M9.3 5.4v-.65c0-.715.585-1.3 1.3-1.3h1.3a1.3 1.3 0 0 1 1.3 1.3v.65"
        />
      </svg>
    );
  }
);
AlignCenterHorizontalIcon.displayName = "AlignCenterHorizontalIcon";

export const AlignContentCenterIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.368 9.34h.716c.542 0 .982-.403.982-.9v-.88c0-.497-.44-.9-.982-.9h-.716c-.542 0-.98.403-.98.9v.88c0 .497.438.9.98.9ZM7.69 9.34h.716c.542 0 .981-.403.981-.9v-.88c0-.497-.44-.9-.981-.9H7.69c-.542 0-.982.403-.982.9v.88c0 .497.44.9.982.9ZM3.011 9.34h.716c.542 0 .982-.403.982-.9v-.88c0-.497-.44-.9-.982-.9h-.716c-.542 0-.981.403-.981.9v.88c0 .497.44.9.981.9Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.548 15.49h-13M14.5.493h-13"
        />
      </svg>
    );
  }
);
AlignContentCenterIcon.displayName = "AlignContentCenterIcon";

export const AlignContentEndIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.368 12.982h.716c.542 0 .982-.403.982-.9v-.879c0-.497-.44-.9-.982-.9h-.716c-.542 0-.98.403-.98.9v.88c0 .496.438.9.98.9ZM7.69 12.982h.716c.542 0 .981-.403.981-.9v-.879c0-.497-.44-.9-.981-.9H7.69c-.542 0-.982.403-.982.9v.88c0 .496.44.9.982.9ZM3.011 12.982h.716c.542 0 .982-.403.982-.9v-.879c0-.497-.44-.9-.982-.9h-.716c-.542 0-.981.403-.981.9v.88c0 .496.44.9.981.9Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.548 15.49h-13M14.5.493h-13"
        />
      </svg>
    );
  }
);
AlignContentEndIcon.displayName = "AlignContentEndIcon";

export const AlignContentSpaceAroundIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.867 4.409h-.716c-.542 0-.981.403-.981.9v.879c0 .497.44.9.981.9h.716c.542 0 .982-.403.982-.9v-.88c0-.496-.44-.9-.982-.9ZM3.867 8.912h-.716c-.542 0-.981.403-.981.9v.88c0 .496.44.9.981.9h.716c.542 0 .982-.404.982-.9v-.88c0-.497-.44-.9-.982-.9ZM8.367 4.409h-.716c-.542 0-.981.403-.981.9v.879c0 .497.44.9.981.9h.716c.542 0 .982-.403.982-.9v-.88c0-.496-.44-.9-.982-.9ZM12.867 4.409h-.716c-.542 0-.981.403-.981.9v.879c0 .497.44.9.981.9h.716c.542 0 .981-.403.981-.9v-.88c0-.496-.439-.9-.98-.9Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M1.452.51h13M1.5 15.507h13"
        />
      </svg>
    );
  }
);
AlignContentSpaceAroundIcon.displayName = "AlignContentSpaceAroundIcon";

export const AlignContentSpaceBetweenIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.867 3.055h-.716c-.542 0-.981.403-.981.9v.879c0 .497.44.9.981.9h.716c.542 0 .982-.403.982-.9v-.879c0-.497-.44-.9-.982-.9ZM3.867 10.357h-.716c-.542 0-.981.403-.981.9v.88c0 .496.44.9.981.9h.716c.542 0 .982-.404.982-.9v-.88c0-.497-.44-.9-.982-.9ZM8.367 3.055h-.716c-.542 0-.981.403-.981.9v.879c0 .497.44.9.981.9h.716c.542 0 .982-.403.982-.9v-.879c0-.497-.44-.9-.982-.9ZM12.867 3.055h-.716c-.542 0-.981.403-.981.9v.879c0 .497.44.9.981.9h.716c.542 0 .981-.403.981-.9v-.879c0-.497-.439-.9-.98-.9Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M1.5 1h13M1.5 15h13"
        />
      </svg>
    );
  }
);
AlignContentSpaceBetweenIcon.displayName = "AlignContentSpaceBetweenIcon";

export const AlignContentStartIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.632 3.018h-.716c-.542 0-.982.403-.982.9v.879c0 .497.44.9.982.9h.716c.542 0 .98-.403.98-.9v-.88c0-.496-.438-.9-.98-.9ZM8.31 3.018h-.716c-.542 0-.981.403-.981.9v.879c0 .497.44.9.981.9h.716c.542 0 .982-.403.982-.9v-.88c0-.496-.44-.9-.982-.9ZM12.989 3.018h-.716c-.542 0-.982.403-.982.9v.879c0 .497.44.9.982.9h.716c.542 0 .981-.403.981-.9v-.88c0-.496-.44-.9-.981-.9Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M1.452.51h13M1.5 15.507h13"
        />
      </svg>
    );
  }
);
AlignContentStartIcon.displayName = "AlignContentStartIcon";

export const AlignContentStretchIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.867 3.987h-.716c-.542 0-.981.403-.981.9v6.365c0 .496.44.9.981.9h.716c.542 0 .982-.403.982-.9V4.886c0-.497-.44-.9-.982-.9ZM8.367 3.987h-.716c-.542 0-.981.403-.981.9v6.365c0 .496.44.9.981.9h.716c.542 0 .982-.403.982-.9V4.886c0-.497-.44-.9-.982-.9ZM12.867 3.987h-.716c-.542 0-.981.403-.981.9v6.365c0 .496.44.9.981.9h.716c.542 0 .981-.403.981-.9V4.886c0-.497-.439-.9-.98-.9Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M1.5.52h13M1.5 15.475h13"
        />
      </svg>
    );
  }
);
AlignContentStretchIcon.displayName = "AlignContentStretchIcon";

export const AlignEndHorizontalIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.4 1.5H4.1a1.3 1.3 0 0 0-1.3 1.3v7.8a1.3 1.3 0 0 0 1.3 1.3h1.3a1.3 1.3 0 0 0 1.3-1.3V2.8a1.3 1.3 0 0 0-1.3-1.3ZM11.9 6.05h-1.3a1.3 1.3 0 0 0-1.3 1.3v3.25a1.3 1.3 0 0 0 1.3 1.3h1.3a1.3 1.3 0 0 0 1.3-1.3V7.35a1.3 1.3 0 0 0-1.3-1.3ZM14.5 14.5h-13"
        />
      </svg>
    );
  }
);
AlignEndHorizontalIcon.displayName = "AlignEndHorizontalIcon";

export const AlignHorizontalJustifyCenterIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.167 3.45H2.834c-.736 0-1.333.576-1.333 1.286v6.429c0 .71.597 1.285 1.333 1.285h1.333c.737 0 1.334-.575 1.334-1.285V4.736c0-.71-.597-1.286-1.334-1.286ZM13.166 4.75h-1.334c-.736 0-1.333.582-1.333 1.3v3.9c0 .718.597 1.3 1.333 1.3h1.334c.736 0 1.333-.582 1.333-1.3v-3.9c0-.718-.597-1.3-1.333-1.3ZM8 1.5v13"
        />
      </svg>
    );
  }
);
AlignHorizontalJustifyCenterIcon.displayName =
  "AlignHorizontalJustifyCenterIcon";

export const AlignHorizontalJustifyEndIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.1 3.45H2.8a1.3 1.3 0 0 0-1.3 1.3v6.5a1.3 1.3 0 0 0 1.3 1.3h1.3a1.3 1.3 0 0 0 1.3-1.3v-6.5a1.3 1.3 0 0 0-1.3-1.3ZM10.6 4.75H9.3A1.3 1.3 0 0 0 8 6.05v3.9a1.3 1.3 0 0 0 1.3 1.3h1.3a1.3 1.3 0 0 0 1.3-1.3v-3.9a1.3 1.3 0 0 0-1.3-1.3ZM14.5 1.5v13"
        />
      </svg>
    );
  }
);
AlignHorizontalJustifyEndIcon.displayName = "AlignHorizontalJustifyEndIcon";

export const AlignHorizontalJustifyStartIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.667 3.5H5.333C4.597 3.5 4 4.076 4 4.786v6.428c0 .71.597 1.286 1.333 1.286h1.334C7.403 12.5 8 11.924 8 11.214V4.786C8 4.076 7.403 3.5 6.667 3.5ZM13.333 4.833H12c-.736 0-1.333.627-1.333 1.4v4.2c0 .774.597 1.4 1.333 1.4h1.333c.737 0 1.334-.627 1.334-1.4v-4.2c0-.773-.597-1.4-1.334-1.4ZM1.333 1.5v13"
        />
      </svg>
    );
  }
);
AlignHorizontalJustifyStartIcon.displayName = "AlignHorizontalJustifyStartIcon";

export const AlignHorizontalSpaceAroundIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.667 4.667H7.333C6.597 4.667 6 5.264 6 6v4c0 .736.597 1.333 1.333 1.333h1.334C9.403 11.333 10 10.736 10 10V6c0-.736-.597-1.333-1.333-1.333ZM2.667 14.667V1.333M13.333 14.667V1.333"
        />
      </svg>
    );
  }
);
AlignHorizontalSpaceAroundIcon.displayName = "AlignHorizontalSpaceAroundIcon";

export const AlignHorizontalSpaceBetweenIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.667 3.333H3.333C2.597 3.333 2 3.93 2 4.667v6.666c0 .737.597 1.334 1.333 1.334h1.334c.736 0 1.333-.597 1.333-1.334V4.667c0-.737-.597-1.334-1.333-1.334ZM12.667 4.667h-1.334C10.597 4.667 10 5.264 10 6v4c0 .736.597 1.333 1.333 1.333h1.334c.736 0 1.333-.597 1.333-1.333V6c0-.736-.597-1.333-1.333-1.333ZM2 1.333v13.334M14 1.333v13.334"
        />
      </svg>
    );
  }
);
AlignHorizontalSpaceBetweenIcon.displayName = "AlignHorizontalSpaceBetweenIcon";

export const AlignSelfBaselineIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.048 8.269v3.634c0 .719.583 1.301 1.301 1.301H8.65c.719 0 1.302-.582 1.302-1.3V8.268m0-2.22V4.096c0-.719-.583-1.301-1.302-1.301h-1.3c-.72 0-1.302.582-1.302 1.3v1.952M1.503 8h13"
        />
        <path fill="currentColor" d="M6.04 12.755V8.48h3.776v4.275H6.039Z" />
      </svg>
    );
  }
);
AlignSelfBaselineIcon.displayName = "AlignSelfBaselineIcon";

export const AlignSelfCenterIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.048 6.048V4.097c0-.719.583-1.301 1.301-1.301H8.65c.719 0 1.302.582 1.302 1.3v1.952m0 3.904v1.951c0 .719-.583 1.301-1.302 1.301h-1.3a1.301 1.301 0 0 1-1.302-1.3V9.951M1.503 8h13"
        />
      </svg>
    );
  }
);
AlignSelfCenterIcon.displayName = "AlignSelfCenterIcon";

export const AlignSelfEndIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="#000"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.35 11.903h1.3c.719 0 1.302-.582 1.302-1.3V2.795c0-.719-.583-1.301-1.302-1.301h-1.3c-.72 0-1.302.582-1.302 1.3v7.807c0 .719.583 1.301 1.301 1.301ZM1.503 14.505h13"
        />
      </svg>
    );
  }
);
AlignSelfEndIcon.displayName = "AlignSelfEndIcon";

export const AlignSelfStartIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.65 4.097h-1.3c-.719 0-1.302.582-1.302 1.3v7.807c0 .719.583 1.301 1.302 1.301h1.3c.72 0 1.302-.582 1.302-1.3V5.397c0-.719-.583-1.301-1.301-1.301ZM14.497 1.495h-13"
        />
      </svg>
    );
  }
);
AlignSelfStartIcon.displayName = "AlignSelfStartIcon";

export const AlignSelfStretchIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.651 3.447h-1.3a1.3 1.3 0 0 0-1.3 1.3v6.5a1.3 1.3 0 0 0 1.3 1.299h1.3a1.3 1.3 0 0 0 1.3-1.3v-6.5a1.3 1.3 0 0 0-1.3-1.3ZM14.499 1.491h-13M14.501 14.509h-13"
        />
      </svg>
    );
  }
);
AlignSelfStretchIcon.displayName = "AlignSelfStretchIcon";

export const AlignStartHorizontalIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.4 4.097H4.1c-.72 0-1.302.582-1.302 1.3v7.807c0 .719.583 1.301 1.301 1.301H5.4c.719 0 1.301-.582 1.301-1.3V5.397c0-.719-.582-1.301-1.3-1.301ZM11.906 4.097h-1.301c-.719 0-1.301.582-1.301 1.3v3.254c0 .718.582 1.3 1.3 1.3h1.302c.718 0 1.3-.582 1.3-1.3V5.398c0-.719-.582-1.301-1.3-1.301ZM1.5 2h13"
        />
      </svg>
    );
  }
);
AlignStartHorizontalIcon.displayName = "AlignStartHorizontalIcon";

export const ArrowDownIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 3.333v9.334M12.667 8 8 12.667 3.333 8"
        />
      </svg>
    );
  }
);
ArrowDownIcon.displayName = "ArrowDownIcon";

export const ArrowLeftIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 8H3.333M8 3.333 3.333 8 8 12.667"
        />
      </svg>
    );
  }
);
ArrowLeftIcon.displayName = "ArrowLeftIcon";

export const ArrowRightIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.333 8h9.334M8 3.333 12.667 8 8 12.667"
        />
      </svg>
    );
  }
);
ArrowRightIcon.displayName = "ArrowRightIcon";

export const ArrowUpIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12.667V3.333M3.333 8 8 3.333 12.667 8"
        />
      </svg>
    );
  }
);
ArrowUpIcon.displayName = "ArrowUpIcon";

export const AspectRatioIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 4v7.667h7.667"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m3 5 2-2 2 2M11.667 9.667l2 2-2 2"
        />
      </svg>
    );
  }
);
AspectRatioIcon.displayName = "AspectRatioIcon";

export const AsteriskIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 3.96v8.08M11.498 5.98l-6.996 4.04M4.502 5.98l6.996 4.04"
        />
      </svg>
    );
  }
);
AsteriskIcon.displayName = "AsteriskIcon";

export const AttachmentIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.823 13.501 14 8.2M10.667 4l-5.61 5.724a1.333 1.333 0 0 0 1.886 1.885l5.61-5.724a2.667 2.667 0 0 0-3.772-3.77l-5.61 5.723a4 4 0 0 0 2.83 6.829 3.922 3.922 0 0 0 2.804-1.147"
        />
      </svg>
    );
  }
);
AttachmentIcon.displayName = "AttachmentIcon";

export const AutoScrollIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m5.502 10.5 2.5-5 2.5 5M6.126 9.25h3.75M2 14V2M14.003 14V2"
        />
      </svg>
    );
  }
);
AutoScrollIcon.displayName = "AutoScrollIcon";

export const BlockquoteIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          d="M6.667 8H3.333a.667.667 0 0 1-.666-.667V5a.667.667 0 0 1 .666-.667H6A.667.667 0 0 1 6.667 5v3Zm0 0C6.667 9.667 6 10.667 4 11.667M13.333 8H10a.667.667 0 0 1-.667-.667V5A.667.667 0 0 1 10 4.333h2.667a.667.667 0 0 1 .666.667v3Zm0 0c0 1.667-.666 2.667-2.666 3.667"
        />
      </svg>
    );
  }
);
BlockquoteIcon.displayName = "BlockquoteIcon";

export const BodyIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 2H3.333C2.597 2 2 2.597 2 3.333v9.334C2 13.403 2.597 14 3.333 14h9.334c.736 0 1.333-.597 1.333-1.333V3.333C14 2.597 13.403 2 12.667 2ZM2 6h12"
        />
      </svg>
    );
  }
);
BodyIcon.displayName = "BodyIcon";

export const BoldIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 8h6a2.667 2.667 0 0 1 0 5.333H4.667A.667.667 0 0 1 4 12.667V3.333a.667.667 0 0 1 .667-.666h4.666a2.667 2.667 0 1 1 0 5.333"
        />
      </svg>
    );
  }
);
BoldIcon.displayName = "BoldIcon";

export const BorderRadiusBottomLeftIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3v6.364A3.636 3.636 0 0 0 6.636 13H13"
        />
      </svg>
    );
  }
);
BorderRadiusBottomLeftIcon.displayName = "BorderRadiusBottomLeftIcon";

export const BorderRadiusBottomRightIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 3v6.364A3.636 3.636 0 0 1 9.364 13H3"
        />
      </svg>
    );
  }
);
BorderRadiusBottomRightIcon.displayName = "BorderRadiusBottomRightIcon";

export const BorderRadiusIndividualIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2 4.667V3.333A1.333 1.333 0 0 1 3.333 2h1.334M11.333 2h1.334A1.333 1.333 0 0 1 14 3.333v1.334M14 11.333v1.334A1.333 1.333 0 0 1 12.667 14h-1.334M4.667 14H3.333A1.334 1.334 0 0 1 2 12.667v-1.334"
        />
      </svg>
    );
  }
);
BorderRadiusIndividualIcon.displayName = "BorderRadiusIndividualIcon";

export const BorderRadiusTopLeftIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13 3H6.636A3.636 3.636 0 0 0 3 6.636V13"
        />
      </svg>
    );
  }
);
BorderRadiusTopLeftIcon.displayName = "BorderRadiusTopLeftIcon";

export const BorderRadiusTopRightIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 3h6.364A3.636 3.636 0 0 1 13 6.636V13"
        />
      </svg>
    );
  }
);
BorderRadiusTopRightIcon.displayName = "BorderRadiusTopRightIcon";

export const BorderRadiusIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="#11181C"
          fillRule="evenodd"
          d="M1.917 10.666a8.75 8.75 0 0 1 8.75-8.75h2.666a.75.75 0 0 1 0 1.5h-2.667a7.25 7.25 0 0 0-7.25 7.25v2.667a.75.75 0 0 1-1.5 0v-2.667Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
BorderRadiusIcon.displayName = "BorderRadiusIcon";

export const BorderWidthBottomIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 14H2m0-3.667v-7C2 2.597 2.597 2 3.333 2h9.334C13.403 2 14 2.597 14 3.333v7"
        />
      </svg>
    );
  }
);
BorderWidthBottomIcon.displayName = "BorderWidthBottomIcon";

export const BorderWidthIndividualIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="#000"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.4 1.744h5.2M14.5 10.356v-5.2M1.5 10.356v-5.2M5.4 14.256h5.2"
        />
      </svg>
    );
  }
);
BorderWidthIndividualIcon.displayName = "BorderWidthIndividualIcon";

export const BorderWidthLeftIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2 14V2m3.667 0h7C13.403 2 14 2.597 14 3.333v9.334c0 .736-.597 1.333-1.333 1.333h-7"
        />
      </svg>
    );
  }
);
BorderWidthLeftIcon.displayName = "BorderWidthLeftIcon";

export const BorderWidthRightIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 2v12m-3.667 0h-7A1.333 1.333 0 0 1 2 12.667V3.333C2 2.597 2.597 2 3.333 2h7"
        />
      </svg>
    );
  }
);
BorderWidthRightIcon.displayName = "BorderWidthRightIcon";

export const BorderWidthTopIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2 2h12m0 3.667v7c0 .736-.597 1.333-1.333 1.333H3.333A1.333 1.333 0 0 1 2 12.667v-7"
        />
      </svg>
    );
  }
);
BorderWidthTopIcon.displayName = "BorderWidthTopIcon";

export const BoxIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 2H3.333C2.597 2 2 2.597 2 3.333v9.334C2 13.403 2.597 14 3.333 14h9.334c.736 0 1.333-.597 1.333-1.333V3.333C14 2.597 13.403 2 12.667 2Z"
        />
      </svg>
    );
  }
);
BoxIcon.displayName = "BoxIcon";

export const BracesIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.333 2h-.666a1.333 1.333 0 0 0-1.334 1.333v3.334A1.333 1.333 0 0 1 2 8a1.333 1.333 0 0 1 1.333 1.333v3.334c0 .733.6 1.333 1.334 1.333h.666M10.667 14h.666a1.333 1.333 0 0 0 1.334-1.333V9.333C12.667 8.6 13.267 8 14 8a1.333 1.333 0 0 1-1.333-1.333V3.333A1.333 1.333 0 0 0 11.333 2h-.666"
        />
      </svg>
    );
  }
);
BracesIcon.displayName = "BracesIcon";

export const BugIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m5.333 1.333 1.254 1.254M9.413 2.587l1.254-1.254M6 4.753v-.666a2.002 2.002 0 1 1 4 0v.666"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 13.333c-2.2 0-4-1.8-4-4v-2a2.667 2.667 0 0 1 2.667-2.666h2.666A2.667 2.667 0 0 1 12 7.333v2c0 2.2-1.8 4-4 4ZM8 13.333v-6"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.353 6C3.067 5.867 2 4.733 2 3.333M4 8.667H1.333M2 14c0-1.4 1.133-2.6 2.533-2.667M13.98 3.333c0 1.4-1.067 2.534-2.333 2.667M14.667 8.667H12M11.467 11.333C12.867 11.4 14 12.6 14 14"
        />
      </svg>
    );
  }
);
BugIcon.displayName = "BugIcon";

export const ButtonElementIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M1.833 8a3.5 3.5 0 0 1 3.5-3.5h5.334a3.5 3.5 0 1 1 0 7H5.333a3.5 3.5 0 0 1-3.5-3.5Zm3.5-4.5a4.5 4.5 0 0 0 0 9h5.334a4.5 4.5 0 1 0 0-9H5.333ZM5.72 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM8 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm4.28-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
ButtonElementIcon.displayName = "ButtonElementIcon";

export const CalendarIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.333 9.333H8V12M10.667 1.333V4M2 6.667h12M5.333 1.333V4"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 2.667H3.333C2.597 2.667 2 3.264 2 4v9.333c0 .737.597 1.334 1.333 1.334h9.334c.736 0 1.333-.597 1.333-1.334V4c0-.736-.597-1.333-1.333-1.333Z"
        />
      </svg>
    );
  }
);
CalendarIcon.displayName = "CalendarIcon";

export const CheckCircleIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <rect width="12" height="12" x="2" y="2" stroke="currentColor" rx="6" />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.998 7.928 7.381 9.31 10 6.69"
        />
      </svg>
    );
  }
);
CheckCircleIcon.displayName = "CheckCircleIcon";

export const CheckMarkSmallIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.998 7.928 7.381 9.31 10 6.69"
        />
      </svg>
    );
  }
);
CheckMarkSmallIcon.displayName = "CheckMarkSmallIcon";

export const CheckMarkIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.091"
          d="m13.636 3.667-8 8L2 8.03"
        />
      </svg>
    );
  }
);
CheckMarkIcon.displayName = "CheckMarkIcon";

export const CheckboxCheckedIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 2H3.333C2.597 2 2 2.597 2 3.333v9.334C2 13.403 2.597 14 3.333 14h9.334c.736 0 1.333-.597 1.333-1.333V3.333C14 2.597 13.403 2 12.667 2Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m6 8.238 1.383 1.383L10.003 7"
        />
      </svg>
    );
  }
);
CheckboxCheckedIcon.displayName = "CheckboxCheckedIcon";

export const ChevronDownIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m4 6 4 4 4-4"
        />
      </svg>
    );
  }
);
ChevronDownIcon.displayName = "ChevronDownIcon";

export const ChevronLeftIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.3"
          d="m9.256 4.499-3.512 3.5 3.512 3.502"
        />
      </svg>
    );
  }
);
ChevronLeftIcon.displayName = "ChevronLeftIcon";

export const ChevronRightIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m6 12 4-4-4-4"
        />
      </svg>
    );
  }
);
ChevronRightIcon.displayName = "ChevronRightIcon";

export const ChevronUpIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.3"
          d="m11.501 9.256-3.5-3.512-3.502 3.512"
        />
      </svg>
    );
  }
);
ChevronUpIcon.displayName = "ChevronUpIcon";

export const ChevronsLeftIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="#000"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.069 12.656 2.413 8l4.656-4.656M13.587 12.656 8.931 8l4.656-4.656"
        />
      </svg>
    );
  }
);
ChevronsLeftIcon.displayName = "ChevronsLeftIcon";

export const CloudIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.667 12.667H6a4.667 4.667 0 1 1 4.473-6h1.194a3 3 0 1 1 0 6Z"
        />
      </svg>
    );
  }
);
CloudIcon.displayName = "CloudIcon";

export const CollapsibleIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 14.667v-4M8 5.333v-4M2.5 8h-1M6.5 8h-1M10.5 8h-1M14.5 8h-1M10 12.667l-2-2-2 2M10 3.333l-2 2-2-2"
        />
      </svg>
    );
  }
);
CollapsibleIcon.displayName = "CollapsibleIcon";

export const CommitIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM2 8h4M10 8h4"
        />
      </svg>
    );
  }
);
CommitIcon.displayName = "CommitIcon";

export const ContentBlockIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 2H3.333A1.333 1.333 0 0 0 2 3.333v9.334A1.333 1.333 0 0 0 3.333 14h9.334A1.334 1.334 0 0 0 14 12.667V8"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.25 1.75a1.414 1.414 0 1 1 2 2L8.24 9.76a1.333 1.333 0 0 1-.568.336l-1.916.56a.334.334 0 0 1-.413-.413l.56-1.916c.063-.214.179-.41.337-.568L12.25 1.75Z"
        />
      </svg>
    );
  }
);
ContentBlockIcon.displayName = "ContentBlockIcon";

export const ContentEmbedIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.667 5.333h4M4.667 8H10M14 8.75V3.5A1.5 1.5 0 0 0 12.5 2h-9A1.5 1.5 0 0 0 2 3.5v9.252c0 .69.56 1.25 1.25 1.25v0H6M13.686 14.265l1.4-1.4-1.4-1.4"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m9.486 11.465-1.4 1.4 1.4 1.4M12.306 10.612l-1.441 4.321"
        />
      </svg>
    );
  }
);
ContentEmbedIcon.displayName = "ContentEmbedIcon";

export const ContentIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.667 5.333h4M4.666 8H10m-5.333 2.667h4M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9.188c0 .724-.588 1.312-1.313 1.312H3.313A1.312 1.312 0 0 1 2 12.687V3.5Z"
        />
      </svg>
    );
  }
);
ContentIcon.displayName = "ContentIcon";

export const CopyIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.214 5.5H6.786c-.71 0-1.286.576-1.286 1.286v6.428c0 .71.576 1.286 1.286 1.286h6.428c.71 0 1.286-.576 1.286-1.286V6.786c0-.71-.576-1.286-1.286-1.286Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.786 10.5A1.29 1.29 0 0 1 1.5 9.214V2.786A1.29 1.29 0 0 1 2.786 1.5h6.428A1.29 1.29 0 0 1 10.5 2.786"
        />
      </svg>
    );
  }
);
CopyIcon.displayName = "CopyIcon";

export const DashedBorderIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.714 8H2M8.857 8H7.143M14 8h-1.714"
        />
      </svg>
    );
  }
);
DashedBorderIcon.displayName = "DashedBorderIcon";

export const DescriptionIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.333 3.135a.47.47 0 0 0-.802-.332L4.275 5.058a.933.933 0 0 1-.664.275H2A.667.667 0 0 0 1.333 6v4a.667.667 0 0 0 .667.667h1.61a.934.934 0 0 1 .665.275l2.256 2.256a.47.47 0 0 0 .802-.333v-9.73ZM10.667 6a3.333 3.333 0 0 1 0 4M12.91 12.243a6 6 0 0 0 0-8.486"
        />
      </svg>
    );
  }
);
DescriptionIcon.displayName = "DescriptionIcon";

export const DialogIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="#D2D2D2"
          d="M13.444 1H2.556C1.696 1 1 1.696 1 2.556v10.888C1 14.304 1.696 15 2.556 15h10.888c.86 0 1.556-.696 1.556-1.556V2.556C15 1.696 14.304 1 13.444 1Z"
        />
        <path
          fill="#fff"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.334 5.667H4.667v4.666h6.667V5.667Z"
        />
      </svg>
    );
  }
);
DialogIcon.displayName = "DialogIcon";

export const DimensionsIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.833 6.833v-4h4"
        />
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M3.687 2.98a.5.5 0 0 0-.707.707l8.48 8.48H8.666a.5.5 0 1 0 0 1h4a.5.5 0 0 0 .5-.5v-4a.5.5 0 1 0-1 0v2.793l-8.48-8.48Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
DimensionsIcon.displayName = "DimensionsIcon";

export const DiscordIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          d="M4.565 7.429c0 .151.066.296.183.404A.655.655 0 0 0 5.189 8c.166 0 .325-.06.442-.167a.548.548 0 0 0 .183-.404.548.548 0 0 0-.183-.404.655.655 0 0 0-.442-.168.655.655 0 0 0-.441.168.548.548 0 0 0-.183.404Zm5.621 0c0 .151.066.296.183.404a.655.655 0 0 0 .442.167c.165 0 .324-.06.441-.167a.548.548 0 0 0 .183-.404.548.548 0 0 0-.183-.404.655.655 0 0 0-.441-.168.655.655 0 0 0-.442.168.548.548 0 0 0-.183.404Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M.5 11.273c0-2.744 1.072-6.37 2.142-7.841 0 0 1.072-.49 5.358-.49 4.285 0 5.356.491 5.356.491 1.072 1.47 2.144 5.096 2.144 7.84-.357.492-1.608 1.57-3.75 1.961L9.864 11.08a8.973 8.973 0 0 1-3.729 0L4.25 13.234c-2.142-.392-3.393-1.47-3.75-1.96Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.25 10.294c.326.298 1.012.597 1.885.785a8.976 8.976 0 0 0 3.73 0c.873-.188 1.558-.487 1.885-.785"
        />
      </svg>
    );
  }
);
DiscordIcon.displayName = "DiscordIcon";

export const DotIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
        />
      </svg>
    );
  }
);
DotIcon.displayName = "DotIcon";

export const DottedBorderIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.464 8a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0ZM9.202 8a.667.667 0 1 0 1.334 0 .667.667 0 0 0-1.334 0ZM12.94 8a.667.667 0 1 0 1.334 0 .667.667 0 0 0-1.333 0ZM1.726 8a.667.667 0 1 0 1.333 0 .667.667 0 0 0-1.333 0Z"
        />
      </svg>
    );
  }
);
DottedBorderIcon.displayName = "DottedBorderIcon";

export const DragHandleIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 8.667a.667.667 0 1 0 0-1.334.667.667 0 0 0 0 1.334ZM6 4a.667.667 0 1 0 0-1.333A.667.667 0 0 0 6 4ZM6 13.333A.667.667 0 1 0 6 12a.667.667 0 0 0 0 1.333ZM10 8.667a.667.667 0 1 0 0-1.334.667.667 0 0 0 0 1.334ZM10 4a.667.667 0 1 0 0-1.333A.667.667 0 0 0 10 4ZM10 13.333A.667.667 0 1 0 10 12a.667.667 0 0 0 0 1.333Z"
        />
      </svg>
    );
  }
);
DragHandleIcon.displayName = "DragHandleIcon";

export const DynamicPageIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12.203H3.855a1.474 1.474 0 0 1-1.473-1.473V2.81a1.474 1.474 0 0 1 1.473-1.474h6.079l3.684 3.683v5.71a1.474 1.474 0 0 1-1.474 1.474H8Zm0 0 .01 2.462m0 0H2.39m5.618 0h5.618"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.198 1.888V3.73a1.474 1.474 0 0 0 1.473 1.474h2.947"
        />
      </svg>
    );
  }
);
DynamicPageIcon.displayName = "DynamicPageIcon";

export const EllipsesIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.112 8a.888.888 0 1 0 1.777 0 .888.888 0 0 0-1.777 0ZM12.724 8a.888.888 0 1 0 1.777 0 .888.888 0 0 0-1.777 0ZM1.499 8a.888.888 0 1 0 1.777 0 .888.888 0 0 0-1.777 0Z"
        />
      </svg>
    );
  }
);
EllipsesIcon.displayName = "EllipsesIcon";

export const EmailIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.333 2.667H2.667c-.737 0-1.334.597-1.334 1.333v8c0 .736.597 1.333 1.334 1.333h10.666c.737 0 1.334-.597 1.334-1.333V4c0-.736-.597-1.333-1.334-1.333Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m14.667 4.667-5.98 3.8a1.293 1.293 0 0 1-1.374 0l-5.98-3.8"
        />
      </svg>
    );
  }
);
EmailIcon.displayName = "EmailIcon";

export const EmbedIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 10.667 14.667 8 12 5.333M4 5.333 1.333 8 4 10.667M9.667 2.667 6.333 13.333"
        />
      </svg>
    );
  }
);
EmbedIcon.displayName = "EmbedIcon";

export const ExtensionIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 8.5h6m-6 0h-6m6 0V14M13.5 8.5v4.667c0 .736-.597 1.333-1.333 1.333H2.833A1.333 1.333 0 0 1 1.5 13.167V3.833c0-.736.597-1.333 1.333-1.333H7.5v6"
        />
        <path
          stroke="currentColor"
          strokeLinejoin="round"
          d="M9.5.5v6h6V2.207A1.707 1.707 0 0 0 13.793.5H9.5Z"
        />
      </svg>
    );
  }
);
ExtensionIcon.displayName = "ExtensionIcon";

export const ExternalLinkIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 2h4v4M6.667 9.333 14 2M12 8.667v4A1.334 1.334 0 0 1 10.667 14H3.333A1.334 1.334 0 0 1 2 12.667V5.333A1.333 1.333 0 0 1 3.333 4h4"
        />
      </svg>
    );
  }
);
ExternalLinkIcon.displayName = "ExternalLinkIcon";

export const EyeClosedIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m10 12-.481-2.167M1.333 5.333a7.097 7.097 0 0 0 13.334 0M13.333 10l-1.15-1.367M2.667 10l1.15-1.367M6 12l.481-2.167"
        />
      </svg>
    );
  }
);
EyeClosedIcon.displayName = "EyeClosedIcon";

export const EyeOpenIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M1.375 8.232a.667.667 0 0 1 0-.464 7.167 7.167 0 0 1 13.25 0 .666.666 0 0 1 0 .464 7.166 7.166 0 0 1-13.25 0Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        />
      </svg>
    );
  }
);
EyeOpenIcon.displayName = "EyeOpenIcon";

export const EyedropperIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m1.502 14.498.65-.65h1.947L9.94 8.008"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.151 13.849V11.9L7.993 6.06M9.94 4.113l2.207-2.207a1.377 1.377 0 0 1 1.947 1.947L11.887 6.06l.26.26A1.376 1.376 0 1 1 10.2 8.266L7.733 5.8a1.377 1.377 0 1 1 1.948-1.947l.26.26Z"
        />
      </svg>
    );
  }
);
EyedropperIcon.displayName = "EyedropperIcon";

export const FolderIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.333 13.333A1.333 1.333 0 0 0 14.667 12V5.333A1.334 1.334 0 0 0 13.333 4H8.067a1.333 1.333 0 0 1-1.127-.6l-.54-.8A1.333 1.333 0 0 0 5.287 2h-2.62a1.333 1.333 0 0 0-1.334 1.333V12a1.333 1.333 0 0 0 1.334 1.333h10.666Z"
        />
      </svg>
    );
  }
);
FolderIcon.displayName = "FolderIcon";

export const FooterIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 2H3.333C2.597 2 2 2.597 2 3.333v9.334C2 13.403 2.597 14 3.333 14h9.334c.736 0 1.333-.597 1.333-1.333V3.333C14 2.597 13.403 2 12.667 2ZM4 12h8"
        />
      </svg>
    );
  }
);
FooterIcon.displayName = "FooterIcon";

export const FormTextAreaIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.333 14h9.334c.736 0 1.333-.597 1.333-1.333V3.522C14 2.682 13.318 2 12.478 2h-9C2.662 2 2 2.662 2 3.478v9.189C2 13.403 2.597 14 3.333 14ZM3.83 6.636V3.943"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m10.496 13.76 1.724-1.725 1.717-1.717"
        />
      </svg>
    );
  }
);
FormTextAreaIcon.displayName = "FormTextAreaIcon";

export const FormTextFieldIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.333 2.667H4a2 2 0 0 1 2 2 2 2 0 0 1 2-2h.667M8.667 13.333H8a2 2 0 0 1-2-2 2 2 0 0 1-2 2h-.667M3.333 10.667h-.666a1.333 1.333 0 0 1-1.334-1.334V6.667a1.333 1.333 0 0 1 1.334-1.334h.666M8.667 5.333h4.666a1.333 1.333 0 0 1 1.334 1.334v2.666a1.333 1.333 0 0 1-1.334 1.334H8.667M6 4.667v6.666"
        />
      </svg>
    );
  }
);
FormTextFieldIcon.displayName = "FormTextFieldIcon";

export const FormIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.184 5.5h.731a.75.75 0 0 0 .75-.75v-1.5a.75.75 0 0 0-.75-.75H2.085a.75.75 0 0 0-.75.75v1.5c0 .414.336.75.75.75h11.099ZM13.184 10.5h.732a.75.75 0 0 0 .75-.75v-1.5a.75.75 0 0 0-.75-.75H2.084a.75.75 0 0 0-.75.75v1.5c0 .414.336.75.75.75h11.099Z"
        />
        <path
          fill="currentColor"
          d="M6.613 14.5h.222a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-5.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5H6.613Z"
        />
      </svg>
    );
  }
);
FormIcon.displayName = "FormIcon";

export const GapHorizontalIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 2h-2v12h2M3.333 14h2V2h-2"
        />
      </svg>
    );
  }
);
GapHorizontalIcon.displayName = "GapHorizontalIcon";

export const GapVerticalIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 12.667v-2H2v2M2 3.333v2h12v-2"
        />
      </svg>
    );
  }
);
GapVerticalIcon.displayName = "GapVerticalIcon";

export const GearIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.147 1.333h-.294A1.333 1.333 0 0 0 6.52 2.667v.12a1.333 1.333 0 0 1-.667 1.153l-.286.167a1.333 1.333 0 0 1-1.334 0l-.1-.054a1.333 1.333 0 0 0-1.82.487l-.146.253a1.333 1.333 0 0 0 .486 1.82l.1.067a1.333 1.333 0 0 1 .667 1.147v.34a1.333 1.333 0 0 1-.667 1.16l-.1.06a1.333 1.333 0 0 0-.486 1.82l.146.253a1.334 1.334 0 0 0 1.82.487l.1-.054a1.334 1.334 0 0 1 1.334 0l.286.167a1.333 1.333 0 0 1 .667 1.153v.12a1.333 1.333 0 0 0 1.333 1.334h.294a1.333 1.333 0 0 0 1.333-1.334v-.12a1.334 1.334 0 0 1 .667-1.153l.286-.167a1.334 1.334 0 0 1 1.334 0l.1.054a1.333 1.333 0 0 0 1.82-.487l.146-.26a1.334 1.334 0 0 0-.486-1.82l-.1-.053a1.333 1.333 0 0 1-.667-1.16v-.334a1.333 1.333 0 0 1 .667-1.16l.1-.06a1.334 1.334 0 0 0 .486-1.82l-.146-.253a1.333 1.333 0 0 0-1.82-.487l-.1.054a1.333 1.333 0 0 1-1.334 0l-.286-.167a1.333 1.333 0 0 1-.667-1.153v-.12a1.333 1.333 0 0 0-1.333-1.334Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        />
      </svg>
    );
  }
);
GearIcon.displayName = "GearIcon";

export const GithubIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 22 22"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fillRule="evenodd"
          d="M11 1C5.475 1 1 5.475 1 11a9.994 9.994 0 0 0 6.838 9.488c.5.087.687-.213.687-.476 0-.237-.013-1.024-.013-1.862-2.512.463-3.162-.612-3.362-1.175-.113-.288-.6-1.175-1.025-1.413-.35-.187-.85-.65-.013-.662.788-.013 1.35.725 1.538 1.025.9 1.512 2.337 1.087 2.912.825.088-.65.35-1.088.638-1.338-2.225-.25-4.55-1.112-4.55-4.937 0-1.088.387-1.987 1.025-2.688-.1-.25-.45-1.274.1-2.65 0 0 .837-.262 2.75 1.026a9.28 9.28 0 0 1 2.5-.338c.85 0 1.7.112 2.5.337 1.912-1.3 2.75-1.024 2.75-1.024.55 1.375.2 2.4.1 2.65.637.7 1.025 1.587 1.025 2.687 0 3.838-2.337 4.688-4.562 4.938.362.312.675.912.675 1.85 0 1.337-.013 2.412-.013 2.75 0 .262.188.574.688.474A10.016 10.016 0 0 0 21 11c0-5.525-4.475-10-10-10Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
GithubIcon.displayName = "GithubIcon";

export const GoogleIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          d="M14.72 8.16c0-.497-.045-.975-.127-1.433H8v2.711h3.767a3.228 3.228 0 0 1-1.406 2.107v1.762h2.272c1.323-1.222 2.087-3.016 2.087-5.148Z"
        />
        <path
          fill="currentColor"
          d="M8 15c1.89 0 3.475-.624 4.633-1.693l-2.272-1.762c-.624.42-1.42.674-2.361.674-1.82 0-3.366-1.228-3.92-2.883H1.75v1.808A6.993 6.993 0 0 0 8 15Z"
        />
        <path
          fill="currentColor"
          d="M4.08 9.33A4.195 4.195 0 0 1 3.857 8c0-.465.083-.91.223-1.33V4.863H1.75A6.914 6.914 0 0 0 1 8c0 1.133.274 2.195.75 3.137l1.815-1.412.515-.395Z"
        />
        <path
          fill="currentColor"
          d="M8 3.787c1.03 0 1.947.357 2.679 1.044l2.005-2.005C11.468 1.694 9.89 1 8 1a6.988 6.988 0 0 0-6.25 3.863L4.08 6.67C4.634 5.015 6.18 3.787 8 3.787Z"
        />
      </svg>
    );
  }
);
GoogleIcon.displayName = "GoogleIcon";

export const GrowIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 8h4M6 10 4 8l2-2M12 8H8M10 6l2 2-2 2M2 14V2M14.003 14V2"
        />
      </svg>
    );
  }
);
GrowIcon.displayName = "GrowIcon";

export const HeaderIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 2H3.333C2.597 2 2 2.597 2 3.333v9.334C2 13.403 2.597 14 3.333 14h9.334c.736 0 1.333-.597 1.333-1.333V3.333C14 2.597 13.403 2 12.667 2ZM4 4h8"
        />
      </svg>
    );
  }
);
HeaderIcon.displayName = "HeaderIcon";

export const HeadingIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 8h8M4 13.333V2.667M12 13.333V2.667"
        />
      </svg>
    );
  }
);
HeadingIcon.displayName = "HeadingIcon";

export const HelpIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.057 6c.161-.446.48-.821.898-1.06a2.11 2.11 0 0 1 1.391-.248c.48.08.914.322 1.227.684.313.361.484.831.484 1.29 0 1.334-2.059 2-2.059 2"
        />
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 11.333h0"
        />
      </svg>
    );
  }
);
HelpIcon.displayName = "HelpIcon";

export const HomeIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 14V8.667A.667.667 0 0 0 9.333 8H6.667A.667.667 0 0 0 6 8.667V14"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2 6.667a1.333 1.333 0 0 1 .473-1.019l4.666-4a1.333 1.333 0 0 1 1.722 0l4.666 4A1.332 1.332 0 0 1 14 6.667v6A1.334 1.334 0 0 1 12.667 14H3.333A1.334 1.334 0 0 1 2 12.667v-6Z"
        />
      </svg>
    );
  }
);
HomeIcon.displayName = "HomeIcon";

export const ImageIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 2H3.333C2.597 2 2 2.597 2 3.333v9.334C2 13.403 2.597 14 3.333 14h9.334c.736 0 1.333-.597 1.333-1.333V3.333C14 2.597 13.403 2 12.667 2Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 7.333a1.333 1.333 0 1 0 0-2.666 1.333 1.333 0 0 0 0 2.666ZM14 10l-2.057-2.057a1.333 1.333 0 0 0-1.886 0L4 14"
        />
      </svg>
    );
  }
);
ImageIcon.displayName = "ImageIcon";

export const InfoCircleIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 11.516V7.853"
        />
        <rect
          width="1.4"
          height="1.4"
          x="7.3"
          y="4.484"
          fill="currentColor"
          rx=".7"
        />
      </svg>
    );
  }
);
InfoCircleIcon.displayName = "InfoCircleIcon";

export const ItemIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2 6h.007M5.333 10H14M5.333 6H14"
        />
      </svg>
    );
  }
);
ItemIcon.displayName = "ItemIcon";

export const JCSpaceAroundIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fillRule="evenodd"
          d="M1.7 1.5c.442 0 .8.344.8.768v11.464c0 .424-.358.768-.8.768-.442 0-.8-.344-.8-.768V2.268c0-.424.358-.768.8-.768Z"
          clipRule="evenodd"
        />
        <path d="M4.5 4.8a.8.8 0 0 1 .8-.8h1.4a.8.8 0 0 1 .8.8v6.4a.8.8 0 0 1-.8.8H5.3a.8.8 0 0 1-.8-.8V4.8ZM8.5 4.8a.8.8 0 0 1 .8-.8h1.4a.8.8 0 0 1 .8.8v6.4a.8.8 0 0 1-.8.8H9.3a.8.8 0 0 1-.8-.8V4.8Z" />
        <path
          fillRule="evenodd"
          d="M14.3 1.5c.442 0 .8.344.8.768v11.464c0 .424-.358.768-.8.768-.442 0-.8-.344-.8-.768V2.268c0-.424.358-.768.8-.768Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
JCSpaceAroundIcon.displayName = "JCSpaceAroundIcon";

export const JCSpaceBetweenIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fillRule="evenodd"
          d="M2.2 1.5c.442 0 .8.344.8.768v11.464c0 .424-.358.768-.8.768-.442 0-.8-.344-.8-.768V2.268c0-.424.358-.768.8-.768Z"
          clipRule="evenodd"
        />
        <path d="M4 4.8a.8.8 0 0 1 .8-.8h1.4a.8.8 0 0 1 .8.8v6.4a.8.8 0 0 1-.8.8H4.8a.8.8 0 0 1-.8-.8V4.8ZM9 4.8a.8.8 0 0 1 .8-.8h1.4a.8.8 0 0 1 .8.8v6.4a.8.8 0 0 1-.8.8H9.8a.8.8 0 0 1-.8-.8V4.8Z" />
        <path
          fillRule="evenodd"
          d="M13.8 1.5c.442 0 .8.344.8.768v11.464c0 .424-.358.768-.8.768-.442 0-.8-.344-.8-.768V2.268c0-.424.358-.768.8-.768Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
JCSpaceBetweenIcon.displayName = "JCSpaceBetweenIcon";

export const LabelIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 2H3.333C2.597 2 2 2.597 2 3.333v9.334C2 13.403 2.597 14 3.333 14h9.334c.736 0 1.333-.597 1.333-1.333V3.333C14 2.597 13.403 2 12.667 2Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.476 11.074V4.926m0 6.148h3.77v-.615m-3.77.615h-.722m.722-6.148h.632m-.632 0h-.722"
        />
      </svg>
    );
  }
);
LabelIcon.displayName = "LabelIcon";

export const LargeXIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.5 3 3 12.5M3 3l9.5 9.5"
        />
      </svg>
    );
  }
);
LargeXIcon.displayName = "LargeXIcon";

export const LifeBuoyIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <circle cx="7.995" cy="7.995" r="6.665" stroke="#000" />
        <path d="m3.287 3.287 2.826 2.826M9.886 6.113l2.827-2.826M9.886 9.887l2.827 2.826M6.113 9.887l-2.827 2.826" />
        <circle cx="7.995" cy="7.995" r="2.665" stroke="#000" />
      </svg>
    );
  }
);
LifeBuoyIcon.displayName = "LifeBuoyIcon";

export const Link2UnlinkedIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 4.667h1.333a3.333 3.333 0 0 1 0 6.666H10m-4 0H4.667a3.333 3.333 0 0 1 0-6.666H6"
        />
      </svg>
    );
  }
);
Link2UnlinkedIcon.displayName = "Link2UnlinkedIcon";

export const Link2Icon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 11.333H4.667a3.333 3.333 0 0 1 0-6.666H6M10 4.667h1.333a3.334 3.334 0 0 1 0 6.666H10M5.333 8h5.334"
        />
      </svg>
    );
  }
);
Link2Icon.displayName = "Link2Icon";

export const LinkIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.943 11.771 8 12.714A3.333 3.333 0 0 1 3.286 8l.943-.943M7.057 4.229 8 3.286A3.333 3.333 0 1 1 12.714 8l-.943.943M6.114 9.886l3.772-3.772"
        />
      </svg>
    );
  }
);
LinkIcon.displayName = "LinkIcon";

export const ListItemIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path d="M3.7 6.175a.85.85 0 1 1-1.7 0 .85.85 0 0 1 1.7 0Z" />
        <path
          fillRule="evenodd"
          d="M5 6.175c0-.345.28-.625.625-.625h7.75a.625.625 0 1 1 0 1.25h-7.75A.625.625 0 0 1 5 6.175ZM5 10.05c0-.345.28-.625.625-.625h7.75a.625.625 0 1 1 0 1.25h-7.75A.625.625 0 0 1 5 10.05Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
ListItemIcon.displayName = "ListItemIcon";

export const ListViewIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M3.333 2.5a.833.833 0 0 0-.833.833v9.334c0 .46.373.833.833.833h9.334c.46 0 .833-.373.833-.833V3.333a.833.833 0 0 0-.833-.833H3.333ZM1.5 3.333c0-1.012.82-1.833 1.833-1.833h9.334c1.012 0 1.833.82 1.833 1.833v9.334c0 1.012-.82 1.833-1.833 1.833H3.333A1.833 1.833 0 0 1 1.5 12.667V3.333Z"
          clipRule="evenodd"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 6H2M14 10H2"
        />
      </svg>
    );
  }
);
ListViewIcon.displayName = "ListViewIcon";

export const ListIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path d="M3.7 4.35a.85.85 0 1 1-1.7 0 .85.85 0 0 1 1.7 0Z" />
        <path
          fillRule="evenodd"
          d="M5 4.35c0-.346.28-.626.625-.626h7.75a.625.625 0 1 1 0 1.25h-7.75A.625.625 0 0 1 5 4.35Z"
          clipRule="evenodd"
        />
        <path d="M3.7 8A.85.85 0 1 1 2 8a.85.85 0 0 1 1.7 0Z" />
        <path
          fillRule="evenodd"
          d="M5 8c0-.345.28-.625.625-.625h7.75a.625.625 0 1 1 0 1.25h-7.75A.625.625 0 0 1 5 8Z"
          clipRule="evenodd"
        />
        <path d="M3.7 11.65a.85.85 0 1 1-1.7 0 .85.85 0 0 1 1.7 0Z" />
        <path
          fillRule="evenodd"
          d="M5 11.65c0-.346.28-.626.625-.626h7.75a.625.625 0 1 1 0 1.25h-7.75A.625.625 0 0 1 5 11.65Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
ListIcon.displayName = "ListIcon";

export const LoadingDotsIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        id="eEMFTOz1Zbw1"
        shapeRendering="geometricPrecision"
        textRendering="geometricPrecision"
        viewBox="0 0 300 300"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <style>
          {
            "@keyframes eEMFTOz1Zbw12_to__to{0%,26.666667%,56.666667%,6.333333%,77%,to{transform:translate(150px,180px)}16.666667%,67%{transform:translate(150px,120px);animation-timing-function:cubic-bezier(.42,0,.58,1)}}@keyframes eEMFTOz1Zbw13_to__to{0%,20%,50%,70%,to{transform:translate(80px,180px)}10%,60%{transform:translate(80px,120px);animation-timing-function:cubic-bezier(.42,0,.58,1)}}@keyframes eEMFTOz1Zbw14_to__to{0%,13.333333%,33.333333%,63.333333%,83.333333%,to{transform:translate(220px,180px)}23.333333%,73.333333%{transform:translate(220px,120px);animation-timing-function:cubic-bezier(.42,0,.58,1)}}#eEMFTOz1Zbw12_to{animation:eEMFTOz1Zbw12_to__to 2000ms linear infinite normal forwards}#eEMFTOz1Zbw13_to{animation:eEMFTOz1Zbw13_to__to 2000ms linear infinite normal forwards}#eEMFTOz1Zbw14_to{animation:eEMFTOz1Zbw14_to__to 2000ms linear infinite normal forwards}"
          }
        </style>
        <circle
          id="eEMFTOz1Zbw12_to"
          r="20"
          strokeWidth="0"
          transform="translate(150,180) translate(0,0)"
        />
        <circle
          id="eEMFTOz1Zbw13_to"
          r="20"
          strokeWidth="0"
          transform="translate(80,180) translate(0,0)"
        />
        <circle
          id="eEMFTOz1Zbw14_to"
          r="20"
          strokeWidth="0"
          transform="translate(220,180) translate(0,0)"
        />
      </svg>
    );
  }
);
LoadingDotsIcon.displayName = "LoadingDotsIcon";

export const MarkdownEmbedIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.667 5.333h4M4.667 8H10M14 8.75V3.5A1.5 1.5 0 0 0 12.5 2h-9A1.5 1.5 0 0 0 2 3.5v9.191c0 .725.588 1.313 1.313 1.313h4.691"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 14.314v-4l2 2.03 2-2.03v4"
        />
      </svg>
    );
  }
);
MarkdownEmbedIcon.displayName = "MarkdownEmbedIcon";

export const MaximizeIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 2h4v4M6 14H2v-4M14 2 9.334 6.667M2 14l4.667-4.667"
        />
      </svg>
    );
  }
);
MaximizeIcon.displayName = "MaximizeIcon";

export const MenuIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.667 8h10.666M2.667 4h10.666M2.667 12h10.666"
        />
      </svg>
    );
  }
);
MenuIcon.displayName = "MenuIcon";

export const MicOffIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m1.333 1.333 13 13M12.593 8.82c.048-.27.073-.545.074-.82V6.667M3.333 6.667V8a4.667 4.667 0 0 0 8 3.333M10 6.227V3.333a2 2 0 0 0-3.787-.886"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 6v2a2 2 0 0 0 3.413 1.413M8 12.667v2"
        />
      </svg>
    );
  }
);
MicOffIcon.displayName = "MicOffIcon";

export const MicIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 1.333a2 2 0 0 0-2 2V8a2 2 0 1 0 4 0V3.333a2 2 0 0 0-2-2Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 6.667V8a4.666 4.666 0 1 1-9.334 0V6.667M8 12.667v2"
        />
      </svg>
    );
  }
);
MicIcon.displayName = "MicIcon";

export const MinimizeIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.667 9.333h4v4M13.333 6.667h-4v-4M9.333 6.667 14 2M2 14l4.667-4.667"
        />
      </svg>
    );
  }
);
MinimizeIcon.displayName = "MinimizeIcon";

export const MinusIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.333 8h9.334"
        />
      </svg>
    );
  }
);
MinusIcon.displayName = "MinusIcon";

export const NavigationMenuIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 7v5.833c0 .645-.597 1.167-1.333 1.167H3.333C2.597 14 2 13.478 2 12.833V7"
        />
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.978 2.003H2.6a.6.6 0 0 0-.6.6v1.4h11.971v-1.4a.6.6 0 0 0-.6-.6h-2.393Z"
        />
      </svg>
    );
  }
);
NavigationMenuIcon.displayName = "NavigationMenuIcon";

export const NavigatorIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 8H15M1 4.5h10.5M4.5 11.5H15"
        />
      </svg>
    );
  }
);
NavigatorIcon.displayName = "NavigatorIcon";

export const NewFolderIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="#000"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 6.667v4M6 8.667h4M13.333 13.333A1.333 1.333 0 0 0 14.667 12V5.333A1.334 1.334 0 0 0 13.333 4H8.067a1.333 1.333 0 0 1-1.127-.6l-.54-.8A1.333 1.333 0 0 0 5.287 2h-2.62a1.333 1.333 0 0 0-1.334 1.333V12a1.333 1.333 0 0 0 1.334 1.333h10.666Z"
        />
      </svg>
    );
  }
);
NewFolderIcon.displayName = "NewFolderIcon";

export const NewPageIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 1.333H4a1.333 1.333 0 0 0-1.333 1.334v10.666A1.333 1.333 0 0 0 4 14.667h8a1.333 1.333 0 0 0 1.333-1.334V4.667L10 1.333Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.333 1.333V4a1.333 1.333 0 0 0 1.334 1.333h2.666M6 10h4M8 12V8"
        />
      </svg>
    );
  }
);
NewPageIcon.displayName = "NewPageIcon";

export const NoWrapIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.49 3.667h-.98c-.542 0-.982.403-.982.9v7.2c0 .497.44.9.981.9h.982c.542 0 .981-.403.981-.9v-7.2c0-.497-.44-.9-.981-.9ZM8.49 3.667h-.98c-.542 0-.982.403-.982.9v7.2c0 .497.44.9.981.9h.982c.542 0 .981-.403.981-.9v-7.2c0-.497-.44-.9-.981-.9ZM13.434 3.667h-.98c-.543 0-.982.403-.982.9v7.2c0 .497.44.9.981.9h.982c.541 0 .98-.403.98-.9v-7.2c0-.497-.439-.9-.98-.9Z"
        />
      </svg>
    );
  }
);
NoWrapIcon.displayName = "NoWrapIcon";

export const NotebookAndPenIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.933 1.5H4a1.35 1.35 0 0 0-.943.38c-.25.245-.39.575-.39.92v10.4c0 .345.14.676.39.92.25.243.59.38.943.38h8c.354 0 .693-.137.943-.38.25-.244.39-.575.39-.92V8.39M1.333 4.167H4M1.333 6.833H4M1.333 9.5H4M1.333 12.167H4"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.252 3.917a1.416 1.416 0 1 0-2.003-2.002L8.91 5.256a1.333 1.333 0 0 0-.337.57l-.558 1.913a.333.333 0 0 0 .413.413l1.914-.558c.215-.063.41-.179.569-.337l3.342-3.34Z"
        />
      </svg>
    );
  }
);
NotebookAndPenIcon.displayName = "NotebookAndPenIcon";

export const OfflineIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.524 3.947C1.83 4.792 1.428 6.728 1.352 7.59A4.667 4.667 0 0 0 6 12.667h6.23m1.558-.879a3 3 0 0 0-2.121-5.121h-1.194a4.667 4.667 0 0 0-2.421-2.859c-.78-.381-1.673-.403-2.54-.403v0"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          d="M1.632 1.997 13.583 13.95"
        />
      </svg>
    );
  }
);
OfflineIcon.displayName = "OfflineIcon";

export const OrderFirstIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.547 3.667h-.981c-.542 0-.982.403-.982.9v7.2c0 .497.44.9.982.9h.98c.543 0 .982-.403.982-.9v-7.2c0-.497-.44-.9-.981-.9Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.49 3.667h-.98c-.542 0-.982.403-.982.9v7.2c0 .497.44.9.981.9h.982c.542 0 .981-.403.981-.9v-7.2c0-.497-.44-.9-.981-.9ZM13.434 3.667h-.98c-.543 0-.982.403-.982.9v7.2c0 .497.44.9.981.9h.982c.541 0 .98-.403.98-.9v-7.2c0-.497-.439-.9-.98-.9Z"
        />
      </svg>
    );
  }
);
OrderFirstIcon.displayName = "OrderFirstIcon";

export const OrderLastIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.547 3.667h-.981c-.542 0-.982.403-.982.9v7.2c0 .497.44.9.982.9h.98c.543 0 .982-.403.982-.9v-7.2c0-.497-.44-.9-.981-.9ZM8.49 3.667h-.98c-.542 0-.982.403-.982.9v7.2c0 .497.44.9.981.9h.982c.542 0 .981-.403.981-.9v-7.2c0-.497-.44-.9-.981-.9Z"
        />
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.434 3.667h-.98c-.543 0-.982.403-.982.9v7.2c0 .497.44.9.981.9h.982c.541 0 .98-.403.98-.9v-7.2c0-.497-.439-.9-.98-.9Z"
        />
      </svg>
    );
  }
);
OrderLastIcon.displayName = "OrderLastIcon";

export const OverlayIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="#D2D2D2"
          d="M13.444 1H2.556C1.696 1 1 1.696 1 2.556v10.888C1 14.304 1.696 15 2.556 15h10.888c.86 0 1.556-.696 1.556-1.556V2.556C15 1.696 14.304 1 13.444 1Z"
        />
      </svg>
    );
  }
);
OverlayIcon.displayName = "OverlayIcon";

export const PageIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.833 2h-5.5A1.333 1.333 0 0 0 3 3.333v10a1.333 1.333 0 0 0 1.333 1.334h7.5a1.333 1.333 0 0 0 1.334-1.334v-8L9.833 2Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.167 2.5v1.667A1.333 1.333 0 0 0 10.5 5.5h2.667"
        />
      </svg>
    );
  }
);
PageIcon.displayName = "PageIcon";

export const PaintBrushIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m6.04 7.933 5.38-5.373a1.9 1.9 0 1 1 2.687 2.687l-5.374 5.386M4.713 9.96c-1.106 0-2 .9-2 2.013 0 .887-1.666 1.014-1.333 1.347.72.733 1.66 1.347 2.667 1.347 1.466 0 2.666-1.2 2.666-2.694a2.007 2.007 0 0 0-2-2.013Z"
        />
      </svg>
    );
  }
);
PaintBrushIcon.displayName = "PaintBrushIcon";

export const PhoneIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.5 11.24v1.96a1.308 1.308 0 0 1-1.425 1.308A12.934 12.934 0 0 1 7.434 12.5a12.745 12.745 0 0 1-3.922-3.922 12.935 12.935 0 0 1-2.007-5.667 1.307 1.307 0 0 1 1.301-1.425h1.96a1.307 1.307 0 0 1 1.308 1.124c.083.628.236 1.244.458 1.837a1.307 1.307 0 0 1-.294 1.38l-.83.83a10.458 10.458 0 0 0 3.921 3.921l.83-.83a1.307 1.307 0 0 1 1.38-.294c.593.221 1.209.375 1.836.458a1.307 1.307 0 0 1 1.125 1.326Z"
        />
      </svg>
    );
  }
);
PhoneIcon.displayName = "PhoneIcon";

export const PlayIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m4 2 9.333 6L4 14V2Z"
        />
      </svg>
    );
  }
);
PlayIcon.displayName = "PlayIcon";

export const PluginIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fillRule="evenodd"
          d="M4.687 2.667a2.317 2.317 0 0 1 4.633 0v.35h.039c.447 0 .815 0 1.116.02.312.021.6.067.876.181a2.65 2.65 0 0 1 1.434 1.435c.114.276.16.563.181.875.01.147.015.31.018.489h.353a2.317 2.317 0 0 1 0 4.633h-.35v.51c0 .537 0 .98-.03 1.34-.03.374-.096.716-.26 1.036a2.65 2.65 0 0 1-1.157 1.159c-.321.163-.663.228-1.037.259-.36.03-.802.03-1.34.03H8.67a.65.65 0 0 1-.65-.65v-1.167a.85.85 0 1 0-1.7 0v1.166a.65.65 0 0 1-.65.65h-.827c-.537 0-.98 0-1.34-.03-.373-.03-.715-.095-1.036-.258a2.65 2.65 0 0 1-1.158-1.159c-.164-.32-.23-.662-.26-1.036-.03-.36-.03-.803-.03-1.34V10a.65.65 0 0 1 .65-.65h1a1.017 1.017 0 0 0 0-2.033h-1a.65.65 0 0 1-.65-.65v-.023c0-.447 0-.815.021-1.116.022-.312.067-.6.182-.875a2.65 2.65 0 0 1 1.434-1.435c.276-.114.563-.16.875-.18.302-.021.67-.021 1.117-.021h.039v-.35ZM7.003 1.65c-.561 0-1.016.455-1.016 1.017v1a.65.65 0 0 1-.65.65H4.67c-.475 0-.799 0-1.05.017-.246.017-.375.048-.467.085-.33.137-.593.4-.73.731-.038.091-.069.22-.086.467a7.71 7.71 0 0 0-.014.4h.347a2.317 2.317 0 0 1 0 4.633h-.35v.483c0 .571 0 .96.025 1.261.024.293.068.445.122.552.13.254.336.46.59.59.107.055.259.098.552.122.301.025.69.025 1.26.025h.15v-.516a2.15 2.15 0 0 1 4.3 0v.516c.474 0 .81-.003 1.078-.025.293-.024.445-.067.553-.122.254-.13.46-.336.59-.59.054-.107.098-.259.122-.552.024-.3.025-.69.025-1.26V10a.65.65 0 0 1 .65-.65h1a1.017 1.017 0 0 0 0-2.033h-1a.65.65 0 0 1-.65-.65c0-.475 0-.799-.018-1.05-.017-.246-.047-.376-.085-.467a1.35 1.35 0 0 0-.73-.73c-.092-.038-.222-.069-.467-.086a17.153 17.153 0 0 0-1.05-.017H8.67a.65.65 0 0 1-.65-.65v-1c0-.562-.455-1.017-1.017-1.017Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
PluginIcon.displayName = "PluginIcon";

export const PlusIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2 8h12M8 2v12"
        />
      </svg>
    );
  }
);
PlusIcon.displayName = "PlusIcon";

export const PopoverIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 6V4a1.334 1.334 0 0 0-1.333-1.333h-10A1.333 1.333 0 0 0 1.333 4v6.667c0 .733.6 1.333 1.334 1.333h2.666"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.333 8.667h-4C8.597 8.667 8 9.264 8 10v2c0 .736.597 1.333 1.333 1.333h4c.737 0 1.334-.597 1.334-1.333v-2c0-.736-.597-1.333-1.334-1.333Z"
        />
      </svg>
    );
  }
);
PopoverIcon.displayName = "PopoverIcon";

export const RadioCheckedIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z"
        />
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"
        />
      </svg>
    );
  }
);
RadioCheckedIcon.displayName = "RadioCheckedIcon";

export const RadioGroupIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="#000"
          stroke="#000"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.839 8a1.82 1.82 0 1 1-3.64 0 1.82 1.82 0 0 1 3.64 0Z"
        />
        <path
          stroke="#000"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.019 13.027a5.027 5.027 0 1 0 0-10.054 5.027 5.027 0 0 0 0 10.054Z"
        />
        <path
          stroke="#000"
          strokeLinecap="round"
          d="M12.629 12.077v0a6.73 6.73 0 0 0-.337-8.565v0"
        />
      </svg>
    );
  }
);
RadioGroupIcon.displayName = "RadioGroupIcon";

export const RadioUncheckedIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z"
        />
      </svg>
    );
  }
);
RadioUncheckedIcon.displayName = "RadioUncheckedIcon";

export const RefreshIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M8 1.5h-.002A7 7 0 0 0 3.16 3.467l-.006.006-.653.653V2a.5.5 0 0 0-1 0v3.333a.498.498 0 0 0 .144.352l.005.004A.498.498 0 0 0 2 5.833h3.357a.5.5 0 1 0 0-1h-2.15l.65-.65A6 6 0 0 1 8.001 2.5 5.5 5.5 0 0 1 13.5 8a.5.5 0 0 0 1 0A6.5 6.5 0 0 0 8 1.5Zm-6 6a.5.5 0 0 1 .5.5A5.5 5.5 0 0 0 8 13.5a6 6 0 0 0 4.143-1.683l.759-.76h-2.235a.5.5 0 1 1 0-1H14a.5.5 0 0 1 .5.5v3.334a.5.5 0 0 1-1 0v-2.017l-.653.653-.006.006A7 7 0 0 1 8 14.5H8A6.5 6.5 0 0 1 1.5 8a.5.5 0 0 1 .5-.5Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
RefreshIcon.displayName = "RefreshIcon";

export const RepeatColumnIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.25 12.417V3.083c0-.736-.597-1.333-1.333-1.333H7.083c-.736 0-1.333.597-1.333 1.333v9.334c0 .736.597 1.333 1.333 1.333h1.834c.736 0 1.333-.597 1.333-1.333ZM10.25 5.75h-4M10.25 9.75h-4"
        />
      </svg>
    );
  }
);
RepeatColumnIcon.displayName = "RepeatColumnIcon";

export const RepeatGridIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 2H3.333C2.597 2 2 2.597 2 3.333v9.334C2 13.403 2.597 14 3.333 14h9.334c.736 0 1.333-.597 1.333-1.333V3.333C14 2.597 13.403 2 12.667 2ZM2 6h12M2 10h12M6 2v12M10 2v12"
        />
      </svg>
    );
  }
);
RepeatGridIcon.displayName = "RepeatGridIcon";

export const RepeatRowIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 5.5H3.333C2.597 5.5 2 6.097 2 6.833v1.834C2 9.403 2.597 10 3.333 10h9.334C13.403 10 14 9.403 14 8.667V6.833c0-.736-.597-1.333-1.333-1.333ZM6 5.5v4M10 5.5v4"
        />
      </svg>
    );
  }
);
RepeatRowIcon.displayName = "RepeatRowIcon";

export const ResetIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fillRule="evenodd"
          d="M6.322 1.78a.783.783 0 0 1-.068 1.104L4.85 4.124h4.453A4.696 4.696 0 0 1 14 8.819c0 2.686-2.2 4.35-4.696 4.35h-1.63a.783.783 0 0 1 0-1.564h1.63c1.828 0 3.13-1.15 3.13-2.786a3.13 3.13 0 0 0-3.13-3.13H4.851l1.403 1.24A.783.783 0 1 1 5.217 8.1L2.264 5.493a.783.783 0 0 1 0-1.173L5.217 1.71a.783.783 0 0 1 1.105.068Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
ResetIcon.displayName = "ResetIcon";

export const ResourceIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.667 5.333h4M4.667 8H10M14 8.75V3.5A1.5 1.5 0 0 0 12.5 2h-9A1.5 1.5 0 0 0 2 3.5v9.252c0 .69.56 1.25 1.25 1.25v0H6"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.45 14.5h-.7a1.75 1.75 0 1 1 0-3.5h.7M12.55 11h.7a1.75 1.75 0 1 1 0 3.5h-.7M10.1 12.75h2.8"
        />
      </svg>
    );
  }
);
ResourceIcon.displayName = "ResourceIcon";

export const ScrollIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 4v4M6 6l2-2 2 2M8 12V8M10 10l-2 2-2-2M2 14V2M14.003 14V2"
        />
      </svg>
    );
  }
);
ScrollIcon.displayName = "ScrollIcon";

export const SearchIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.333 12.667A5.333 5.333 0 1 0 7.333 2a5.333 5.333 0 0 0 0 10.667ZM14 14l-2.867-2.867"
        />
      </svg>
    );
  }
);
SearchIcon.displayName = "SearchIcon";

export const SectionLinkIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.667 14.667H12a1.333 1.333 0 0 0 1.333-1.334V4.667L10 1.333H4a1.333 1.333 0 0 0-1.333 1.334v2.666"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.333 1.333V4a1.333 1.333 0 0 0 1.334 1.333h2.666M2 10h4"
        />
      </svg>
    );
  }
);
SectionLinkIcon.displayName = "SectionLinkIcon";

export const SelectIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.184 10.33h.149c.736 0 1.332-.597 1.332-1.332V6.332c0-.735-.596-1.332-1.332-1.332H2.667c-.735 0-1.332.597-1.332 1.332v2.666c0 .735.597 1.332 1.333 1.332h10.516Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m10.078 7.165 1 1 1-1"
        />
      </svg>
    );
  }
);
SelectIcon.displayName = "SelectIcon";

export const SettingsIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M13.987 6H9.32M13.932 6h-12M14 10.5H2"
        />
        <rect
          width="4"
          height="4"
          x="1.932"
          y="8.534"
          fill="#fff"
          stroke="currentColor"
          rx="2"
        />
        <rect
          width="4"
          height="4"
          x="10.068"
          y="4"
          fill="#fff"
          stroke="currentColor"
          rx="2"
        />
      </svg>
    );
  }
);
SettingsIcon.displayName = "SettingsIcon";

export const ShadowInsetIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <rect
          width="13"
          height="13"
          x="1.5"
          y="1.5"
          stroke="currentColor"
          rx="6.5"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.804 7.833a4.196 4.196 0 1 1 8.392 0"
        />
      </svg>
    );
  }
);
ShadowInsetIcon.displayName = "ShadowInsetIcon";

export const ShadowNormalIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12.327a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 10v0c-2.774 5.944-11.226 5.944-14 0v0"
        />
      </svg>
    );
  }
);
ShadowNormalIcon.displayName = "ShadowNormalIcon";

export const ShrinkIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M8 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 8 1ZM1.333 7.5a.5.5 0 0 0 0 1h2.793L2.98 9.646a.5.5 0 0 0 .707.708l2-2a.499.499 0 0 0 .146-.351v-.006a.498.498 0 0 0-.146-.35l-2-2a.5.5 0 1 0-.707.707L4.126 7.5H1.333Zm8.834.503a.496.496 0 0 0 .146.35l2 2a.5.5 0 0 0 .707-.707L11.874 8.5h2.793a.5.5 0 1 0 0-1h-2.793l1.146-1.146a.5.5 0 1 0-.707-.708l-2 2a.498.498 0 0 0-.146.351v.006ZM8.5 5.5a.5.5 0 0 0-1 0v1a.5.5 0 0 0 1 0v-1ZM8 9a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0v-1A.5.5 0 0 1 8 9Zm.5 4.5a.5.5 0 0 0-1 0v1a.5.5 0 0 0 1 0v-1Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
ShrinkIcon.displayName = "ShrinkIcon";

export const SliderIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.015 8.265h-6M8.015 8.265h-6"
        />
        <rect
          width="3"
          height="3"
          x="4.026"
          y="6.5"
          fill="#fff"
          stroke="currentColor"
          rx="1.5"
        />
      </svg>
    );
  }
);
SliderIcon.displayName = "SliderIcon";

export const SlotComponentIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.5 2H3.333A1.333 1.333 0 0 0 2 3.333V4.5M14 4.5V3.333A1.333 1.333 0 0 0 12.667 2H11.5M14 12.667c0 .021 0 .042-.002.063M11.5 14h1.167a1.333 1.333 0 0 0 1.331-1.27m0 0V11.5M2 11.5v1.167A1.333 1.333 0 0 0 3.333 14H4.5M7 2h2M7 14h2M2 7v2M14 7v2"
        />
      </svg>
    );
  }
);
SlotComponentIcon.displayName = "SlotComponentIcon";

export const SpinnerIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        id="e2CRglijn891"
        shapeRendering="geometricPrecision"
        textRendering="geometricPrecision"
        viewBox="0 0 128 128"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <style>
          {
            "@keyframes e2CRglijn892_tr__tr{0%{transform:translate(64px,64px) rotate(90deg);animation-timing-function:cubic-bezier(.42,0,.58,1)}50%{transform:translate(64px,64px) rotate(810deg);animation-timing-function:cubic-bezier(.42,0,.58,1)}to{transform:translate(64px,64px) rotate(1530deg)}}@keyframes e2CRglijn892_s_p{0%,to{stroke:#39fbbb}25%{stroke:#4a4efa}50%{stroke:#e63cfe}75%{stroke:#ffae3c}}@keyframes e2CRglijn892_s_do{0%{stroke-dashoffset:251.89}2.5%,52.5%{stroke-dashoffset:263.88;animation-timing-function:cubic-bezier(.42,0,.58,1)}25%,75%{stroke-dashoffset:131.945}to{stroke-dashoffset:251.885909}}#e2CRglijn892_tr{animation:e2CRglijn892_tr__tr 3000ms linear infinite normal forwards}#e2CRglijn892{animation-name:e2CRglijn892_s_p,e2CRglijn892_s_do;animation-duration:3000ms;animation-fill-mode:forwards;animation-timing-function:linear;animation-direction:normal;animation-iteration-count:infinite}"
          }
        </style>
        <g id="e2CRglijn892_tr" transform="translate(64,64) rotate(90)">
          <circle
            id="e2CRglijn892"
            r="42"
            fill="none"
            stroke="#39fbbb"
            strokeDasharray="263.89"
            strokeDashoffset="251.89"
            strokeLinecap="round"
            strokeWidth="16"
            transform="scale(-1,1) translate(0,0)"
          />
        </g>
      </svg>
    );
  }
);
SpinnerIcon.displayName = "SpinnerIcon";

export const StopIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <rect width="9" height="9" x="3.5" y="3.5" fill="currentColor" rx="1" />
      </svg>
    );
  }
);
StopIcon.displayName = "StopIcon";

export const StretchVerticalIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.4 4.097H4.1c-.72 0-1.302.582-1.302 1.3v7.807c0 .719.583 1.301 1.301 1.301H5.4c.719 0 1.301-.582 1.301-1.3V5.397c0-.719-.582-1.301-1.3-1.301ZM11.906 4.097h-1.301c-.719 0-1.301.582-1.301 1.3v3.254c0 .718.582 1.3 1.3 1.3h1.302c.718 0 1.3-.582 1.3-1.3V5.398c0-.719-.582-1.301-1.3-1.301ZM14.497 1.495h-13"
        />
      </svg>
    );
  }
);
StretchVerticalIcon.displayName = "StretchVerticalIcon";

export const SubscriptIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.667 3.333 8 8.667M8 3.333 2.667 8.667M13.333 12.667h-2.666c0-1 .293-1.334 1-1.667.706-.333 1.666-.78 1.666-1.667 0-.313-.113-.62-.32-.86a1.407 1.407 0 0 0-1.746-.293c-.28.16-.494.413-.6.713"
        />
      </svg>
    );
  }
);
SubscriptIcon.displayName = "SubscriptIcon";

export const SuperscriptIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.667 12.667 8 7.333M8 12.667 2.667 7.333M13.333 8h-2.666c0-1 .294-1.333 1-1.667.705-.333 1.666-.777 1.666-1.665 0-.315-.113-.62-.322-.86a1.403 1.403 0 0 0-1.745-.29c-.28.159-.492.409-.6.706"
        />
      </svg>
    );
  }
);
SuperscriptIcon.displayName = "SuperscriptIcon";

export const SwitchIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.667 4H5.333a4 4 0 1 0 0 8h5.334a4 4 0 0 0 0-8Z"
        />
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.333 9.333a1.333 1.333 0 1 0 0-2.666 1.333 1.333 0 0 0 0 2.666Z"
        />
      </svg>
    );
  }
);
SwitchIcon.displayName = "SwitchIcon";

export const TabsIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.75 5H13M9.75 5H7.401A1.684 1.684 0 0 1 6 4.25v0l-.5-.75-.5-.75L4.5 2m5.25 3-1-1.5-.5-.75-.5-.75M4.5 2H3v0a1.5 1.5 0 0 0-1.5 1.5v9A1.5 1.5 0 0 0 3 14h10v0a1.5 1.5 0 0 0 1.5-1.5v0-6A1.5 1.5 0 0 0 13 5v0M4.5 2h3.25m0 0h2.375v0c.547 0 1.057.273 1.36.728l.015.022.5.75L13 5"
        />
      </svg>
    );
  }
);
TabsIcon.displayName = "TabsIcon";

export const TerminalIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.667 7.333 6 6 4.667 4.667M7.333 8.667H10"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 2H3.333C2.597 2 2 2.597 2 3.333v9.334C2 13.403 2.597 14 3.333 14h9.334c.736 0 1.333-.597 1.333-1.333V3.333C14 2.597 13.403 2 12.667 2Z"
        />
      </svg>
    );
  }
);
TerminalIcon.displayName = "TerminalIcon";

export const TextAlignCenterIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M2 3.5a.5.5 0 0 0 0 1h12a.5.5 0 0 0 0-1H2ZM4.167 8a.5.5 0 0 1 .5-.5h6.666a.5.5 0 0 1 0 1H4.667a.5.5 0 0 1-.5-.5Zm-1.334 4a.5.5 0 0 1 .5-.5h9.334a.5.5 0 0 1 0 1H3.333a.5.5 0 0 1-.5-.5Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
TextAlignCenterIcon.displayName = "TextAlignCenterIcon";

export const TextAlignJustifyIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M2 3.5a.5.5 0 0 0 0 1h12a.5.5 0 0 0 0-1H2ZM1.5 8a.5.5 0 0 1 .5-.5h12a.5.5 0 0 1 0 1H2a.5.5 0 0 1-.5-.5Zm0 4a.5.5 0 0 1 .5-.5h12a.5.5 0 0 1 0 1H2a.5.5 0 0 1-.5-.5Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
TextAlignJustifyIcon.displayName = "TextAlignJustifyIcon";

export const TextAlignLeftIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10 8H2M11.333 12H2M14 4H2"
        />
      </svg>
    );
  }
);
TextAlignLeftIcon.displayName = "TextAlignLeftIcon";

export const TextAlignRightIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M2 3.5a.5.5 0 0 0 0 1h12a.5.5 0 0 0 0-1H2ZM5.5 8a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5Zm-1.333 4a.5.5 0 0 1 .5-.5H14a.5.5 0 0 1 0 1H4.667a.5.5 0 0 1-.5-.5Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
TextAlignRightIcon.displayName = "TextAlignRightIcon";

export const TextCapitalizeIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M1.5 10.889 4.389 5.11l2.889 5.778M2.222 9.444h4.334M12.333 10.889a2.167 2.167 0 1 0 0-4.334 2.167 2.167 0 0 0 0 4.334ZM14.5 6.556v4.333"
        />
      </svg>
    );
  }
);
TextCapitalizeIcon.displayName = "TextCapitalizeIcon";

export const TextItalicIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 2.667h-6M9.333 13.333h-6M10 2.667 6 13.333"
        />
      </svg>
    );
  }
);
TextItalicIcon.displayName = "TextItalicIcon";

export const TextLowercaseIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.937 11.25a2.437 2.437 0 1 0 0-4.875 2.437 2.437 0 0 0 0 4.875ZM6.375 6.375v4.875M12.063 11.25a2.437 2.437 0 1 0 0-4.875 2.437 2.437 0 0 0 0 4.875ZM9.625 4.75v6.5"
        />
      </svg>
    );
  }
);
TextLowercaseIcon.displayName = "TextLowercaseIcon";

export const TextStrikethroughIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.667 2.667H6a2 2 0 0 0-1.887 2.666M9.333 8a2.667 2.667 0 1 1 0 5.333H4M2.667 8h10.666"
        />
      </svg>
    );
  }
);
TextStrikethroughIcon.displayName = "TextStrikethroughIcon";

export const TextTruncateIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 11V3.333A1.334 1.334 0 0 0 12.667 2H3.333A1.333 1.333 0 0 0 2 3.333v9.334A1.333 1.333 0 0 0 3.333 14H5.5"
        />
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 13.375a.375.375 0 1 0 .75 0 .375.375 0 0 0-.75 0ZM10.813 13.375a.375.375 0 1 0 .75 0 .375.375 0 0 0-.75 0ZM13.625 13.375a.375.375 0 1 0 .75 0 .375.375 0 0 0-.75 0Z"
        />
      </svg>
    );
  }
);
TextTruncateIcon.displayName = "TextTruncateIcon";

export const TextUnderlineIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 2.667v4a4 4 0 0 0 8 0v-4M2.667 13.333h10.666"
        />
      </svg>
    );
  }
);
TextUnderlineIcon.displayName = "TextUnderlineIcon";

export const TextUppercaseIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M1.5 10.811 4.31 5.19l2.812 5.622M2.202 9.406h4.217M9.933 8h3.162a1.406 1.406 0 1 1 0 2.811H9.933V5.19h2.81a1.406 1.406 0 1 1 0 2.811"
        />
      </svg>
    );
  }
);
TextUppercaseIcon.displayName = "TextUppercaseIcon";

export const TextIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.667 4.667v-2h10.666v2M6 13.333h4M8 2.667v10.666"
        />
      </svg>
    );
  }
);
TextIcon.displayName = "TextIcon";

export const TooltipIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="#000"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 10a1.333 1.333 0 0 1-1.333 1.333h-8L2 14V3.333A1.333 1.333 0 0 1 3.333 2h9.334A1.333 1.333 0 0 1 14 3.333V10Z"
        />
      </svg>
    );
  }
);
TooltipIcon.displayName = "TooltipIcon";

export const TrashIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2 4h12M12.667 4v9.333c0 .667-.667 1.334-1.334 1.334H4.667c-.667 0-1.334-.667-1.334-1.334V4M5.333 4V2.667C5.333 2 6 1.333 6.667 1.333h2.666c.667 0 1.334.667 1.334 1.334V4M6.667 7.333v4M9.333 7.333v4"
        />
      </svg>
    );
  }
);
TrashIcon.displayName = "TrashIcon";

export const TriggerIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.915 7.354v-.647a1.294 1.294 0 1 0-2.587 0"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.328 6.707V6.06a1.294 1.294 0 1 0-2.587 0v.647"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.74 6.383V2.826a1.293 1.293 0 1 0-2.586 0v6.467"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.914 7.353a1.293 1.293 0 0 1 2.587 0v1.94a5.174 5.174 0 0 1-5.174 5.174H8.034c-1.81 0-2.91-.556-3.874-1.513l-2.328-2.328a1.293 1.293 0 0 1 1.83-1.824L4.8 9.94"
        />
      </svg>
    );
  }
);
TriggerIcon.displayName = "TriggerIcon";

export const UpgradeIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.667 8 8 5.333 5.333 8M8 10.667V5.333"
        />
      </svg>
    );
  }
);
UpgradeIcon.displayName = "UpgradeIcon";

export const UploadIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 8.667V14M2.667 9.933a4.667 4.667 0 1 1 7.806-4.6h1.194a3 3 0 0 1 1.666 5.495"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.333 11.333 8 8.667l2.667 2.666"
        />
      </svg>
    );
  }
);
UploadIcon.displayName = "UploadIcon";

export const VideoIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M1.833 5.333c0-.46.373-.833.834-.833h6.666c.46 0 .834.373.834.833v5.334c0 .46-.374.833-.834.833H2.667a.833.833 0 0 1-.834-.833V5.333ZM2.667 3.5C1.654 3.5.833 4.32.833 5.333v5.334c0 1.012.821 1.833 1.834 1.833h6.666c1.013 0 1.834-.82 1.834-1.833V9.6l2.704 1.803a.833.833 0 0 0 1.296-.693V5.247a.833.833 0 0 0-1.254-.72l-2.746 1.602v-.796c0-1.012-.821-1.833-1.834-1.833H2.667Zm8.5 3.787V8.4l3 2V5.537l-3 1.75Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
VideoIcon.displayName = "VideoIcon";

export const ViewportIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fillRule="evenodd"
          d="M5.173 1.35h.157a.65.65 0 0 1 0 1.3H5.2c-.57 0-.96 0-1.26.025-.294.024-.446.068-.553.122a1.35 1.35 0 0 0-.59.59c-.054.107-.098.259-.122.552-.025.301-.025.69-.025 1.261v.13a.65.65 0 0 1-1.3 0v-.157c0-.537 0-.98.03-1.34.03-.373.095-.715.259-1.036a2.65 2.65 0 0 1 1.158-1.158c.32-.164.663-.229 1.036-.26.36-.029.803-.029 1.34-.029Zm6.888 1.325c-.301-.024-.69-.025-1.261-.025h-.13a.65.65 0 1 1 0-1.3h.157c.537 0 .98 0 1.34.03.373.03.715.095 1.036.259.499.254.904.66 1.158 1.158.164.32.229.663.26 1.036.029.36.029.803.029 1.34v.157a.65.65 0 1 1-1.3 0V5.2c0-.57 0-.96-.025-1.26-.024-.294-.068-.446-.122-.553a1.35 1.35 0 0 0-.59-.59c-.107-.054-.26-.098-.552-.122ZM2 10.02a.65.65 0 0 1 .65.65v.13c0 .57 0 .96.025 1.26.024.294.068.446.122.553.13.254.336.46.59.59.107.054.259.098.552.122.301.025.69.025 1.261.025h.13a.65.65 0 1 1 0 1.3h-.157c-.537 0-.98 0-1.34-.03-.373-.03-.715-.095-1.036-.259a2.65 2.65 0 0 1-1.158-1.158c-.164-.32-.23-.663-.26-1.037-.029-.36-.029-.802-.029-1.34v-.156a.65.65 0 0 1 .65-.65Zm12 0a.65.65 0 0 1 .65.65v.157c0 .537 0 .98-.03 1.34-.03.373-.095.715-.259 1.036a2.65 2.65 0 0 1-1.158 1.158c-.32.164-.663.23-1.037.26-.36.029-.802.029-1.34.029h-.156a.65.65 0 1 1 0-1.3h.13c.57 0 .96 0 1.26-.025.294-.024.446-.068.553-.122.254-.13.46-.336.59-.59.054-.107.098-.259.122-.552.025-.301.025-.69.025-1.261v-.13a.65.65 0 0 1 .65-.65ZM8 10.033a2.033 2.033 0 1 0 0-4.066 2.033 2.033 0 0 0 0 4.066Zm0 1.3a3.333 3.333 0 1 0 0-6.666 3.333 3.333 0 0 0 0 6.666Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
ViewportIcon.displayName = "ViewportIcon";

export const VimeoIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.993 4.801c-.062 1.363-1.014 3.228-2.855 5.597-1.903 2.473-3.514 3.71-4.83 3.71-.817 0-1.508-.753-2.072-2.26l-1.13-4.143c-.419-1.506-.868-2.259-1.349-2.26a4.332 4.332 0 0 0-1.099.66L1 5.257c.69-.607 1.372-1.214 2.043-1.822.921-.796 1.613-1.215 2.074-1.257 1.09-.105 1.76.64 2.012 2.234.272 1.72.461 2.79.566 3.208.315 1.427.66 2.14 1.038 2.14.292 0 .733-.463 1.32-1.39.586-.925.9-1.63.942-2.113.084-.798-.23-1.198-.942-1.199-.357.005-.71.084-1.036.23.688-2.253 2.002-3.349 3.942-3.285 1.439.042 2.117.975 2.034 2.798Z"
        />
      </svg>
    );
  }
);
VimeoIcon.displayName = "VimeoIcon";

export const WebhookFormIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 11.32H8.007c-.734 0-1.3.627-1.654 1.267a2.666 2.666 0 0 1-5.02-1.254A2.62 2.62 0 0 1 1.713 10"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4 11.333 6.087 7.48c.353-.647.066-1.453-.334-2.067a2.667 2.667 0 1 1 4.594-2.706"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m8 4 2.087 3.82c.353.647 1.18.847 1.913.847A2.667 2.667 0 0 1 12 14"
        />
      </svg>
    );
  }
);
WebhookFormIcon.displayName = "WebhookFormIcon";

export const Webstudio1cIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fillRule="evenodd"
          d="m12.32 12.416 2.62-8.085a1.205 1.205 0 1 0-2.292-.746l-2.62 8.084a1.205 1.205 0 1 0 2.292.747Z"
          clipRule="evenodd"
        />
        <path
          fillRule="evenodd"
          d="M8 7.624c.297 0 .517.175.704.394.207.243.373.545.514.866.634 1.44.753 3.241.753 3.241a1.206 1.206 0 0 0 1.285 1.122 1.207 1.207 0 0 0 1.12-1.287s-.16-2.25-.952-4.05C10.744 6.364 9.594 5.208 8 5.208c-1.594 0-2.744 1.156-3.424 2.7-.792 1.8-.951 4.05-.951 4.05a1.207 1.207 0 0 0 1.12 1.288 1.206 1.206 0 0 0 1.284-1.122s.119-1.8.753-3.24a3.52 3.52 0 0 1 .514-.867c.187-.22.406-.394.704-.394Z"
          clipRule="evenodd"
        />
        <path
          fillRule="evenodd"
          d="M5.973 11.669 3.352 3.585a1.205 1.205 0 1 0-2.293.746l2.622 8.084a1.205 1.205 0 1 0 2.292-.746Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
Webstudio1cIcon.displayName = "Webstudio1cIcon";

export const WebstudioIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="url(#a)"
          fillRule="evenodd"
          d="m12.32 12.416 2.62-8.085a1.205 1.205 0 1 0-2.292-.746l-2.62 8.084a1.205 1.205 0 1 0 2.292.747Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#b)"
          fillRule="evenodd"
          d="m12.32 12.416 2.62-8.085a1.205 1.205 0 1 0-2.292-.746l-2.62 8.084a1.205 1.205 0 1 0 2.292.747Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#c)"
          fillOpacity=".8"
          fillRule="evenodd"
          d="m12.32 12.416 2.62-8.085a1.205 1.205 0 1 0-2.292-.746l-2.62 8.084a1.205 1.205 0 1 0 2.292.747Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#d)"
          fillRule="evenodd"
          d="m12.32 12.416 2.62-8.085a1.205 1.205 0 1 0-2.292-.746l-2.62 8.084a1.205 1.205 0 1 0 2.292.747Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#e)"
          fillRule="evenodd"
          d="m12.32 12.416 2.62-8.085a1.205 1.205 0 1 0-2.292-.746l-2.62 8.084a1.205 1.205 0 1 0 2.292.747Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#f)"
          fillRule="evenodd"
          d="m12.32 12.416 2.62-8.085a1.205 1.205 0 1 0-2.292-.746l-2.62 8.084a1.205 1.205 0 1 0 2.292.747Z"
          clipRule="evenodd"
        />
        <path
          fill="#E63CFE"
          fillRule="evenodd"
          d="M8 7.624c.297 0 .517.175.704.394.207.243.373.545.514.866.634 1.44.753 3.241.753 3.241a1.207 1.207 0 0 0 1.285 1.122 1.207 1.207 0 0 0 1.12-1.287s-.16-2.25-.952-4.05C10.744 6.364 9.594 5.208 8 5.208c-1.594 0-2.744 1.156-3.424 2.7-.792 1.801-.951 4.05-.951 4.05a1.207 1.207 0 0 0 1.12 1.288 1.207 1.207 0 0 0 1.284-1.122s.119-1.8.753-3.24a3.52 3.52 0 0 1 .514-.867c.187-.22.406-.394.704-.394Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#g)"
          fillRule="evenodd"
          d="M8 7.624c.297 0 .517.175.704.394.207.243.373.545.514.866.634 1.44.753 3.241.753 3.241a1.207 1.207 0 0 0 1.285 1.122 1.207 1.207 0 0 0 1.12-1.287s-.16-2.25-.952-4.05C10.744 6.364 9.594 5.208 8 5.208c-1.594 0-2.744 1.156-3.424 2.7-.792 1.801-.951 4.05-.951 4.05a1.207 1.207 0 0 0 1.12 1.288 1.207 1.207 0 0 0 1.284-1.122s.119-1.8.753-3.24a3.52 3.52 0 0 1 .514-.867c.187-.22.406-.394.704-.394Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#h)"
          fillRule="evenodd"
          d="M8 7.624c.297 0 .517.175.704.394.207.243.373.545.514.866.634 1.44.753 3.241.753 3.241a1.207 1.207 0 0 0 1.285 1.122 1.207 1.207 0 0 0 1.12-1.287s-.16-2.25-.952-4.05C10.744 6.364 9.594 5.208 8 5.208c-1.594 0-2.744 1.156-3.424 2.7-.792 1.801-.951 4.05-.951 4.05a1.207 1.207 0 0 0 1.12 1.288 1.207 1.207 0 0 0 1.284-1.122s.119-1.8.753-3.24a3.52 3.52 0 0 1 .514-.867c.187-.22.406-.394.704-.394Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#i)"
          fillRule="evenodd"
          d="M8 7.624c.297 0 .517.175.704.394.207.243.373.545.514.866.634 1.44.753 3.241.753 3.241a1.207 1.207 0 0 0 1.285 1.122 1.207 1.207 0 0 0 1.12-1.287s-.16-2.25-.952-4.05C10.744 6.364 9.594 5.208 8 5.208c-1.594 0-2.744 1.156-3.424 2.7-.792 1.801-.951 4.05-.951 4.05a1.207 1.207 0 0 0 1.12 1.288 1.207 1.207 0 0 0 1.284-1.122s.119-1.8.753-3.24a3.52 3.52 0 0 1 .514-.867c.187-.22.406-.394.704-.394Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#j)"
          fillRule="evenodd"
          d="M8 7.624c.297 0 .517.175.704.394.207.243.373.545.514.866.634 1.44.753 3.241.753 3.241a1.207 1.207 0 0 0 1.285 1.122 1.207 1.207 0 0 0 1.12-1.287s-.16-2.25-.952-4.05C10.744 6.364 9.594 5.208 8 5.208c-1.594 0-2.744 1.156-3.424 2.7-.792 1.801-.951 4.05-.951 4.05a1.207 1.207 0 0 0 1.12 1.288 1.207 1.207 0 0 0 1.284-1.122s.119-1.8.753-3.24a3.52 3.52 0 0 1 .514-.867c.187-.22.406-.394.704-.394Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#k)"
          fillRule="evenodd"
          d="M8 7.624c.297 0 .517.175.704.394.207.243.373.545.514.866.634 1.44.753 3.241.753 3.241a1.207 1.207 0 0 0 1.285 1.122 1.207 1.207 0 0 0 1.12-1.287s-.16-2.25-.952-4.05C10.744 6.364 9.594 5.208 8 5.208c-1.594 0-2.744 1.156-3.424 2.7-.792 1.801-.951 4.05-.951 4.05a1.207 1.207 0 0 0 1.12 1.288 1.207 1.207 0 0 0 1.284-1.122s.119-1.8.753-3.24a3.52 3.52 0 0 1 .514-.867c.187-.22.406-.394.704-.394Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#l)"
          fillRule="evenodd"
          d="M8 7.624c.297 0 .517.175.704.394.207.243.373.545.514.866.634 1.44.753 3.241.753 3.241a1.207 1.207 0 0 0 1.285 1.122 1.207 1.207 0 0 0 1.12-1.287s-.16-2.25-.952-4.05C10.744 6.364 9.594 5.208 8 5.208c-1.594 0-2.744 1.156-3.424 2.7-.792 1.801-.951 4.05-.951 4.05a1.207 1.207 0 0 0 1.12 1.288 1.207 1.207 0 0 0 1.284-1.122s.119-1.8.753-3.24a3.52 3.52 0 0 1 .514-.867c.187-.22.406-.394.704-.394Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#m)"
          fillRule="evenodd"
          d="M8 7.624c.297 0 .517.175.704.394.207.243.373.545.514.866.634 1.44.753 3.241.753 3.241a1.207 1.207 0 0 0 1.285 1.122 1.207 1.207 0 0 0 1.12-1.287s-.16-2.25-.952-4.05C10.744 6.364 9.594 5.208 8 5.208c-1.594 0-2.744 1.156-3.424 2.7-.792 1.801-.951 4.05-.951 4.05a1.207 1.207 0 0 0 1.12 1.288 1.207 1.207 0 0 0 1.284-1.122s.119-1.8.753-3.24a3.52 3.52 0 0 1 .514-.867c.187-.22.406-.394.704-.394Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#n)"
          fillRule="evenodd"
          d="M8 7.624c.297 0 .517.175.704.394.207.243.373.545.514.866.634 1.44.753 3.241.753 3.241a1.207 1.207 0 0 0 1.285 1.122 1.207 1.207 0 0 0 1.12-1.287s-.16-2.25-.952-4.05C10.744 6.364 9.594 5.208 8 5.208c-1.594 0-2.744 1.156-3.424 2.7-.792 1.801-.951 4.05-.951 4.05a1.207 1.207 0 0 0 1.12 1.288 1.207 1.207 0 0 0 1.284-1.122s.119-1.8.753-3.24a3.52 3.52 0 0 1 .514-.867c.187-.22.406-.394.704-.394Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#o)"
          fillRule="evenodd"
          d="M5.973 11.669 3.352 3.585a1.205 1.205 0 1 0-2.293.746l2.622 8.084a1.205 1.205 0 1 0 2.292-.746Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#p)"
          fillRule="evenodd"
          d="M5.973 11.669 3.352 3.585a1.205 1.205 0 1 0-2.293.746l2.622 8.084a1.205 1.205 0 1 0 2.292-.746Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#q)"
          fillRule="evenodd"
          d="M5.973 11.669 3.352 3.585a1.205 1.205 0 1 0-2.293.746l2.622 8.084a1.205 1.205 0 1 0 2.292-.746Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#r)"
          fillRule="evenodd"
          d="M5.973 11.669 3.352 3.585a1.205 1.205 0 1 0-2.293.746l2.622 8.084a1.205 1.205 0 1 0 2.292-.746Z"
          clipRule="evenodd"
        />
        <path
          fill="url(#s)"
          fillRule="evenodd"
          d="M5.973 11.669 3.352 3.585a1.205 1.205 0 1 0-2.293.746l2.622 8.084a1.205 1.205 0 1 0 2.292-.746Z"
          clipRule="evenodd"
        />
        <defs>
          <radialGradient
            id="d"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(11.2336 9.30762) rotate(-64.165) scale(7.2853)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".832" stopColor="#4A4EFA" stopOpacity="0" />
            <stop offset="1" stopColor="#4A4EFA" stopOpacity=".75" />
          </radialGradient>
          <radialGradient
            id="e"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(11.0923 8.82676) scale(1.62424 3.47362)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".169" stopColor="#11417A" />
            <stop offset=".926" stopColor="#4069D4" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="f"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(12.9724 13.2501) rotate(-90) scale(5.37233 2.57477)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".349" stopColor="#E63CFE" />
            <stop offset="1" stopColor="#E63CFE" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="g"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(7.59145 9.4488) rotate(-85.7675) scale(5.53509 4.91478)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#39FBBB" stopOpacity=".5" />
            <stop offset=".689" stopColor="#39FBBB" />
            <stop offset="1" stopColor="#39FBBB" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="h"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(15.4778 12.5651) rotate(-122.629) scale(13.2696 3.2283)"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E63CFE" />
            <stop offset="1" stopColor="#E63CFE" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="i"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(7.81141 11.1572) rotate(-85.0198) scale(5.97107 5.13635)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".557" stopColor="#4A4EFA" />
            <stop offset=".935" stopColor="#4A4EFA" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="j"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(6.19224 12.9644) rotate(-68.6367) scale(6.23573 3.72131)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".613" stopColor="#E63CFE" />
            <stop offset="1" stopColor="#E63CFE" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="k"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(12.2257 8.7415) rotate(176.233) scale(7.74243 19.5729)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".814" stopColor="#4A98D0" stopOpacity="0" />
            <stop offset=".973" stopColor="#11417A" />
          </radialGradient>
          <radialGradient
            id="l"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(5.72725 13.2501) rotate(-90) scale(5.54893 4.6041)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".458" stopColor="#FFAE3C" />
            <stop offset="1" stopColor="#FFAE3C" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="m"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(12.4559 13.2501) rotate(-90) scale(5.00159)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".192" stopColor="#E63CFE" />
            <stop offset="1" stopColor="#E63CFE" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="n"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(9.52162 13.2501) rotate(-90) scale(3.76368 1.78782)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".174" stopColor="#FFAE3C" />
            <stop offset="1" stopColor="#FFAE3C" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="p"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(3.35867 5.95923) rotate(161.042) scale(1.68855 8.24528)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".12" stopColor="#4A4EFA" />
            <stop offset="1" stopColor="#4A4EFA" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="r"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(6.03209 13.2501) rotate(-90) scale(5.42506 5.92649)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".465" stopColor="#FFAE3C" />
            <stop offset=".926" stopColor="#FFAE3C" stopOpacity="0" />
          </radialGradient>
          <radialGradient
            id="s"
            cx="0"
            cy="0"
            r="1"
            gradientTransform="translate(6.03209 13.2501) rotate(-90) scale(11.8703)"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".844" stopColor="#E63CFE" stopOpacity="0" />
            <stop offset="1" stopColor="#E63CFE" />
          </radialGradient>
          <linearGradient
            id="a"
            x1="16.343"
            x2="12.418"
            y1=".102"
            y2="12.794"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#4A4EFA" />
            <stop offset=".549" stopColor="#E63CFE" />
          </linearGradient>
          <linearGradient
            id="b"
            x1="11.413"
            x2="13.636"
            y1="7.419"
            y2="8.138"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".16" stopColor="#4A4EFA" />
            <stop offset=".946" stopColor="#4A4EFA" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="c"
            x1="11.75"
            x2="13.147"
            y1="6.351"
            y2="6.798"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#39FBBB" />
            <stop offset="1" stopColor="#39FBBB" stopOpacity="0" />
          </linearGradient>
          <linearGradient
            id="o"
            x1=".588"
            x2="3.972"
            y1="3.255"
            y2="13.784"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset=".17" stopColor="#E63CFE" />
            <stop offset=".709" stopColor="#FFAE3C" />
          </linearGradient>
          <linearGradient
            id="q"
            x1="4.844"
            x2="4.37"
            y1="8.176"
            y2="8.331"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#E63CFE" stopOpacity=".33" />
            <stop offset="1" stopColor="#E63CFE" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    );
  }
);
WebstudioIcon.displayName = "WebstudioIcon";

export const WindowInfoIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 2H3.333C2.597 2 2 2.597 2 3.333v9.334C2 13.403 2.597 14 3.333 14h9.334c.736 0 1.333-.597 1.333-1.333V3.333C14 2.597 13.403 2 12.667 2ZM8 11.516V7.853"
        />
        <rect
          width="1.4"
          height="1.4"
          x="7.3"
          y="4.484"
          fill="currentColor"
          rx=".7"
        />
      </svg>
    );
  }
);
WindowInfoIcon.displayName = "WindowInfoIcon";

export const WindowTitleIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.667 4H3.333C2.597 4 2 4.497 2 5.111v7.778C2 13.503 2.597 14 3.333 14h9.334c.736 0 1.333-.498 1.333-1.111V5.11C14 4.497 13.403 4 12.667 4ZM4 2h8"
        />
      </svg>
    );
  }
);
WindowTitleIcon.displayName = "WindowTitleIcon";

export const WrapIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.49 2.237h-.98c-.542 0-.982.403-.982.9V6.07c0 .497.44.9.981.9h.982c.542 0 .981-.403.981-.9V3.137c0-.497-.44-.9-.981-.9ZM3.49 9.03h-.98c-.542 0-.982.403-.982.9v2.933c0 .497.44.9.981.9h.982c.542 0 .981-.403.981-.9V9.93c0-.497-.44-.9-.981-.9ZM8.49 2.237h-.98c-.542 0-.982.403-.982.9V6.07c0 .497.44.9.981.9h.982c.542 0 .981-.403.981-.9V3.137c0-.497-.44-.9-.981-.9ZM7 11.397H13.641a.862.862 0 0 0 .862-.862v0-5.173 0a.862.862 0 0 0-.862-.862H12m-5 6.897 2-2m-2 2 2 2"
        />
      </svg>
    );
  }
);
WrapIcon.displayName = "WrapIcon";

export const XAxisRotateIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 17"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.473 12.528c-.579 1.944-1.563 3.222-2.681 3.222-1.78 0-3.223-3.246-3.223-7.25s1.442-7.25 3.223-7.25c1.78 0 3.222 3.246 3.222 7.25"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.597 6.083 10.014 8.5l2.417-2.417"
        />
      </svg>
    );
  }
);
XAxisRotateIcon.displayName = "XAxisRotateIcon";

export const XAxisIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.636 2.68v8.275h8.275M2.09 14.502l3.546-3.547"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m12.134 8.591 2.364 2.364-2.364 2.365"
        />
      </svg>
    );
  }
);
XAxisIcon.displayName = "XAxisIcon";

export const XCircledFilledIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="currentColor"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 14.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Z"
        />
        <path
          stroke="#fff"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m5.333 10.667 5.334-5.334M10.667 10.667 5.333 5.333"
        />
      </svg>
    );
  }
);
XCircledFilledIcon.displayName = "XCircledFilledIcon";

export const XLogoIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fill="#000"
          d="M9.142 7.081 13.609 2H12.55L8.671 6.412 5.573 2H2l4.685 6.672L2 14h1.059l4.096-4.66L10.427 14H14L9.141 7.081Zm-1.45 1.65-.475-.665L3.44 2.78h1.626l3.048 4.266.475.664 3.962 5.546h-1.626L7.692 8.73Z"
        />
      </svg>
    );
  }
);
XLogoIcon.displayName = "XLogoIcon";

export const XSmallIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="#000"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m5.333 10.667 5.334-5.334M10.667 10.667 5.333 5.333"
        />
      </svg>
    );
  }
);
XSmallIcon.displayName = "XSmallIcon";

export const XIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.5 3 3 12.5M3 3l9.5 9.5"
        />
      </svg>
    );
  }
);
XIcon.displayName = "XIcon";

export const XmlIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.163 9.02v-4L8.83 1.686h-5.5A1.333 1.333 0 0 0 1.997 3.02v6"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8.164 2.186v1.667a1.333 1.333 0 0 0 1.333 1.333h2.667M1.997 11.314l3 3M4.997 11.314l-3 3M6.997 14.314v-3l1.5 1.523 1.5-1.523v3M12.163 11.314v3h1.84"
        />
      </svg>
    );
  }
);
XmlIcon.displayName = "XmlIcon";

export const YAxisRotateIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 17"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12.028 9.973c1.944-.579 3.222-1.563 3.222-2.681 0-1.78-3.246-3.223-7.25-3.223S.75 5.511.75 7.292c0 1.78 3.246 3.222 7.25 3.222"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.583 8.097 8 10.514 5.583 12.93"
        />
      </svg>
    );
  }
);
YAxisRotateIcon.displayName = "YAxisRotateIcon";

export const YAxisIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.636 2.68v8.275h8.275M2.09 14.502l3.546-3.547"
        />
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m3.272 3.862 2.364-2.364L8 3.862"
        />
      </svg>
    );
  }
);
YAxisIcon.displayName = "YAxisIcon";

export const Youtube1cIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          fillRule="evenodd"
          d="M13.47 3.299a1.771 1.771 0 0 1 1.238 1.263C15 5.675 15 8 15 8s0 2.325-.293 3.438a1.771 1.771 0 0 1-1.238 1.263C12.38 13 8 13 8 13s-4.378 0-5.47-.299a1.771 1.771 0 0 1-1.237-1.263C1 10.325 1 8 1 8s0-2.325.293-3.438A1.771 1.771 0 0 1 2.53 3.299C3.622 3 8 3 8 3s4.378 0 5.47.299Zm-3.232 4.7L6.6 10.144V5.857L10.238 8Z"
          clipRule="evenodd"
        />
      </svg>
    );
  }
);
Youtube1cIcon.displayName = "Youtube1cIcon";

export const YoutubeIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path d="M.892 11.528a18.047 18.047 0 0 1 0-7.482A1.496 1.496 0 0 1 1.94 3a37.082 37.082 0 0 1 12.12 0 1.497 1.497 0 0 1 1.048 1.047 18.046 18.046 0 0 1 0 7.482 1.497 1.497 0 0 1-1.048 1.048 37.077 37.077 0 0 1-12.12 0 1.497 1.497 0 0 1-1.048-1.048Z" />
        <path d="m6.5 10.3 4-2.4-4-2.4v4.8Z" />
      </svg>
    );
  }
);
YoutubeIcon.displayName = "YoutubeIcon";

export const ZAxisRotateIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 17"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14 9.28a5.993 5.993 0 0 1-2.007 3.736 6.04 6.04 0 0 1-7.962-.024 5.98 5.98 0 0 1-.988-7.867A6.025 6.025 0 0 1 6.526 2.69a6.049 6.049 0 0 1 4.23.462 6.01 6.01 0 0 1 2.868 3.129M14 2.53v3.75h-3.766"
        />
      </svg>
    );
  }
);
ZAxisRotateIcon.displayName = "ZAxisRotateIcon";

export const ZAxisIcon: IconComponent = forwardRef(
  ({ fill = "none", size = 16, ...props }, forwardedRef) => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        width={size}
        height={size}
        fill={fill}
        {...props}
        ref={forwardedRef}
      >
        <path
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5.636 2.09v8.274h8.275M2.09 13.91l3.546-3.546m-3.547 3.547h3.547m-3.547 0v-3.744"
        />
      </svg>
    );
  }
);
ZAxisIcon.displayName = "ZAxisIcon";
