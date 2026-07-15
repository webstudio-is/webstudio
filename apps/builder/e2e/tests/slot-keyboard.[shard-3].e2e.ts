import type { Frame, Page } from "playwright";
import {
  getCanvasInstance,
  getCanvasInstanceSelector,
  openProjectBuilder,
} from "../flows/builder";
import { openNavigatorPanel } from "../flows/navigator";
import { waitForSyncStatus } from "../flows/sync-status";
import {
  createSlotKeyboardProject,
  type SeededSlotKeyboardProject,
} from "../fixtures/slot-keyboard-project";
import { newIsolatedPage, test } from "../harness";
import { measure } from "../perf";

let fixture: SeededSlotKeyboardProject;
let detachFixture: SeededSlotKeyboardProject;
let navigatorFixture: SeededSlotKeyboardProject;
let navigatorOutdentFixture: SeededSlotKeyboardProject;
let topChildFixture: SeededSlotKeyboardProject;
let bottomChildFixture: SeededSlotKeyboardProject;
let navigatorTopChildFixture: SeededSlotKeyboardProject;
let navigatorBottomChildFixture: SeededSlotKeyboardProject;
let multiSelectFixture: SeededSlotKeyboardProject;

const slotASelector = getCanvasInstanceSelector([
  "slot-keyboard-slot-a",
  "slot-keyboard-wrapper",
  "slot-keyboard-body",
]);

const expectCanvasInstanceVisible = async ({
  canvas,
  instanceSelector,
}: {
  canvas: Frame;
  instanceSelector: string[];
}) => {
  await getCanvasInstance({ canvas, instanceSelector }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
};

test.beforeAll(async () => {
  fixture = await createSlotKeyboardProject();
  detachFixture = await createSlotKeyboardProject({
    email: "slot-keyboard-detach-e2e@webstudio.test",
    title: "Slot Keyboard Detach E2E",
    builderToken: "slot-keyboard-detach-e2e-builder-token",
  });
  navigatorFixture = await createSlotKeyboardProject({
    email: "slot-keyboard-navigator-e2e@webstudio.test",
    title: "Slot Keyboard Navigator E2E",
    builderToken: "slot-keyboard-navigator-e2e-builder-token",
  });
  navigatorOutdentFixture = await createSlotKeyboardProject({
    email: "slot-keyboard-navigator-outdent-e2e@webstudio.test",
    title: "Slot Keyboard Navigator Outdent E2E",
    builderToken: "slot-keyboard-navigator-outdent-e2e-builder-token",
  });
  topChildFixture = await createSlotKeyboardProject({
    email: "slot-keyboard-top-child-e2e@webstudio.test",
    title: "Slot Keyboard Top Child E2E",
    builderToken: "slot-keyboard-top-child-e2e-builder-token",
  });
  bottomChildFixture = await createSlotKeyboardProject({
    email: "slot-keyboard-bottom-child-e2e@webstudio.test",
    title: "Slot Keyboard Bottom Child E2E",
    builderToken: "slot-keyboard-bottom-child-e2e-builder-token",
  });
  navigatorTopChildFixture = await createSlotKeyboardProject({
    email: "slot-keyboard-navigator-top-child-e2e@webstudio.test",
    title: "Slot Keyboard Navigator Top Child E2E",
    builderToken: "slot-keyboard-navigator-top-child-e2e-builder-token",
  });
  navigatorBottomChildFixture = await createSlotKeyboardProject({
    email: "slot-keyboard-navigator-bottom-child-e2e@webstudio.test",
    title: "Slot Keyboard Navigator Bottom Child E2E",
    builderToken: "slot-keyboard-navigator-bottom-child-e2e-builder-token",
  });
  multiSelectFixture = await createSlotKeyboardProject({
    email: "slot-keyboard-navigator-multi-select-e2e@webstudio.test",
    title: "Slot Keyboard Multi Select E2E",
    builderToken: "slot-keyboard-navigator-multi-select-e2e-builder-token",
  });
});

const expectCanvasInstancePrecedes = async ({
  canvas,
  beforeSelector,
  afterSelector,
}: {
  canvas: Frame;
  beforeSelector: string[];
  afterSelector: string[];
}) => {
  const beforeLocator = getCanvasInstance({
    canvas,
    instanceSelector: beforeSelector,
  });
  const afterLocator = getCanvasInstance({
    canvas,
    instanceSelector: afterSelector,
  });
  await beforeLocator.waitFor({ state: "visible", timeout: 30_000 });
  await afterLocator.waitFor({ state: "visible", timeout: 30_000 });
  const precedes = await beforeLocator.evaluate((beforeElement, after) => {
    const afterElement = document.querySelector(after);
    if (afterElement === null) {
      return false;
    }
    return Boolean(
      beforeElement.compareDocumentPosition(afterElement) &
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  }, getCanvasInstanceSelector(afterSelector));
  if (precedes === false) {
    throw new Error(
      `Expected ${beforeSelector.join(",")} to precede ${afterSelector.join(",")}`
    );
  }
};

const getFocusedTreeButtonText = async ({ page }: { page: Page }) => {
  return await page.evaluate(() => {
    const activeElement = document.activeElement;
    if (activeElement?.hasAttribute("data-tree-button") === false) {
      return;
    }
    return activeElement?.textContent?.trim();
  });
};

const getSelectedTreeButtonTexts = async ({ page }: { page: Page }) => {
  return await page
    .locator("[data-tree-button][aria-selected='true']")
    .evaluateAll((buttons) =>
      buttons.map((button) => button.textContent?.trim() ?? "")
    );
};

const expectSelectedTreeButtonTexts = async ({
  page,
  expectedTexts,
}: {
  page: Page;
  expectedTexts: string[];
}) => {
  await page.waitForFunction(
    (expected) => {
      const selectedTexts = Array.from(
        document.querySelectorAll("[data-tree-button][aria-selected='true']")
      ).map((button) => button.textContent?.trim() ?? "");
      return (
        selectedTexts.length === expected.length &&
        expected.every((expectedText) =>
          selectedTexts.some((selectedText) =>
            selectedText.includes(expectedText)
          )
        )
      );
    },
    expectedTexts,
    { timeout: 10_000 }
  );
};

test("Keyboard shortcut moves a shared slot child into the previous sibling", async () => {
  const { page, close } = await newIsolatedPage();

  try {
    const canvas = await measure("slot keyboard open builder", async () => {
      return await openProjectBuilder({
        page,
        projectId: fixture.projectId,
        authToken: fixture.builderToken,
      });
    });

    const headingSelector = [
      "slot-keyboard-heading",
      "slot-keyboard-fragment",
      "slot-keyboard-slot-a",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    await expectCanvasInstanceVisible({
      canvas,
      instanceSelector: headingSelector,
    });
    await getCanvasInstance({
      canvas,
      instanceSelector: headingSelector,
    }).click();

    await page.keyboard.press("Control+ArrowRight");
    await waitForSyncStatus({ page, status: "idle" });

    await expectCanvasInstanceVisible({
      canvas,
      instanceSelector: [
        "slot-keyboard-heading",
        "slot-keyboard-div",
        "slot-keyboard-fragment",
        "slot-keyboard-slot-a",
        "slot-keyboard-wrapper",
        "slot-keyboard-body",
      ],
    });
    await expectCanvasInstanceVisible({
      canvas,
      instanceSelector: [
        "slot-keyboard-heading",
        "slot-keyboard-div",
        "slot-keyboard-fragment",
        "slot-keyboard-slot-b",
        "slot-keyboard-wrapper",
        "slot-keyboard-body",
      ],
    });
  } finally {
    await close();
  }
});

test("Keyboard shortcut keeps Navigator arrows working after outdenting a row", async () => {
  const { page, close } = await newIsolatedPage();

  try {
    const canvas = await measure(
      "slot keyboard navigator outdent open builder",
      async () => {
        return await openProjectBuilder({
          page,
          projectId: navigatorOutdentFixture.projectId,
          authToken: navigatorOutdentFixture.builderToken,
        });
      }
    );

    const slotAHeadingSelector = [
      "slot-keyboard-heading",
      "slot-keyboard-fragment",
      "slot-keyboard-slot-a",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    await getCanvasInstance({
      canvas,
      instanceSelector: slotAHeadingSelector,
    }).click();
    await openNavigatorPanel({ page });
    await page.getByRole("button", { name: "Slot Heading" }).first().click();

    await page.keyboard.press("Control+ArrowLeft");
    await waitForSyncStatus({ page, status: "idle" });

    const focusedTextAfterMove = await getFocusedTreeButtonText({ page });
    if (focusedTextAfterMove?.includes("Slot Heading") !== true) {
      throw new Error(
        `Expected moved Navigator row to keep focus, received ${focusedTextAfterMove}`
      );
    }

    await page.keyboard.press("ArrowUp");
    const focusedTextAfterArrow = await getFocusedTreeButtonText({ page });
    if (
      focusedTextAfterArrow === undefined ||
      focusedTextAfterArrow === focusedTextAfterMove
    ) {
      throw new Error(
        `Expected ArrowUp to move Navigator focus from ${focusedTextAfterMove}, received ${focusedTextAfterArrow}`
      );
    }
  } finally {
    await close();
  }
});

test("Shift+ArrowDown in Navigator selects exactly one additional row", async () => {
  const { page, close } = await newIsolatedPage();

  try {
    const canvas = await measure(
      "slot keyboard navigator multi-select open builder",
      async () => {
        return await openProjectBuilder({
          page,
          projectId: multiSelectFixture.projectId,
          authToken: multiSelectFixture.builderToken,
        });
      }
    );

    const slotADivSelector = [
      "slot-keyboard-div",
      "slot-keyboard-fragment",
      "slot-keyboard-slot-a",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    await getCanvasInstance({
      canvas,
      instanceSelector: slotADivSelector,
    }).click();
    await openNavigatorPanel({ page });
    await page.getByRole("button", { name: "Drop Div" }).first().click();
    await expectSelectedTreeButtonTexts({
      page,
      expectedTexts: ["Drop Div"],
    });

    await page.keyboard.press("Shift+ArrowDown");

    await expectSelectedTreeButtonTexts({
      page,
      expectedTexts: ["Drop Div", "Slot Heading"],
    });
    const focusedText = await getFocusedTreeButtonText({ page });
    if (focusedText?.includes("Slot Heading") !== true) {
      throw new Error(
        `Expected Shift+ArrowDown to focus Slot Heading, received ${focusedText}`
      );
    }
  } finally {
    await close();
  }
});

test("Control/Command+A after canvas selection selects sibling rows", async () => {
  const { page, close } = await newIsolatedPage();

  try {
    const canvas = await measure(
      "slot keyboard canvas multi-select open builder",
      async () => {
        return await openProjectBuilder({
          page,
          projectId: multiSelectFixture.projectId,
          authToken: multiSelectFixture.builderToken,
        });
      }
    );

    const slotAHeadingSelector = [
      "slot-keyboard-heading",
      "slot-keyboard-fragment",
      "slot-keyboard-slot-a",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    await getCanvasInstance({
      canvas,
      instanceSelector: slotAHeadingSelector,
    }).click();

    await page.keyboard.press("Control+A");

    await openNavigatorPanel({ page });
    await expectSelectedTreeButtonTexts({
      page,
      expectedTexts: ["Drop Div", "Slot Heading"],
    });

    const selectedTexts = await getSelectedTreeButtonTexts({ page });
    if (selectedTexts.some((selectedText) => selectedText.includes("Slot A"))) {
      throw new Error(
        `Expected Command+A to select only siblings, received ${selectedTexts.join(", ")}`
      );
    }
  } finally {
    await close();
  }
});

test("Keyboard shortcut moves a direct shared slot child out of all slot occurrences", async () => {
  const { page, close } = await newIsolatedPage();

  try {
    const canvas = await measure(
      "slot keyboard detach open builder",
      async () => {
        return await openProjectBuilder({
          page,
          projectId: detachFixture.projectId,
          authToken: detachFixture.builderToken,
        });
      }
    );

    const slotAHeadingSelector = [
      "slot-keyboard-heading",
      "slot-keyboard-fragment",
      "slot-keyboard-slot-a",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    await expectCanvasInstanceVisible({
      canvas,
      instanceSelector: slotAHeadingSelector,
    });
    await getCanvasInstance({
      canvas,
      instanceSelector: slotAHeadingSelector,
    }).click();

    await page.keyboard.press("Control+ArrowLeft");
    await waitForSyncStatus({ page, status: "idle" });

    await getCanvasInstance({
      canvas,
      instanceSelector: slotAHeadingSelector,
    }).waitFor({ state: "hidden", timeout: 30_000 });
    await getCanvasInstance({
      canvas,
      instanceSelector: [
        "slot-keyboard-heading",
        "slot-keyboard-fragment",
        "slot-keyboard-slot-b",
        "slot-keyboard-wrapper",
        "slot-keyboard-body",
      ],
    }).waitFor({ state: "hidden", timeout: 30_000 });

    await expectCanvasInstanceVisible({
      canvas,
      instanceSelector: [
        "slot-keyboard-heading",
        "slot-keyboard-wrapper",
        "slot-keyboard-body",
      ],
    });
  } finally {
    await close();
  }
});

test("Keyboard shortcut moves the first shared slot child above all slot occurrences", async () => {
  const { page, close } = await newIsolatedPage();

  try {
    const canvas = await measure(
      "slot keyboard top child open builder",
      async () => {
        return await openProjectBuilder({
          page,
          projectId: navigatorTopChildFixture.projectId,
          authToken: navigatorTopChildFixture.builderToken,
        });
      }
    );

    const slotADivSelector = [
      "slot-keyboard-div",
      "slot-keyboard-fragment",
      "slot-keyboard-slot-a",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    await expectCanvasInstanceVisible({
      canvas,
      instanceSelector: slotADivSelector,
    });
    await getCanvasInstance({
      canvas,
      instanceSelector: slotADivSelector,
    }).click();

    await page.keyboard.press("Control+ArrowUp");
    await waitForSyncStatus({ page, status: "idle" });

    await getCanvasInstance({
      canvas,
      instanceSelector: slotADivSelector,
    }).waitFor({ state: "hidden", timeout: 30_000 });
    await getCanvasInstance({
      canvas,
      instanceSelector: [
        "slot-keyboard-div",
        "slot-keyboard-fragment",
        "slot-keyboard-slot-b",
        "slot-keyboard-wrapper",
        "slot-keyboard-body",
      ],
    }).waitFor({ state: "hidden", timeout: 30_000 });

    const movedDivSelector = [
      "slot-keyboard-div",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    await expectCanvasInstanceVisible({
      canvas,
      instanceSelector: movedDivSelector,
    });

    const movedDivPrecedesSlotA = await canvas
      .locator(getCanvasInstanceSelector(movedDivSelector))
      .evaluate((movedElement, selector) => {
        const slotA = document.querySelector(selector);
        if (slotA === null) {
          return false;
        }
        return Boolean(
          movedElement.compareDocumentPosition(slotA) &
          Node.DOCUMENT_POSITION_FOLLOWING
        );
      }, slotASelector);
    if (movedDivPrecedesSlotA === false) {
      throw new Error("Expected moved div to be positioned before Slot A");
    }
  } finally {
    await close();
  }
});

test("Keyboard shortcut moves the last shared slot child below all slot occurrences", async () => {
  const { page, close } = await newIsolatedPage();

  try {
    const canvas = await measure(
      "slot keyboard bottom child open builder",
      async () => {
        return await openProjectBuilder({
          page,
          projectId: navigatorBottomChildFixture.projectId,
          authToken: navigatorBottomChildFixture.builderToken,
        });
      }
    );

    const slotAHeadingSelector = [
      "slot-keyboard-heading",
      "slot-keyboard-fragment",
      "slot-keyboard-slot-a",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    await expectCanvasInstanceVisible({
      canvas,
      instanceSelector: slotAHeadingSelector,
    });
    await getCanvasInstance({
      canvas,
      instanceSelector: slotAHeadingSelector,
    }).click();

    await page.keyboard.press("Control+ArrowDown");
    await waitForSyncStatus({ page, status: "idle" });

    await getCanvasInstance({
      canvas,
      instanceSelector: slotAHeadingSelector,
    }).waitFor({ state: "hidden", timeout: 30_000 });
    await getCanvasInstance({
      canvas,
      instanceSelector: [
        "slot-keyboard-heading",
        "slot-keyboard-fragment",
        "slot-keyboard-slot-b",
        "slot-keyboard-wrapper",
        "slot-keyboard-body",
      ],
    }).waitFor({ state: "hidden", timeout: 30_000 });

    const movedHeadingSelector = [
      "slot-keyboard-heading",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    await expectCanvasInstanceVisible({
      canvas,
      instanceSelector: movedHeadingSelector,
    });

    const slotAPrecedesMovedHeading = await canvas
      .locator(slotASelector)
      .evaluate((slotA, movedSelector) => {
        const movedElement = document.querySelector(movedSelector);
        if (movedElement === null) {
          return false;
        }
        return Boolean(
          slotA.compareDocumentPosition(movedElement) &
          Node.DOCUMENT_POSITION_FOLLOWING
        );
      }, getCanvasInstanceSelector(movedHeadingSelector));
    if (slotAPrecedesMovedHeading === false) {
      throw new Error("Expected moved heading to be positioned after Slot A");
    }
  } finally {
    await close();
  }
});

test("Keyboard shortcut reorders a shared slot child from navigator focus", async () => {
  const { page, close } = await newIsolatedPage();

  try {
    const canvas = await measure(
      "slot keyboard navigator open builder",
      async () => {
        return await openProjectBuilder({
          page,
          projectId: navigatorFixture.projectId,
          authToken: navigatorFixture.builderToken,
        });
      }
    );

    const slotAHeadingSelector = [
      "slot-keyboard-heading",
      "slot-keyboard-fragment",
      "slot-keyboard-slot-a",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    await getCanvasInstance({
      canvas,
      instanceSelector: slotAHeadingSelector,
    }).click();
    await openNavigatorPanel({ page });
    await page.getByRole("button", { name: "Slot Heading" }).first().click();
    await page.keyboard.press("Control+ArrowUp");
    await waitForSyncStatus({ page, status: "idle" });

    const slotADivSelector = [
      "slot-keyboard-div",
      "slot-keyboard-fragment",
      "slot-keyboard-slot-a",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    const slotBHeadingSelector = [
      "slot-keyboard-heading",
      "slot-keyboard-fragment",
      "slot-keyboard-slot-b",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    const slotBDivSelector = [
      "slot-keyboard-div",
      "slot-keyboard-fragment",
      "slot-keyboard-slot-b",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];

    await expectCanvasInstancePrecedes({
      canvas,
      beforeSelector: slotAHeadingSelector,
      afterSelector: slotADivSelector,
    });
    await expectCanvasInstancePrecedes({
      canvas,
      beforeSelector: slotBHeadingSelector,
      afterSelector: slotBDivSelector,
    });
  } finally {
    await close();
  }
});

test("Keyboard shortcut moves the first shared slot child above all slot occurrences from navigator focus", async () => {
  const { page, close } = await newIsolatedPage();

  try {
    const canvas = await measure(
      "slot keyboard navigator top child open builder",
      async () => {
        return await openProjectBuilder({
          page,
          projectId: topChildFixture.projectId,
          authToken: topChildFixture.builderToken,
        });
      }
    );

    const slotADivSelector = [
      "slot-keyboard-div",
      "slot-keyboard-fragment",
      "slot-keyboard-slot-a",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    await getCanvasInstance({
      canvas,
      instanceSelector: slotADivSelector,
    }).click();
    await openNavigatorPanel({ page });
    await page.getByRole("button", { name: "Drop Div" }).first().click();

    await page.keyboard.press("Control+ArrowUp");
    await waitForSyncStatus({ page, status: "idle" });

    await getCanvasInstance({
      canvas,
      instanceSelector: slotADivSelector,
    }).waitFor({ state: "hidden", timeout: 30_000 });
    await getCanvasInstance({
      canvas,
      instanceSelector: [
        "slot-keyboard-div",
        "slot-keyboard-fragment",
        "slot-keyboard-slot-b",
        "slot-keyboard-wrapper",
        "slot-keyboard-body",
      ],
    }).waitFor({ state: "hidden", timeout: 30_000 });

    const movedDivSelector = [
      "slot-keyboard-div",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    await expectCanvasInstanceVisible({
      canvas,
      instanceSelector: movedDivSelector,
    });

    const movedDivPrecedesSlotA = await canvas
      .locator(getCanvasInstanceSelector(movedDivSelector))
      .evaluate((movedElement, selector) => {
        const slotA = document.querySelector(selector);
        if (slotA === null) {
          return false;
        }
        return Boolean(
          movedElement.compareDocumentPosition(slotA) &
          Node.DOCUMENT_POSITION_FOLLOWING
        );
      }, slotASelector);
    if (movedDivPrecedesSlotA === false) {
      throw new Error("Expected moved div to be positioned before Slot A");
    }
  } finally {
    await close();
  }
});

test("Keyboard shortcut moves the last shared slot child below all slot occurrences from navigator focus", async () => {
  const { page, close } = await newIsolatedPage();

  try {
    const canvas = await measure(
      "slot keyboard navigator bottom child open builder",
      async () => {
        return await openProjectBuilder({
          page,
          projectId: bottomChildFixture.projectId,
          authToken: bottomChildFixture.builderToken,
        });
      }
    );

    const slotAHeadingSelector = [
      "slot-keyboard-heading",
      "slot-keyboard-fragment",
      "slot-keyboard-slot-a",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    await getCanvasInstance({
      canvas,
      instanceSelector: slotAHeadingSelector,
    }).click();
    await openNavigatorPanel({ page });
    await page.getByRole("button", { name: "Slot Heading" }).first().click();

    await page.keyboard.press("Control+ArrowDown");
    await waitForSyncStatus({ page, status: "idle" });

    await getCanvasInstance({
      canvas,
      instanceSelector: slotAHeadingSelector,
    }).waitFor({ state: "hidden", timeout: 30_000 });
    await getCanvasInstance({
      canvas,
      instanceSelector: [
        "slot-keyboard-heading",
        "slot-keyboard-fragment",
        "slot-keyboard-slot-b",
        "slot-keyboard-wrapper",
        "slot-keyboard-body",
      ],
    }).waitFor({ state: "hidden", timeout: 30_000 });

    const movedHeadingSelector = [
      "slot-keyboard-heading",
      "slot-keyboard-wrapper",
      "slot-keyboard-body",
    ];
    await expectCanvasInstanceVisible({
      canvas,
      instanceSelector: movedHeadingSelector,
    });

    const slotAPrecedesMovedHeading = await canvas
      .locator(slotASelector)
      .evaluate((slotA, movedSelector) => {
        const movedElement = document.querySelector(movedSelector);
        if (movedElement === null) {
          return false;
        }
        return Boolean(
          slotA.compareDocumentPosition(movedElement) &
          Node.DOCUMENT_POSITION_FOLLOWING
        );
      }, getCanvasInstanceSelector(movedHeadingSelector));
    if (slotAPrecedesMovedHeading === false) {
      throw new Error("Expected moved heading to be positioned after Slot A");
    }
  } finally {
    await close();
  }
});
