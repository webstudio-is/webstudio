import { describe, expect, test } from "vitest";
import type { ObjectStore, ProjectHeadStore } from "../object-store";
import type { ObjectProjectSnapshotReference } from "../types";

const references = ["1", "2", "3"].map(
  (digit) =>
    ({
      storage: "object",
      type: "snapshot",
      object: {
        hash: `sha256:${digit.repeat(64)}`,
        size: Number(digit),
      },
    }) satisfies ObjectProjectSnapshotReference
);

export const runStorageAdapterContract = ({
  name,
  create,
}: {
  name: string;
  create: () => Promise<{
    objects: ObjectStore;
    heads: ProjectHeadStore<ObjectProjectSnapshotReference>;
  }>;
}) => {
  describe(`${name} storage adapter contract`, () => {
    test("reads, replaces, lists, and deletes objects", async () => {
      const { objects } = await create();
      await expect(objects.get("missing/value")).resolves.toBeUndefined();

      await objects.put("objects/one", new TextEncoder().encode("one"));
      await objects.put("objects/two", new TextEncoder().encode("two"));
      await objects.put(
        "objects-other/three",
        new TextEncoder().encode("three")
      );
      await objects.put("objects/one", new TextEncoder().encode("updated"));

      await expect(objects.get("objects/one")).resolves.toEqual(
        new TextEncoder().encode("updated")
      );
      await expect(
        objects.get("objects/one", { offset: 1, length: 3 })
      ).resolves.toEqual(new TextEncoder().encode("pda"));
      await expect(
        objects.putIfAbsent("objects/one", new TextEncoder().encode("ignored"))
      ).resolves.toBe("existing");
      await expect(objects.get("objects/one")).resolves.toEqual(
        new TextEncoder().encode("updated")
      );
      await expect(
        objects.putIfAbsent("objects/three", new TextEncoder().encode("three"))
      ).resolves.toBe("written");
      await expect(objects.list("objects")).resolves.toEqual([
        "objects/one",
        "objects/three",
        "objects/two",
      ]);
      await expect(objects.list("objects/one")).resolves.toEqual([]);
      await objects.delete("objects/one");
      await objects.delete("objects/one");
      await expect(objects.get("objects/one")).resolves.toBeUndefined();
    });

    test("atomically creates an immutable object once", async () => {
      const { objects } = await create();
      const value = new TextEncoder().encode("shared immutable value");

      const results = await Promise.all([
        objects.putIfAbsent("objects/shared", value),
        objects.putIfAbsent("objects/shared", value),
      ]);

      expect(results.filter((result) => result === "written")).toHaveLength(1);
      expect(results.filter((result) => result === "existing")).toHaveLength(1);
      await expect(objects.get("objects/shared")).resolves.toEqual(value);
    });

    test("allows exactly one concurrent head compare-and-swap", async () => {
      const { heads } = await create();
      const created = await heads.updateHead({
        name: "development",
        reference: references[0],
      });
      if (created.status !== "updated") {
        throw new Error("Expected initial project head update to succeed");
      }

      const results = await Promise.all([
        heads.updateHead({
          name: "development",
          expectedRevision: created.head.revision,
          reference: references[1],
        }),
        heads.updateHead({
          name: "development",
          expectedRevision: created.head.revision,
          reference: references[2],
        }),
      ]);

      expect(results.filter(({ status }) => status === "updated")).toHaveLength(
        1
      );
      expect(
        results.filter(({ status }) => status === "conflict")
      ).toHaveLength(1);
    });
  });
};
