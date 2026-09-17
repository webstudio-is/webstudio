import { css } from "@webstudio-is/template";

export const markdownAlertStyle = css`
  padding: 16px;
  border-radius: 8px;
  &[data-state="note"] {
    background-color: #eff6ff;
  }
  &[data-state="tip"] {
    background-color: #ecfdf5;
  }
  &[data-state="important"] {
    background-color: #eef2ff;
  }
  &[data-state="warning"] {
    background-color: #fef3c7;
  }
  &[data-state="caution"] {
    background-color: #fee2e2;
  }
`;
