import { loadProject } from "./index";
const existingProjectId = "675e8af3-48fa-4b18-9ebf-fd2b128865e2";
const notPublishedProjectId = "7ec397c6-b3d0-4967-9073-9d83623fcf8e";
const onlyHomeProjectId = "36d6c16f-04a0-45d4-ab1d-aa0ab61eb5b6";
const morePagesProjectId = existingProjectId;

const apiUrl = "http://localhost:3000";

describe("getProjectDetails", () => {
  test("include pages", async () => {
    const response = await loadProject({
      apiUrl,
      projectId: morePagesProjectId,
    });
    if (response instanceof Error) {
      throw response;
    }
    if (typeof response === "object") {
      return expect(response.length > 1).toBeTruthy();
    }
    throw new Error("Unexpected response");
  });
  test("does not include pages", async () => {
    const response = await loadProject({
      apiUrl,
      projectId: onlyHomeProjectId,
    });
    if (response instanceof Error) {
      throw response;
    }
    if (typeof response === "object") {
      return expect(response.length === 1).toBeTruthy();
    }
    throw new Error("Unexpected response");
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
    if (response instanceof Error) {
      throw response;
    }
    if (typeof response === "string") {
      return expect(response.toString()).toBe(
        `Project ${notPublishedProjectId} not found or not published yet. Please contact us to get help.`
      );
    }
    throw new Error("Unexpected response");
  });
});
