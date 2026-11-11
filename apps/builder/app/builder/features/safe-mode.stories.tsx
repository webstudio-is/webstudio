import { useEffect } from "react";
import { SafeModeButton } from "./safe-mode";

export default { title: "Builder/Safe mode", component: SafeModeButton };

// Open the iframe story with `safemode=true`; builderApi reads it at module load.
export const Active = () => {
  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("safemode") !== "true"
    ) {
      return;
    }
    const open = () => {
      const button = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Safe mode active"]'
      );
      if (button) {
        observer.disconnect();
        button.click();
      }
    };
    const observer = new MutationObserver(open);
    observer.observe(document.body, { childList: true, subtree: true });
    open();
    return () => observer.disconnect();
  }, []);
  return <SafeModeButton />;
};
