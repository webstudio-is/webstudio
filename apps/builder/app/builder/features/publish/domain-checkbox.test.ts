import { describe, test, expect } from "vitest";
import { __testing__ } from "./domain-checkbox";

const { isCustomDomainPublishRestricted } = __testing__;

describe("isCustomDomainPublishRestricted", () => {
  describe("free plan (allowStagingPublish=false), no builder role", () => {
    test("custom domain → restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: false,
          canPublishToStagingOnly: false,
          isCustomDomain: true,
        })
      ).toBe(true);
    });

    test("staging domain → not restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: false,
          canPublishToStagingOnly: false,
          isCustomDomain: false,
        })
      ).toBe(false);
    });

    test("isCustomDomain undefined → not restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: false,
          canPublishToStagingOnly: false,
          isCustomDomain: undefined,
        })
      ).toBe(false);
    });
  });

  describe("pro plan (allowStagingPublish=true), no builder role", () => {
    test("custom domain → not restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: true,
          canPublishToStagingOnly: false,
          isCustomDomain: true,
        })
      ).toBe(false);
    });

    test("staging domain → not restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: true,
          canPublishToStagingOnly: false,
          isCustomDomain: false,
        })
      ).toBe(false);
    });
  });

  describe("builder role (canPublishToStagingOnly=true)", () => {
    test("custom domain on pro plan → restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: true,
          canPublishToStagingOnly: true,
          isCustomDomain: true,
        })
      ).toBe(true);
    });

    test("staging domain on pro plan → not restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: true,
          canPublishToStagingOnly: true,
          isCustomDomain: false,
        })
      ).toBe(false);
    });

    test("custom domain on free plan → restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: false,
          canPublishToStagingOnly: true,
          isCustomDomain: true,
        })
      ).toBe(true);
    });

    test("staging domain on free plan → not restricted", () => {
      expect(
        isCustomDomainPublishRestricted({
          allowStagingPublish: false,
          canPublishToStagingOnly: true,
          isCustomDomain: false,
        })
      ).toBe(false);
    });
  });
});
