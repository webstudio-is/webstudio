import { test, expect, describe, beforeEach } from "@jest/globals";
import { BloomFilter } from "./bloom-filter.server";

describe("BloomFilter add/has", () => {
  let bloomFilter: BloomFilter;

  beforeEach(() => {
    bloomFilter = new BloomFilter(100, 0.01);
  });

  test("should initialize correctly", () => {
    expect(bloomFilter.numHashes).toBeGreaterThan(0);
    expect(bloomFilter.bitArray.length).toBeGreaterThan(0);
  });

  test("should add an item and check its existence", async () => {
    const item = "test-item";
    await bloomFilter.add(item);
    const hasItem = await bloomFilter.has(item);
    expect(hasItem).toBe(true);
  });

  test("should return false for non-existent items", async () => {
    const item = "non-existent-item";
    const hasItem = await bloomFilter.has(item);
    expect(hasItem).toBe(false);
  });

  test("should handle adding the same item multiple times", async () => {
    const item = "duplicate-item";
    await bloomFilter.add(item);
    await bloomFilter.add(item);
    const hasItem = await bloomFilter.has(item);
    expect(hasItem).toBe(true);
  });

  test("should handle multiple items", async () => {
    const items = ["item1", "item2", "item3"];
    for (const item of items) {
      await bloomFilter.add(item);
    }

    for (const item of items) {
      const hasItem = await bloomFilter.has(item);
      expect(hasItem).toBe(true);
    }

    const notExistedItems = ["na-item1", "na-item2", "na-item3"];
    for (const item of notExistedItems) {
      const hasItem = await bloomFilter.has(item);
      expect(hasItem).toBe(false);
    }
  });
});

describe("BloomFilter serialize/deserialize", () => {
  let bloomFilter: BloomFilter;

  beforeEach(() => {
    bloomFilter = new BloomFilter(100, 0.01);
  });

  test("should serialize and deserialize correctly", async () => {
    const items = ["item1", "item2", "item3", "item4", "item5"];

    for (const item of items) {
      await bloomFilter.add(item);
    }

    const serialized = bloomFilter.serialize();
    const deserialized = BloomFilter.deserialize(serialized);

    expect(deserialized.numHashes).toBe(bloomFilter.numHashes);
    expect(deserialized.bitArray).toEqual(bloomFilter.bitArray);
  });
});

describe("BloomFilter size", () => {
  test("should fail if out of params", async () => {
    expect(() => {
      new BloomFilter(1000, 0.00001);
    }).toThrowError("numHashes is too large");

    expect(() => {
      new BloomFilter(100000, 0.01);
    }).toThrowError(
      "Invariant failed: bitSize=958506 is too large, hash is 16-bit"
    );
  });

  test("Visual test bloom filter size", async () => {
    const bloomFilter = new BloomFilter(100, 0.02);
    for (let i = 0; i < 20; i++) {
      await bloomFilter.add(i.toString());
    }

    const serialized = bloomFilter.serialize();
    expect(serialized).toMatchInlineSnapshot(
      `"CAAQAQGCIIBVggEAADBCwABIFEAAAAAABGAAQCJoBEAAABAAAAgCACCAAIQEhIQ0gACAAAgIQAggAgUgEAAAgBETgAAQAECBFEUkAAMqRoIBkREQQMAAEEgIAFAAAACAAAGICAgGBg"`
    );
  });

  test("Visual test bloom filter size", async () => {
    const bloomFilter = new BloomFilter(50, 0.02);
    for (let i = 0; i < 20; i++) {
      await bloomFilter.add(i.toString());
    }

    const serialized = bloomFilter.serialize();
    expect(serialized).toMatchInlineSnapshot(
      `"CAgYQQmiIoV1kgEAgDFTwABYFECBFEUkBGMqRqJplVEQQNAAEEgKAHCAAISEhIW8iAiGBg"`
    );
  });
});

describe("real life test", () => {
  test.each([50, 100])("should work with real life data", async (maxItems) => {
    const falsePositiveProbability = 0.02;

    const bloomFilter = new BloomFilter(maxItems, falsePositiveProbability);

    // Fill with maxItems with 2/3
    const uuids = Array.from(Array(Math.ceil((maxItems * 2) / 3)), () =>
      crypto.randomUUID()
    );
    for (const uuid of uuids) {
      await bloomFilter.add(uuid);
    }

    for (const uuid of uuids) {
      expect(await bloomFilter.has(uuid)).toBe(true);
    }

    let falsePositives = 0;

    const notInSetCount = 1000;

    const notInSetUuid = Array.from(Array(notInSetCount), () =>
      crypto.randomUUID()
    );

    for (const uuid of notInSetUuid) {
      const isInSet = await bloomFilter.has(uuid);
      falsePositives += isInSet ? 1 : 0;
    }

    expect(falsePositives).toBeLessThan(
      notInSetCount * falsePositiveProbability
    );

    /*
    // Uncomment to play with parameters
    console.info(
      "False positives",
      falsePositives,
      bloomFilter.serialize().length
    );
    */
  });
});
