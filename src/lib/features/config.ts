import type { FeatureConfig } from "./types";

export const featureConfig: FeatureConfig = {
  auth: {
    local: true,
    integration: true,
    production: true,
  },
  aiGeneration: {
    local: true,
    integration: true,
    production: true,
  },
  flashcards: {
    local: true,
    integration: true,
    production: true,
  },
};
