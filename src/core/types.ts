import { z } from 'zod';

// We use Zod for runtime validation of the config, 
// but we need pure Typescript generics for the 'resolve' functions.

export type ScalarType = 'Int' | 'Float' | 'Boolean' | 'String';

/**
 * A feature definition declares how to extract a single value
 * from a database entity.
 * 
 * @template T The Prisma Model type (e.g. User)
 */
export interface FeatureDefinition<T = any> {
  type: ScalarType;
  /**
   * The logic to extract this feature.
   * MUST be a pure function.
   * 
   * @param entity The source entity (e.g. the User object)
   * @returns The scalar value for the feature
   */
  resolve: (entity: T) => number | string | boolean | Promise<number | string | boolean>;
}

/**
 * Configuration for the training process.
 */
export interface TrainingConfig {
  /**
   * The algorithm to use. 
   * 'RandomForest' is the default and recommended for most tabular tasks.
   */
  algorithm?: 'RandomForest' | 'XGBoost' | 'DecisionTree' | 'LogisticRegression';
  
  /**
   * Minimum accuracy required to pass the build.
   * Range: 0.0 to 1.0
   * @default 0.7
   */
  minAccuracy?: number;

  /**
   * Percentage of data to use for testing.
   * @default 0.2 (20%)
   */
  testSplit?: number;
}

/**
 * The PrisML Model Definition.
 * This is what the user exports from their `ml.ts` file.
 */
export interface PrisMLModel<T = any> {
  name: string; // The export name (auto-assigned usually)
  target: string; // The Prisma Model name (e.g. "User")
  output: string; // The prediction field name (e.g. "churnRisk")
  features: Record<string, FeatureDefinition<T>>;
  config?: TrainingConfig;
}

/**
 * Helper to define a model with type inference.
 */
export function defineModel<T>(definition: Omit<PrisMLModel<T>, 'name'>): PrisMLModel<T> {
  return {
    ...definition,
    name: 'unknown', // Will be hydrated by the registry/loader
  };
}
