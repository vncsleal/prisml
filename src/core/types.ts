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
 * 
 * Defines a machine learning model that can be trained on Prisma data
 * and used for real-time predictions.
 * 
 * @example
 * ```typescript
 * const churnModel = defineModel({
 *   target: 'User',
 *   output: 'churnProbability',
 *   features: {
 *     daysSinceLastLogin: {
 *       type: 'Int',
 *       resolve: (user) => {
 *         const now = new Date();
 *         return Math.floor((now - user.lastLogin) / 86400000);
 *       }
 *     }
 *   },
 *   config: {
 *     algorithm: 'RandomForest',
 *     minAccuracy: 0.75
 *   }
 * });
 * ```
 * 
 * @template T - The Prisma model type (e.g., User, Order)
 */
export interface PrisMLModel<T = any> {
  /** The unique identifier for this model (auto-assigned from export name) */
  name: string;
  /** The Prisma model name this prediction targets (e.g., 'User', 'Order') */
  target: string;
  /** The field name where predictions will be stored (e.g., 'churnProbability') */
  output: string;
  /** Feature definitions that extract values from entities */
  features: Record<string, FeatureDefinition<T>>;
  /** Training configuration options */
  config?: TrainingConfig;
}

/**
 * Helper function to define a PrisML model with full type inference.
 * 
 * Creates a typed model definition that can be trained and used for predictions.
 * The model name will be automatically assigned from the export variable name.
 * 
 * @example
 * ```typescript
 * // Define a churn prediction model
 * export const churnPredictor = defineModel<User>({
 *   target: 'User',
 *   output: 'churnProbability',
 *   features: {
 *     daysSinceLastLogin: {
 *       type: 'Int',
 *       resolve: (user) => calculateDaysSince(user.lastLogin)
 *     },
 *     totalSpent: {
 *       type: 'Float',
 *       resolve: (user) => user.totalSpent || 0
 *     }
 *   },
 *   config: {
 *     algorithm: 'RandomForest',
 *     minAccuracy: 0.75
 *   }
 * });
 * ```
 * 
 * @template T - The Prisma model type for type-safe feature resolution
 * @param definition - Model configuration excluding the auto-assigned name
 * @returns A complete PrisML model definition ready for training
 */
export function defineModel<T>(definition: Omit<PrisMLModel<T>, 'name'>): PrisMLModel<T> {
  return {
    ...definition,
    name: 'unknown', // Will be hydrated by the registry/loader
  };
}
