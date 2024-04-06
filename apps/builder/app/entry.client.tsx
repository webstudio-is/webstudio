import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

startTransition(() => {
  if (document.documentElement.dataset.builder === "true") {
    hydrateRoot(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      document.getElementById("root")!,
      <StrictMode>
        <RemixBrowser />
      </StrictMode>
    );
    return;
  }

  // Do not hydrate canvas, to avoid hydration Errors in case of 3rd party plugins.
  // Just render it from scratch. (We don't have data on the Canvas at the server so no FOUC is possible)
  const root = createRoot(document as never);
  root.render(
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
