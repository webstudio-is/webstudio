import { describe, test, expect } from "vitest";

import { extractCname } from "./cname";

describe("extractCname from ordinary domains", () => {
  test('should return "@" for top level like domains', () => {
    expect(extractCname("example")).toBe("@");
  });

  test('should return "@" for root level domains', () => {
    expect(extractCname("example.com")).toBe("@");
  });

  test("should return the subdomain", () => {
    expect(extractCname("sub.example.com")).toBe("sub");
  });

  test("should return all subdomains", () => {
    expect(extractCname("sub.sub.example.com")).toBe("sub.sub");
  });
});

describe("extractCname from public suffix domains", () => {
  test('should return "@"', () => {
    expect(extractCname("co.za")).toBe("@");
  });

  test('should return "@"', () => {
    expect(extractCname("example.co.za")).toBe("@");
  });

  test("should return all the subdomain", () => {
    expect(extractCname("sub.example.co.za")).toBe("sub");
  });

  test("should handle domains with multiple public suffixes correctly", () => {
    expect(extractCname("sub.sub.example.co.za")).toBe("sub.sub");
  });
});
