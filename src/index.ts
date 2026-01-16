/**
 * PrisML - Type-safe ML for Prisma
 * 
 * Main package exports for runtime usage.
 * For CLI usage, use the `prisml` command.
 */

// Core types and model definition
export { defineModel } from './core/types';
export type { 
  PrisMLModel, 
  FeatureDefinition, 
  TrainingConfig, 
  ScalarType 
} from './core/types';

// Prisma Client Extension (Primary API)
export { prisml } from './extension';
export type { PrismaClientWithML } from './extension';

// Runtime inference engine (Advanced usage)
export { ONNXInferenceEngine } from './engine/inference';

// Feature processing (Advanced usage)
export { FeatureProcessor } from './engine/processor';

// Environment detection utilities
export { detectTrainingBackend, getInstallInstructions } from './engine/environment';
export type { TrainingBackend } from './engine/environment';

// Error classes for better error handling
export {
  PrisMLError,
  DatabaseConnectionError,
  NoDataError,
  ModelNotFoundError,
  FeatureExtractionError,
  TrainingFailedError,
  InferenceNotInitializedError,
  ModelLoadError,
  InvalidConfigError,
  PythonNotFoundError
} from './core/errors';

// Model versioning and A/B testing
export { ModelVersionManager, ABTestingStrategy } from './core/versioning';
export type { ModelVersion, VersionRegistry } from './core/versioning';
