import { loadProject } from "./index";

const existingProjectId = "40c7a865-0bc7-4012-9318-6c4c665425de";
const notPublishedProjectId = "7ec397c6-b3d0-4967-9073-9d83623fcf8e";
const onlyHomeProjectId = "1e60b0be-afba-4c8d-9956-5a5b7963e4dc";
const morePagesProjectId = "40c7a865-0bc7-4012-9318-6c4c665425de";
const apiUrl = "http://localhost:3000";

describe("getProjectDetails", () => {
  test("include pages", async () => {
    const response = await loadProject({
      apiUrl,
      projectId: morePagesProjectId,
    });
    expect(Object.keys(response).length > 1).toBeTruthy();
  });
  test("does not include pages", async () => {
    const response = await loadProject({
      apiUrl,
      projectId: onlyHomeProjectId,
    });
    expect(Object.keys(response).length === 1).toBeTruthy();
  });
  test("loads existing project", async () => {
    const response = await loadProject({
      apiUrl,
      projectId: existingProjectId,
    });
    expect(response).toBeTruthy();
  });
  test("loads not published project", async () => {
    const response = await loadProject({
      apiUrl,
      projectId: notPublishedProjectId,
    });
    expect(response).toBe(
      `Project ${notPublishedProjectId} needs to be published first`
    );
  });
});
