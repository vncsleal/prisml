/**
 * Unit Tests: Error Classes
 */

import { describe, it, expect } from 'vitest';
import {
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
} from '../core/errors';

describe('Error Classes', () => {
  describe('PrisMLError', () => {
    it('should create basic error', () => {
      const error = new PrisMLError('Test error');
      expect(error.message).toBe('Test error');
      expect(error.name).toBe('PrisMLError');
    });

    it('should include context in toString', () => {
      const error = new PrisMLError(
        'Test error',
        { key: 'value', number: 42 }
      );
      const str = error.toString();
      expect(str).toContain('Test error');
      expect(str).toContain('Context:');
      expect(str).toContain('key: value');
      expect(str).toContain('number: 42');
    });

    it('should include suggestions in toString', () => {
      const error = new PrisMLError(
        'Test error',
        undefined,
        ['Try this', 'Or this']
      );
      const str = error.toString();
      expect(str).toContain('Suggestions:');
      expect(str).toContain('• Try this');
      expect(str).toContain('• Or this');
    });
  });

  describe('DatabaseConnectionError', () => {
    it('should provide helpful context', () => {
      const error = new DatabaseConnectionError();
      expect(error.message).toContain('Failed to connect to database');
      expect(error.suggestions).toBeDefined();
      expect(error.suggestions?.length).toBeGreaterThan(0);
      expect(error.suggestions?.[0]).toContain('DATABASE_URL');
    });

    it('should include original error', () => {
      const originalError = new Error('Connection timeout');
      const error = new DatabaseConnectionError(originalError);
      expect(error.context?.error).toContain('Connection timeout');
    });
  });

  describe('NoDataError', () => {
    it('should include model and table name', () => {
      const error = new NoDataError('churnModel', 'User');
      expect(error.message).toContain('User');
      expect(error.context?.model).toBe('churnModel');
      expect(error.context?.table).toBe('User');
      expect(error.suggestions).toBeDefined();
    });
  });

  describe('ModelNotFoundError', () => {
    it('should include path and suggestions', () => {
      const error = new ModelNotFoundError('churnModel', '/path/to/model.onnx');
      expect(error.message).toContain('churnModel');
      expect(error.context?.expectedPath).toBe('/path/to/model.onnx');
      expect(error.suggestions?.[0]).toContain('npx prisml train');
    });
  });

  describe('FeatureExtractionError', () => {
    it('should provide debugging context', () => {
      const originalError = new Error('Cannot read property');
      const error = new FeatureExtractionError('age', 'dateOfBirth', originalError);
      expect(error.message).toContain('age');
      expect(error.context?.feature).toBe('age');
      expect(error.context?.field).toBe('dateOfBirth');
      expect(error.suggestions).toBeDefined();
    });

    it('should handle unknown field name', () => {
      const originalError = new Error('Some error');
      const error = new FeatureExtractionError('score', undefined, originalError);
      expect(error.context?.field).toBe('unknown');
    });
  });

  describe('TrainingFailedError', () => {
    it('should show accuracy comparison', () => {
      const error = new TrainingFailedError('churnModel', 0.65, 0.75);
      expect(error.message).toContain('65.0%');
      expect(error.message).toContain('75.0%');
      expect(error.context?.model).toBe('churnModel');
      expect(error.suggestions).toBeDefined();
    });

    it('should handle unknown accuracy', () => {
      const error = new TrainingFailedError('testModel', undefined, 0.8);
      expect(error.message).toContain('Training process failed');
      expect(error.context?.accuracy).toBe('unknown');
    });

    it('should include stderr when provided', () => {
      const stderr = 'Python traceback...';
      const error = new TrainingFailedError('model', 0.5, 0.7, stderr);
      expect(error.context?.stderr).toContain('Python traceback');
    });
  });

  describe('InferenceNotInitializedError', () => {
    it('should provide initialization guidance', () => {
      const error = new InferenceNotInitializedError('churnModel');
      expect(error.message).toContain('churnModel');
      expect(error.suggestions?.[0]).toContain('initialize()');
    });
  });

  describe('ModelLoadError', () => {
    it('should include path and original error', () => {
      const originalError = new Error('Invalid ONNX format');
      const error = new ModelLoadError('/path/to/model.onnx', originalError);
      expect(error.context?.path).toBe('/path/to/model.onnx');
      expect(error.context?.error).toContain('Invalid ONNX format');
      expect(error.suggestions).toBeDefined();
    });
  });

  describe('InvalidConfigError', () => {
    it('should show expected format', () => {
      const error = new InvalidConfigError('minAccuracy', 'abc', 'number between 0 and 1');
      expect(error.message).toContain('minAccuracy');
      expect(error.context?.providedValue).toBe('abc');
      expect(error.context?.expected).toContain('number between 0 and 1');
    });
  });

  describe('PythonNotFoundError', () => {
    it('should provide docker installation guidance', () => {
      const error = new PythonNotFoundError('docker', 'Install Docker Desktop');
      expect(error.message).toContain('Docker not found');
      expect(error.suggestions?.[0]).toContain('Docker Desktop');
    });

    it('should provide python installation guidance', () => {
      const error = new PythonNotFoundError('python', 'brew install python3');
      expect(error.message).toContain('Python not found');
      expect(error.suggestions?.[1]).toContain('brew install python3');
    });
  });
});
