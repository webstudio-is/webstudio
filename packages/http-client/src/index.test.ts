import { loadProject } from "./index";

const existingProjectId = "398d3918-9b00-4a43-8ab6-de4e151ae98a";
const notPublishedProjectId = "7ec397c6-b3d0-4967-9073-9d83623fcf8e";
const apiUrl = "http://localhost:3000";

describe("getProjectDetails", () => {
  test("include pages", async () => {
    const response = await loadProject({
      apiUrl,
      projectId: existingProjectId,
      include: { tree: true, props: true, breakpoints: true, pages: true },
    });
    expect(response.pages).toBeTruthy();
  });
  test("does not include pages", async () => {
    const response = await loadProject({
      apiUrl,
      projectId: notPublishedProjectId,
      include: { tree: true, props: true, breakpoints: true, pages: true },
    });
    expect(response.pages).toBeNull();
  });
  test("loads existing project", async () => {
    const response = await loadProject({
      apiUrl,
      projectId: existingProjectId,
    });
    expect(response.tree.id).toBeTruthy();
  });
  test("loads not published project", async () => {
    const response = await loadProject({
      apiUrl,
      projectId: notPublishedProjectId,
    });
    expect(response.tree.errors).toBe(
      `Project ${notPublishedProjectId} needs to be published first`
    );
  });
});
