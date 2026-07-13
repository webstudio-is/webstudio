import { builderApi } from "./builder-api";

const clipboardReadErrorMessage =
  "Webstudio cannot read the clipboard. Allow clipboard access in your browser, then try again.";

export const readClipboardText = async () => {
  try {
    return await navigator.clipboard.readText();
  } catch {
    builderApi.toast.error(clipboardReadErrorMessage);
  }
};
