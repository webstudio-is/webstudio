import { getPagePath, isAbsoluteUrl } from "@webstudio-is/sdk";
import {
  compilePathnamePattern,
  matchPathnamePattern,
  tokenizePathnamePattern,
} from "~/builder/shared/url-pattern";
import { $selectedPage, selectPage } from "~/shared/awareness";
import {
  $isPreviewMode,
  $pages,
  $selectedPageHash,
} from "~/shared/nano-states";
import { $currentSystem, updateCurrentSystem } from "~/shared/system";
import { comparePatterns } from "./shared/routing-priority";

const getSelectedPagePathname = () => {
  const pages = $pages.get();
  const page = $selectedPage.get();
  if (page && pages) {
    const tokens = tokenizePathnamePattern(getPagePath(page.id, pages));
    const system = $currentSystem.get();
    return compilePathnamePattern(tokens, system.params);
  }
};

const switchPageAndUpdateSystem = (href: string, formData?: FormData) => {
  const pages = $pages.get();
  if (pages === undefined) {
    return;
  }
  // preserve pathname when not specified in href/action
  if (href === "" || href.startsWith("?")) {
    const pathname = getSelectedPagePathname();
    if (pathname) {
      href = `${pathname}${href}`;
    }
  }
  // preserve also search params when navigate with hash
  if (href.startsWith("#")) {
    const pathname = getSelectedPagePathname();
    if (pathname) {
      const system = $currentSystem.get();
      const searchParams = new URLSearchParams(
        system.search as Record<string, string>
      );
      href = `${pathname}?${searchParams}${href}`;
    }
  }
  const pageHref = new URL(href, "https://any-valid.url");
  // sort pages before matching to not depend on order of page creation
  const sortedPages = [pages.homePage, ...pages.pages].toSorted(
    (leftPage, rightPage) => comparePatterns(leftPage.path, rightPage.path)
  );
  for (const page of sortedPages) {
    const pagePath = getPagePath(page.id, pages);
    const params = matchPathnamePattern(pagePath, pageHref.pathname);
    if (params) {
      // populate search params with form data values if available
      if (formData) {
        for (const [key, value] of formData.entries()) {
          pageHref.searchParams.set(key, value.toString());
        }
      }
      const search = Object.fromEntries(pageHref.searchParams);
      $selectedPageHash.set({ hash: pageHref.hash });
      selectPage(page.id);
      updateCurrentSystem({ params, search });
      break;
    }
  }
};

export const subscribeInterceptedEvents = () => {
  const handleClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const isPreviewMode = $isPreviewMode.get();

    // Prevent forwarding the click event on an input element when the associated label has a "for" attribute
    // and prevent checkbox or radio inputs changing when clicked
    if (event.target.closest("label[for]") || event.target.closest("input")) {
      if (isPreviewMode) {
        return;
      }
      event.preventDefault();
    }

    const a = event.target.closest("a");
    if (a) {
      if (isPreviewMode) {
        // use attribute instead of a.href to get raw unresolved value
        const href = a.getAttribute("href") ?? "";
        if (isAbsoluteUrl(href)) {
          window.open(href, "_blank");
          // relative paths can be safely downloaded
        } else if (a.hasAttribute("download")) {
          return;
        } else {
          switchPageAndUpdateSystem(href);
        }
        event.preventDefault();
        return;
      }
      event.preventDefault();
    }
    // prevent invoking submit with buttons in canvas mode
    // because form with prevented submit still invokes validation
    if (event.target.closest("button")) {
      if (isPreviewMode) {
        return;
      }
      event.preventDefault();
    }
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    const isPreviewMode = $isPreviewMode.get();

    if (event.target.closest("select")) {
      if (isPreviewMode) {
        return;
      }
      event.preventDefault();
    }
  };

  const handleSubmit = (event: SubmitEvent) => {
    if ($isPreviewMode.get()) {
      const form =
        event.target instanceof HTMLFormElement ? event.target : undefined;
      if (form === undefined) {
        return;
      }
      // use attribute instead of form.action to get raw unresolved value
      // https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fs-action
      const action = form.getAttribute("action") ?? "";
      // lower case just for safety
      const method = form.method.toLowerCase();
      if (method === "get" && isAbsoluteUrl(action) === false) {
        switchPageAndUpdateSystem(action, new FormData(form));
      }
    }
    // prevent submitting the form when clicking a button type submit
    event.preventDefault();
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    if ($isPreviewMode.get()) {
      return;
    }
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      // prevent typing in inputs only in canvas mode
      event.preventDefault();
    }
  };

  // Note: Event handlers behave unexpectedly when used inside a dialog component.
  // In Dialogs, React intercepts and processes events before they reach our handlers.
  // To ensure consistent behavior across all components, we're using event capturing.
  // This allows us to intercept events before React gets a chance to handle them.
  document.documentElement.addEventListener("click", handleClick, {
    capture: true,
  });
  document.documentElement.addEventListener("submit", handleSubmit, {
    capture: true,
  });

  document.documentElement.addEventListener("keydown", handleKeydown);

  document.documentElement.addEventListener("pointerdown", handlePointerDown);

  return () => {
    document.documentElement.removeEventListener(
      "pointerdown",
      handlePointerDown
    );
    document.documentElement.removeEventListener("click", handleClick, {
      capture: true,
    });
    document.documentElement.removeEventListener("submit", handleSubmit, {
      capture: true,
    });
    document.documentElement.removeEventListener("keydown", handleKeydown);
  };
};
