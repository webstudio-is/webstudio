import {
  appendFormDataToSearchParams,
  appendSystemSearch,
  getAllPages,
  getPagePath,
  getSystemSearch,
  isAbsoluteUrl,
} from "@webstudio-is/sdk";
import {
  compilePathnamePattern,
  tokenizePathnamePattern,
} from "@webstudio-is/project-build/runtime";
import { matchPathnameRoutes } from "@webstudio-is/wsauth";
import { toWebstudioParams } from "@webstudio-is/react-sdk";
import { $selectedPage } from "~/shared/nano-states";
import { selectPage } from "~/shared/nano-states";
import { $isPreviewMode, $selectedPageHash } from "~/shared/nano-states";
import { $pages } from "~/shared/sync/data-stores";
import { $currentSystem, updateCurrentSystem } from "~/shared/system";

const getSelectedPagePathname = () => {
  const pages = $pages.get();
  const page = $selectedPage.get();
  if (page && pages) {
    const tokens = tokenizePathnamePattern(getPagePath(page.id, pages));
    const system = $currentSystem.get();
    return compilePathnamePattern(tokens, system.params);
  }
};

export const switchPageAndUpdateSystem = (
  href: string,
  {
    formData,
    controlNames,
    includeFallback = true,
  }: {
    formData?: FormData;
    controlNames?: Iterable<string>;
    includeFallback?: boolean;
  } = {}
) => {
  const pages = $pages.get();
  if (pages === undefined) {
    return false;
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
      const searchParams = new URLSearchParams();
      appendSystemSearch(searchParams, system.search);
      href = `${pathname}?${searchParams}${href}`;
    }
  }
  const pageHref = new URL(href, "https://any-valid.url");
  const matchedPage = matchPathnameRoutes(
    getAllPages(pages).map((page) => ({
      pattern: getPagePath(page.id, pages),
      value: page,
    })),
    pageHref.pathname
  );
  if (matchedPage) {
    const { value: page, params } = matchedPage;
    if (
      includeFallback === false &&
      (page.meta.status === "404" ||
        getPagePath(page.id, pages) === "/*" ||
        getPagePath(page.id, pages) === "*")
    ) {
      return false;
    }
    // populate search params with form data values if available
    if (formData) {
      appendFormDataToSearchParams(
        pageHref.searchParams,
        formData,
        controlNames ?? []
      );
    }
    const search = getSystemSearch(pageHref.searchParams);
    $selectedPageHash.set({ hash: pageHref.hash });
    selectPage(page.id);
    updateCurrentSystem({
      params: toWebstudioParams(getPagePath(page.id, pages), params),
      search: search.search,
    });
    return true;
  }
  return false;
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
      if (form.hasAttribute("data-ws-managed-form-id")) {
        // NativeForm handles managed submissions and their feedback in Preview.
        return;
      }
      // use attribute instead of form.action to get raw unresolved value
      // https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#dom-fs-action
      const action = form.getAttribute("action") ?? "";
      // lower case just for safety
      const method = form.method.toLowerCase();
      if (method === "get" && isAbsoluteUrl(action) === false) {
        const formData =
          event.submitter === null
            ? new FormData(form)
            : new FormData(form, event.submitter);
        const controlNames = Array.from(form.elements, (control) =>
          control.getAttribute("name")
        ).filter((name): name is string => Boolean(name));
        switchPageAndUpdateSystem(action, { formData, controlNames });
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
