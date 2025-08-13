export type Environment = "local" | "integration" | "production";
export type FeatureName = "auth" | "aiGeneration" | "flashcards";

export type FeatureFlag = {
  [K in Environment]: boolean;
};

export type FeatureConfig = {
  [K in FeatureName]: FeatureFlag;
};
