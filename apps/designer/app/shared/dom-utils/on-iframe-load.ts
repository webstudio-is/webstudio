/**
 * Resolve a promise when an iframe has readyState complete.
 * Checks periodically for the readyState to be complete, because somttimes the load event may simply not fire for various reasons.
 */
export const onLoad = (iframe: HTMLIFrameElement) =>
  new Promise((resolve) => {
    if (iframe === null) return;
    const check = () => {
      const document = iframe.contentDocument || iframe.contentWindow?.document;
      if (document?.readyState === "complete") {
        clearInterval(intervalId);
        resolve("complete");
      }
    };
    iframe.addEventListener("load", check);
    const intervalId = setInterval(check, 100);
  });
