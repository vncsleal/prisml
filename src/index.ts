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

// Runtime inference engine
export { ONNXInferenceEngine } from './engine/inference';

// Feature processing
export { FeatureProcessor } from './engine/processor';

// Environment detection utilities
export { detectTrainingBackend, getInstallInstructions } from './engine/environment';
export type { TrainingBackend } from './engine/environment';
