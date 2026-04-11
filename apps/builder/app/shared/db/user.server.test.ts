import { describe, test, expect } from "vitest";
import {
  createTestServer,
  db,
  testContext,
  json,
} from "@webstudio-is/postgrest/testing";
import type { AppContext } from "@webstudio-is/trpc-interface/index.server";
import { AuthorizationError } from "@webstudio-is/trpc-interface/index.server";
import {
  getUserById,
  createOrLoginWithDev,
  updateUserProjectsTags,
} from "./user.server";

const server = createTestServer();

const createContext = (overrides: Partial<AppContext> = {}): AppContext =>
  ({
    ...testContext,
    authorization: { type: "user", userId: "user-1" },
    ...overrides,
  }) as unknown as AppContext;

const userRow = {
  id: "user-1",
  email: "test@example.com",
  username: "tester",
  image: "",
  provider: "dev",
  projectsTags: [],
  createdAt: new Date().toISOString(),
  team: null,
};

// ─── getUserById ───────────────────────────────────────────────

describe("getUserById (msw)", () => {
  test("returns user when found", async () => {
    server.use(db.get("User", () => json(userRow)));

    const result = await getUserById(createContext(), "user-1");
    expect(result.id).toBe("user-1");
    expect(result.email).toBe("test@example.com");
    expect(result.projectsTags).toEqual([]);
  });

  test("throws when user not found", async () => {
    server.use(
      db.get("User", () =>
        json(
          { code: "PGRST116", message: "Row not found", details: "", hint: "" },
          { status: 406 }
        )
      )
    );

    await expect(getUserById(createContext(), "missing")).rejects.toThrow(
      "User not found"
    );
  });
});

// ─── createOrLoginWithDev ──────────────────────────────────────

describe("createOrLoginWithDev (msw)", () => {
  test("returns existing user when found", async () => {
    let workspaceChecked = false;
    server.use(
      // User SELECT resolves successfully → existing user
      db.get("User", () => json(userRow)),
      // Workspace check — has default workspace
      db.get("Workspace", () => {
        workspaceChecked = true;
        return json({ id: "ws-1" });
      })
    );

    const result = await createOrLoginWithDev(
      createContext(),
      "test@example.com"
    );
    expect(result.id).toBe("user-1");
    expect(workspaceChecked).toBe(true);
  });

  test("lazily creates workspace when existing user has none", async () => {
    let workspaceCreated = false;
    server.use(
      db.get("User", () => json(userRow)),
      // maybeSingle returns null when no row exists
      db.get("Workspace", () => json(null)),
      db.post("Workspace", () => {
        workspaceCreated = true;
        return json({ id: "ws-new" }, { status: 201 });
      })
    );

    const result = await createOrLoginWithDev(
      createContext(),
      "test@example.com"
    );
    expect(result.id).toBe("user-1");
    expect(workspaceCreated).toBe(true);
  });

  test("creates new user and workspace when email not found", async () => {
    let userInserted = false;
    let workspaceInserted = false;
    server.use(
      // User SELECT → PGRST116 (not found)
      db.get("User", () =>
        json(
          { code: "PGRST116", message: "Row not found", details: "", hint: "" },
          { status: 406 }
        )
      ),
      db.post("User", () => {
        userInserted = true;
        return json({ ...userRow, id: "new-user" }, { status: 201 });
      }),
      db.post("Workspace", () => {
        workspaceInserted = true;
        return json({ id: "ws-new" }, { status: 201 });
      })
    );

    const result = await createOrLoginWithDev(
      createContext(),
      "new@example.com"
    );

    expect(result.email).toBe("test@example.com"); // from userRow mock
    expect(userInserted).toBe(true);
    expect(workspaceInserted).toBe(true);
  });

  test("throws when User SELECT fails with unexpected error", async () => {
    server.use(
      db.get("User", () =>
        json(
          { code: "PGRST999", message: "DB error", details: "", hint: "" },
          { status: 500 }
        )
      )
    );

    await expect(
      createOrLoginWithDev(createContext(), "fail@example.com")
    ).rejects.toThrow("User not found");
  });
});

// ─── updateUserProjectsTags ────────────────────────────────────

describe("updateUserProjectsTags (msw)", () => {
  const tags = [{ id: "tag-1", label: "Design" }];

  test("returns updated tags", async () => {
    server.use(
      db.patch("User", () =>
        json({ ...userRow, projectsTags: tags }, { status: 200 })
      )
    );

    const result = await updateUserProjectsTags({ tags }, createContext());
    expect(result).toEqual(tags);
  });

  test("throws AuthorizationError for non-user context", async () => {
    await expect(
      updateUserProjectsTags(
        { tags },
        createContext({ authorization: { type: "anonymous" } })
      )
    ).rejects.toThrow(AuthorizationError);
  });

  test("throws when DB update fails", async () => {
    server.use(
      db.patch("User", () =>
        json(
          { code: "PGRST123", message: "Update failed", details: "", hint: "" },
          { status: 500 }
        )
      )
    );

    await expect(
      updateUserProjectsTags({ tags }, createContext())
    ).rejects.toBeTruthy();
  });
});
