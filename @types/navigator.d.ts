interface Navigator {
  userAgentData?: {
    brands: Array<{ brand: string; version: string }>;
    getHighEntropyValues(hints: string[]): Promise<{
      fullVersionList?: Array<{ brand: string; version: string }>;
    }>;
  };
}
