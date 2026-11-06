import { expect } from "@playwright/test";
import type { SerializedPages } from "@webstudio-is/project-migrations/pages";
import type { Instance, Prop, StyleDecl } from "@webstudio-is/sdk";
import { test } from "../test";
import { createSeededBuilderProject } from "../fixtures/builder-project";
import { loginWithSecret } from "../flows/dashboard";
import { openProjectBuilder } from "../flows/builder";

test("Builder Preview restores navigation scroll without consuming entry animations", async ({
  page,
  context,
}) => {
  const email = "preview-scroll-6633@webstudio.test";
  const fixture = await createSeededBuilderProject({
    context,
    email,
    title: "Preview scroll 6633",
    builderToken: "preview-scroll-6633-builder",
    createBuildUpdate: (build) => {
      const pages = JSON.parse(build.pages) as SerializedPages;
      const home = pages.pages.find(({ id }) => id === pages.homePageId)!;
      home.rootInstanceId = "scroll-home-body";
      pages.pages.push({
        id: "scroll-other-page",
        name: "Other",
        path: "/other",
        title: '"Other"',
        meta: {},
        rootInstanceId: "scroll-other-body",
      });
      pages.folders
        .find(({ id }) => id === pages.rootFolderId)!
        .children.push("scroll-other-page");
      const instances: Instance[] = [];
      const props: Prop[] = [];
      const styles: StyleDecl[] = [];
      const breakpointId = JSON.parse(build.breakpoints)[0].id;
      const style = (
        id: string,
        property: StyleDecl["property"],
        value: StyleDecl["value"]
      ) =>
        styles.push({
          styleSourceId: `style-${id}`,
          breakpointId,
          property,
          value,
        });
      for (const name of ["home", "other"]) {
        const bodyId = `scroll-${name}-body`;
        const navId = `scroll-${name}-nav`;
        const body: Instance = {
          type: "instance",
          id: bodyId,
          component: "Body",
          children: [{ type: "id", value: navId }],
        };
        instances.push(body, {
          type: "instance",
          id: navId,
          component: "Link",
          children: [
            {
              type: "text",
              value: name === "home" ? "Visit other" : "Home logo",
            },
          ],
        });
        props.push({
          id: `${navId}-href`,
          instanceId: navId,
          type: "string",
          name: "href",
          value: name === "home" ? "/other" : "/",
        });
        style(bodyId, "scrollBehavior", { type: "keyword", value: "smooth" });
        style(navId, "position", { type: "keyword", value: "fixed" });
        style(navId, "top", { type: "unit", value: 0, unit: "px" });
        style(navId, "zIndex", { type: "unit", unit: "number", value: 100 });
        if (name === "home") {
          for (const [id, label, href, top] of [
            ["jump", "Jump to section", "#home-section-3", 30],
            ["revisit", "Revisit home", "/", 60],
          ] as const) {
            const linkId = `scroll-home-${id}`;
            body.children.push({ type: "id", value: linkId });
            instances.push({
              type: "instance",
              id: linkId,
              component: "Link",
              children: [{ type: "text", value: label }],
            });
            props.push({
              id: `${linkId}-href`,
              instanceId: linkId,
              name: "href",
              type: "string",
              value: href,
            });
            style(linkId, "position", { type: "keyword", value: "fixed" });
            style(linkId, "top", { type: "unit", unit: "px", value: top });
            style(linkId, "zIndex", {
              type: "unit",
              unit: "number",
              value: 100,
            });
          }
        }
        for (let index = 0; index < 7; index += 1) {
          const animationId = `scroll-${name}-animation-${index}`;
          const sectionId = `scroll-${name}-section-${index}`;
          body.children.push({ type: "id", value: animationId });
          instances.push(
            {
              type: "instance",
              id: animationId,
              component:
                "@webstudio-is/sdk-components-animation:AnimateChildren",
              children: [{ type: "id", value: sectionId }],
            },
            {
              type: "instance",
              id: sectionId,
              component: "ws:element",
              tag: "section",
              children: [{ type: "text", value: `${name} section ${index}` }],
            }
          );
          props.push({
            id: `${sectionId}-id`,
            instanceId: sectionId,
            type: "string",
            name: "id",
            value: `${name}-section-${index}`,
          });
          props.push({
            id: `${animationId}-action`,
            instanceId: animationId,
            name: "action",
            type: "animationAction",
            value: {
              type: "view",
              animations: [
                {
                  name: "Entry 6633",
                  timing: {
                    duration: { type: "unit", value: 100, unit: "ms" },
                    fill: "forwards",
                    rangeStart: [
                      "entry",
                      { type: "unit", value: 0, unit: "%" },
                    ],
                  },
                  keyframes: [
                    {
                      offset: 0,
                      styles: {
                        opacity: { type: "unit", unit: "number", value: 0 },
                      },
                    },
                    {
                      offset: 1,
                      styles: {
                        opacity: { type: "unit", unit: "number", value: 1 },
                      },
                    },
                  ],
                },
              ],
            },
          });
          style(sectionId, "height", { type: "unit", value: 600, unit: "px" });
        }
      }
      const styleIds = [
        ...new Set(styles.map(({ styleSourceId }) => styleSourceId)),
      ];
      return {
        pages: JSON.stringify(pages),
        instances: JSON.stringify(instances),
        props: JSON.stringify(props),
        styles: JSON.stringify(styles),
        styleSources: JSON.stringify(
          styleIds.map((id) => ({ type: "local", id }))
        ),
        styleSourceSelections: JSON.stringify(
          styleIds.map((id) => ({
            instanceId: id.slice("style-".length),
            values: [id],
          }))
        ),
      };
    },
  });
  await loginWithSecret({ page, email });
  const canvas = await openProjectBuilder({
    page,
    projectId: fixture.projectId,
    authToken: fixture.builderToken,
  });
  const preview = page.getByRole("button", {
    name: "Toggle preview",
    exact: true,
  });
  await preview.click();
  await expect(preview).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("mode"))
    .toBe("preview");
  await expect(
    canvas.getByText("home section 0", { exact: true })
  ).toBeVisible();
  await canvas.addStyleTag({ content: "html { scroll-behavior: smooth; }" });
  await canvas.getByRole("link", { name: "Visit other", exact: true }).click();
  await expect(
    canvas.getByText("other section 0", { exact: true })
  ).toBeVisible();
  await canvas.evaluate(() =>
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "instant",
    })
  );
  await expect.poll(() => canvas.evaluate(() => scrollY)).toBeGreaterThan(3000);
  const otherPosition = await canvas.evaluate(() => scrollY);
  const recording = canvas.evaluate(async () => {
    const frames: Array<{
      y: number;
      body: string | null;
      animations: Array<{
        target: string;
        state: AnimationPlayState;
        timeline: string;
        currentTime: string;
      }>;
    }> = [];
    for (let frame = 0; frame < 90; frame += 1) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );
      frames.push({
        y: scrollY,
        body: document.body.getAttribute("data-ws-id"),
        animations: document.getAnimations().map((animation) => ({
          target:
            (
              (animation.effect as KeyframeEffect | null)
                ?.target as HTMLElement | null
            )?.id ?? "",
          state: animation.playState,
          timeline: animation.timeline?.constructor.name ?? "",
          currentTime: String(animation.currentTime),
        })),
      });
    }
    return frames;
  });
  await canvas.getByRole("link", { name: "Home logo", exact: true }).click();
  await expect(
    canvas.locator('body[data-ws-id="scroll-home-body"]')
  ).toBeAttached();
  const frames = await recording;
  const homeFrames = frames.filter(({ body }) => body === "scroll-home-body");
  const offscreenIds = new Set([
    "home-section-2",
    "home-section-3",
    "home-section-4",
    "home-section-5",
    "home-section-6",
  ]);
  expect([...new Set(homeFrames.map(({ y }) => y))]).toEqual([0]);
  expect(
    homeFrames
      .flatMap(({ animations }) => animations)
      .some(
        ({ target, timeline }) =>
          offscreenIds.has(target) && timeline === "DocumentTimeline"
      )
  ).toBe(false);
  await page.goBack();
  await expect(
    canvas.locator('body[data-ws-id="scroll-other-body"]')
  ).toBeAttached();
  await expect.poll(() => canvas.evaluate(() => scrollY)).toBe(otherPosition);
  await page.goForward();
  await expect(
    canvas.locator('body[data-ws-id="scroll-home-body"]')
  ).toBeAttached();
  await expect.poll(() => canvas.evaluate(() => scrollY)).toBe(0);
  const anchorRecording = canvas.evaluate(async () => {
    const samples: number[] = [];
    for (let frame = 0; frame < 90; frame += 1) {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve())
      );
      samples.push(scrollY);
    }
    return samples;
  });
  await canvas
    .getByRole("link", { name: "Jump to section", exact: true })
    .click();
  const samples = await anchorRecording;
  expect(new Set(samples).size).toBeGreaterThan(2);
  await expect
    .poll(() =>
      canvas
        .locator("#home-section-3")
        .evaluate((element) => Math.round(element.getBoundingClientRect().top))
    )
    .toBe(0);
  const anchorPosition = await canvas.evaluate(() => scrollY);
  const anchorHistoryLength = await page.evaluate(() => history.length);
  await canvas.evaluate(() =>
    window.scrollTo({ top: 900, behavior: "instant" })
  );
  await canvas
    .getByRole("link", { name: "Jump to section", exact: true })
    .click();
  await expect.poll(() => canvas.evaluate(() => scrollY)).toBe(anchorPosition);
  expect(await page.evaluate(() => history.length)).toBe(anchorHistoryLength);
  await page.goBack();
  await expect.poll(() => canvas.evaluate(() => scrollY)).toBe(0);
  await page.goForward();
  await expect.poll(() => canvas.evaluate(() => scrollY)).toBe(anchorPosition);
  await canvas.getByRole("link", { name: "Revisit home", exact: true }).click();
  await expect.poll(() => canvas.evaluate(() => scrollY)).toBe(0);
  await canvas.evaluate(async () => {
    window.scrollTo({ top: 900, behavior: "instant" });
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );
  });
  await preview.click();
  await expect(preview).toHaveAttribute("aria-pressed", "false");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("mode"))
    .toBeNull();
  await canvas.evaluate(() =>
    window.scrollTo({ top: 100, behavior: "instant" })
  );
  await page.goBack();
  await expect(preview).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => canvas.evaluate(() => scrollY)).toBe(900);
  await page.goForward();
  await expect(preview).toHaveAttribute("aria-pressed", "false");
  await preview.click();
  await expect(preview).toHaveAttribute("aria-pressed", "true");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("mode"))
    .toBe("preview");
});
