/**
 * Custom Error Classes for PrisML
 * 
 * Provides contextual, actionable error messages for better DX.
 */

export class PrisMLError extends Error {
  constructor(
    message: string,
    public readonly context?: Record<string, any>,
    public readonly suggestions?: string[]
  ) {
    super(message);
    this.name = 'PrisMLError';
  }

  toString(): string {
    let output = `${this.name}: ${this.message}`;
    
    if (this.context && Object.keys(this.context).length > 0) {
      output += '\n\nContext:';
      for (const [key, value] of Object.entries(this.context)) {
        output += `\n  ${key}: ${value}`;
      }
    }
    
    if (this.suggestions && this.suggestions.length > 0) {
      output += '\n\nSuggestions:';
      for (const suggestion of this.suggestions) {
        output += `\n  • ${suggestion}`;
      }
    }
    
    return output;
  }
}

export class DatabaseConnectionError extends PrisMLError {
  constructor(originalError?: Error) {
    super(
      'Failed to connect to database',
      {
        error: originalError?.message || 'Unknown connection error'
      },
      [
        'Check that DATABASE_URL is set in your .env file',
        'Verify the database is running and accessible',
        'Ensure connection string format is correct: postgresql://user:password@host:port/database',
        'Test connection manually: npx prisma db pull'
      ]
    );
    this.name = 'DatabaseConnectionError';
  }
}

export class NoDataError extends PrisMLError {
  constructor(modelName: string, tableName: string) {
    super(
      `No training data found in table '${tableName}'`,
      {
        model: modelName,
        table: tableName
      },
      [
        `Run 'npx prisma db seed' to populate sample data`,
        `Check that the Prisma model name matches: ${tableName}`,
        `Verify data exists: SELECT COUNT(*) FROM "${tableName}"`,
        'Ensure migrations are applied: npx prisma migrate deploy'
      ]
    );
    this.name = 'NoDataError';
  }
}

export class ModelNotFoundError extends PrisMLError {
  constructor(modelName: string, modelPath: string) {
    super(
      `Trained model not found: ${modelName}.onnx`,
      {
        modelName,
        expectedPath: modelPath
      },
      [
        `Run 'npx prisml train' to generate the model`,
        `Check that model name matches the exported variable name`,
        `Verify the model trained successfully without errors`,
        `Look for the ONNX file in: ${modelPath}`
      ]
    );
    this.name = 'ModelNotFoundError';
  }
}

export class FeatureExtractionError extends PrisMLError {
  constructor(featureName: string, fieldName: string | undefined, originalError: Error) {
    super(
      `Failed to extract feature '${featureName}'`,
      {
        feature: featureName,
        field: fieldName || 'unknown',
        error: originalError.message
      },
      [
        `Check that the resolve function for '${featureName}' is correct`,
        fieldName ? `Verify field '${fieldName}' exists in your Prisma model` : 'Verify the field exists in your data',
        'Ensure the resolve function handles null/undefined values',
        'Test the resolve function with sample data manually'
      ]
    );
    this.name = 'FeatureExtractionError';
  }
}

export class TrainingFailedError extends PrisMLError {
  constructor(modelName: string, accuracy: number | undefined, minAccuracy: number, stderr?: string) {
    const accuracyInfo = accuracy !== undefined 
      ? `Model accuracy ${(accuracy * 100).toFixed(1)}% is below threshold ${(minAccuracy * 100).toFixed(1)}%`
      : 'Training process failed';

    super(
      accuracyInfo,
      {
        model: modelName,
        accuracy: accuracy !== undefined ? `${(accuracy * 100).toFixed(1)}%` : 'unknown',
        threshold: `${(minAccuracy * 100).toFixed(1)}%`,
        stderr: stderr ? stderr.slice(0, 200) : undefined
      },
      [
        'Increase training data size (aim for 1000+ samples)',
        'Try a different algorithm: XGBoost, RandomForest, or LogisticRegression',
        'Add more relevant features to improve predictions',
        'Lower the minAccuracy threshold temporarily for testing',
        'Check for data quality issues (null values, outliers)',
        'Review feature engineering - ensure features are predictive'
      ]
    );
    this.name = 'TrainingFailedError';
  }
}

export class InferenceNotInitializedError extends PrisMLError {
  constructor(modelName: string) {
    super(
      `Inference engine not initialized for model '${modelName}'`,
      {
        model: modelName
      },
      [
        'Call await engine.initialize() before making predictions',
        'Ensure the model artifact exists before initializing',
        'Check that the ONNX model was trained successfully'
      ]
    );
    this.name = 'InferenceNotInitializedError';
  }
}

export class ModelLoadError extends PrisMLError {
  constructor(modelPath: string, originalError: Error) {
    super(
      'Failed to load ONNX model',
      {
        path: modelPath,
        error: originalError.message
      },
      [
        'Verify the ONNX file is not corrupted',
        'Retrain the model: npx prisml train',
        'Check ONNX runtime version compatibility',
        'Ensure the model was exported correctly by scikit-learn'
      ]
    );
    this.name = 'ModelLoadError';
  }
}

export class InvalidConfigError extends PrisMLError {
  constructor(configField: string, value: any, expectedFormat: string) {
    super(
      `Invalid configuration for '${configField}'`,
      {
        field: configField,
        providedValue: value,
        expected: expectedFormat
      },
      [
        `Set '${configField}' to ${expectedFormat}`,
        'Review documentation for valid configuration options',
        'Check examples/ directory for reference implementations'
      ]
    );
    this.name = 'InvalidConfigError';
  }
}

export class PythonNotFoundError extends PrisMLError {
  constructor(backend: 'docker' | 'python', installInstructions: string) {
    const message = backend === 'docker' 
      ? 'Docker not found and Python not available'
      : 'Python not found';

    super(
      message,
      {
        backend,
        detectedOS: process.platform
      },
      [
        backend === 'docker' 
          ? 'Install Docker Desktop (recommended): https://www.docker.com/products/docker-desktop'
          : 'Install Python 3.8 or later',
        installInstructions,
        'Set up a virtual environment if using local Python',
        'Alternatively, use Docker for zero-config setup'
      ]
    );
    this.name = 'PythonNotFoundError';
  }
}
