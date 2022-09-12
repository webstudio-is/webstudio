import { loadProjectFromRest } from "./index";

const existingProject = "ab3619d3-831f-46f8-abb6-609558cffd99";
const notPublishedProject = "7ec397c6-b3d0-4967-9073-9d83623fcf8e";
const nonExistingProject = "1";

describe("getProjectDetails", () => {
  test("loads existing project", async () => {
    const response = await loadProjectFromRest({ projectId: existingProject });
    expect(response.tree.id).toBeTruthy();
  });
  test("loads non-existing project", async () => {
    const response = await loadProjectFromRest({
      projectId: nonExistingProject,
    });
    expect(response.tree.errors).toBe("Project required");
  });
  test("loads not published project", async () => {
    const response = await loadProjectFromRest({
      projectId: notPublishedProject,
    });
    expect(response.tree.errors).toBe(
      "Site needs to be published, production tree ID is null."
    );
  });
});
