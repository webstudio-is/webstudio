import { loadProject } from "./index";

const existingProjectId = "ab3619d3-831f-46f8-abb6-609558cffd99";
const notPublishedProjectId = "7ec397c6-b3d0-4967-9073-9d83623fcf8e";
const apiUrl = "http://localhost:3000";

describe("getProjectDetails", () => {
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
      "Project 7ec397c6-b3d0-4967-9073-9d83623fcf8e needs to be published first"
    );
  });
});
