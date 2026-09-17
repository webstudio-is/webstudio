import { css } from "@webstudio-is/template";

export const alertStyle = css`
  padding: 16px;
  border-radius: 8px;
  &[data-state="note"] {
    background-color: #eff6ff;
  }
  &[data-state="tip"] {
    background-color: #ecfeff;
  }
  &[data-state="important"] {
    background-color: #eef2ff;
  }
  &[data-state="warning"] {
    background-color: #f5f3ff;
  }
  &[data-state="caution"] {
    background-color: #faf5ff;
  }
`;
