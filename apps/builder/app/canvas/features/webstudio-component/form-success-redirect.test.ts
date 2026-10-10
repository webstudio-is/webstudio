import { expect, test, vi } from "vitest";
import { navigatePreviewFormSuccess } from "./form-success-redirect";

test("internal Preview success redirects switch pages", () => {
  const navigateInternal = vi.fn(() => true);
  const navigateExternal = vi.fn();
  const redirected = navigatePreviewFormSuccess(
    "/thanks?sent=1#done",
    "https://builder.example/contact",
    navigateInternal,
    navigateExternal
  );
  expect(navigateInternal).toHaveBeenCalledWith("/thanks?sent=1#done");
  expect(navigateExternal).not.toHaveBeenCalled();
  expect(redirected).toBe(true);
});

test("relative Preview success redirect uses the Preview page path", () => {
  const navigateInternal = vi.fn(() => true);
  const navigateExternal = vi.fn();
  navigatePreviewFormSuccess(
    "thanks",
    "https://webstudio.local/contact?source=preview",
    navigateInternal,
    navigateExternal
  );
  expect(navigateInternal).toHaveBeenCalledExactlyOnceWith("/thanks");
  expect(navigateExternal).not.toHaveBeenCalled();
});

test("unmatched internal Preview redirect reports that navigation did not happen", () => {
  const navigateInternal = vi.fn(() => false);
  const navigateExternal = vi.fn();
  expect(
    navigatePreviewFormSuccess(
      "/missing",
      "https://webstudio.local/contact",
      navigateInternal,
      navigateExternal
    )
  ).toBe(false);
  expect(navigateInternal).toHaveBeenCalledExactlyOnceWith("/missing");
  expect(navigateExternal).not.toHaveBeenCalled();
});

test.each([
  "https://other.example/thanks",
  "mailto:team@example.com",
  "tel:+15550123",
])(
  "external Preview success redirect %s uses current-frame navigation",
  (target) => {
    const navigateInternal = vi.fn(() => true);
    const navigateExternal = vi.fn();
    const redirected = navigatePreviewFormSuccess(
      target,
      "https://builder.example/contact",
      navigateInternal,
      navigateExternal
    );
    expect(navigateInternal).not.toHaveBeenCalled();
    expect(navigateExternal).toHaveBeenCalledWith(target);
    expect(redirected).toBe(true);
  }
);
