import { featureConfig } from "./config";
import type { Environment, FeatureName } from "./types";

function getEnvironment(): Environment {
  const env = process.env.ENV_NAME as Environment | undefined;

  if (!env || !["local", "integration", "production"].includes(env)) {
    console.warn(
      `Invalid or missing ENV_NAME: "${env}". Falling back to "local".`,
    );
    return "local";
  }

  return env;
}

const currentEnvironment = getEnvironment();

export function isFeatureEnabled(featureName: FeatureName): boolean {
  return featureConfig[featureName][currentEnvironment];
}

export { type FeatureName, type Environment } from "./types";
