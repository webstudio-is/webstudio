/**
 * @vitest-environment jsdom
 */
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { HeadSlot } from "./head-slot";
import { JsonLd } from "./json-ld";

afterEach(cleanup);

test("renders JSON-LD in the document head when nested in Head Slot", async () => {
  const { container } = render(
    <HeadSlot>
      <JsonLd code={{ "@context": "https://schema.org", name: "Acme" }} />
    </HeadSlot>
  );

  await waitFor(() => {
    expect(
      document.head.querySelector('script[type="application/ld+json"]')
    ).not.toBeNull();
  });
  expect(
    container.querySelector('script[type="application/ld+json"]')
  ).toBeNull();
});

test("keeps JSON-LD in page flow when it is outside Head Slot", () => {
  const { container } = render(
    <JsonLd code={{ "@context": "https://schema.org", name: "Acme" }} />
  );

  expect(
    container.querySelector('script[type="application/ld+json"]')
  ).not.toBeNull();
  expect(
    document.head.querySelector('script[type="application/ld+json"]')
  ).toBeNull();
});
