/**
 * Model versioning system for PrisML
 * 
 * Supports:
 * - Version tracking and metadata
 * - A/B testing between versions
 * - Performance comparison
 * - Rollback capabilities
 */

export interface ModelVersion {
  version: string;
  modelPath: string;
  createdAt: Date;
  accuracy?: number;
  metrics?: {
    precision?: number;
    recall?: number;
    f1Score?: number;
    [key: string]: number | undefined;
  };
  metadata?: {
    trainingDate?: Date;
    datasetSize?: number;
    features?: string[];
    algorithm?: string;
    [key: string]: any;
  };
  isActive: boolean;
  deployedAt?: Date;
}

export interface VersionRegistry {
  [modelName: string]: ModelVersion[];
}

export class ModelVersionManager {
  private registry: VersionRegistry = {};
  private storageDir: string;

  constructor(storageDir: string) {
    this.storageDir = storageDir;
  }

  /**
   * Register a new model version
   */
  registerVersion(
    modelName: string,
    version: string,
    options: {
      modelPath: string;
      accuracy?: number;
      metrics?: ModelVersion['metrics'];
      metadata?: ModelVersion['metadata'];
    }
  ): ModelVersion {
    const modelVersion: ModelVersion = {
      version,
      modelPath: options.modelPath,
      createdAt: new Date(),
      accuracy: options.accuracy,
      metrics: options.metrics,
      metadata: options.metadata,
      isActive: false
    };

    if (!this.registry[modelName]) {
      this.registry[modelName] = [];
    }

    this.registry[modelName].push(modelVersion);
    return modelVersion;
  }

  /**
   * Set a version as active (deploy)
   */
  activateVersion(modelName: string, version: string): void {
    const versions = this.registry[modelName];
    if (!versions) {
      throw new Error(`Model ${modelName} not found in registry`);
    }

    const targetVersion = versions.find(v => v.version === version);
    if (!targetVersion) {
      throw new Error(`Version ${version} not found for model ${modelName}`);
    }

    // Deactivate all other versions
    versions.forEach(v => {
      v.isActive = false;
    });

    // Activate target version
    targetVersion.isActive = true;
    targetVersion.deployedAt = new Date();
  }

  /**
   * Get the currently active version
   */
  getActiveVersion(modelName: string): ModelVersion | null {
    const versions = this.registry[modelName];
    if (!versions) return null;

    return versions.find(v => v.isActive) || null;
  }

  /**
   * List all versions for a model
   */
  listVersions(modelName: string): ModelVersion[] {
    return this.registry[modelName] || [];
  }

  /**
   * Get a specific version
   */
  getVersion(modelName: string, version: string): ModelVersion | null {
    const versions = this.registry[modelName];
    if (!versions) return null;

    return versions.find(v => v.version === version) || null;
  }

  /**
   * Compare two versions
   */
  compareVersions(
    modelName: string,
    versionA: string,
    versionB: string
  ): {
    versionA: ModelVersion;
    versionB: ModelVersion;
    accuracyDiff: number | null;
    metricsDiff: { [key: string]: number };
  } | null {
    const verA = this.getVersion(modelName, versionA);
    const verB = this.getVersion(modelName, versionB);

    if (!verA || !verB) return null;

    const accuracyDiff =
      verA.accuracy !== undefined && verB.accuracy !== undefined
        ? verB.accuracy - verA.accuracy
        : null;

    const metricsDiff: { [key: string]: number } = {};
    if (verA.metrics && verB.metrics) {
      const allKeys = new Set([
        ...Object.keys(verA.metrics),
        ...Object.keys(verB.metrics)
      ]);

      allKeys.forEach(key => {
        const valA = verA.metrics?.[key];
        const valB = verB.metrics?.[key];
        if (valA !== undefined && valB !== undefined) {
          metricsDiff[key] = valB - valA;
        }
      });
    }

    return {
      versionA: verA,
      versionB: verB,
      accuracyDiff,
      metricsDiff
    };
  }

  /**
   * Rollback to a previous version
   */
  rollback(modelName: string, targetVersion: string): void {
    const version = this.getVersion(modelName, targetVersion);
    if (!version) {
      throw new Error(
        `Cannot rollback: version ${targetVersion} not found for model ${modelName}`
      );
    }

    this.activateVersion(modelName, targetVersion);
  }

  /**
   * Delete a version (cannot delete active version)
   */
  deleteVersion(modelName: string, version: string): boolean {
    const versions = this.registry[modelName];
    if (!versions) return false;

    const targetVersion = versions.find(v => v.version === version);
    if (!targetVersion) return false;

    if (targetVersion.isActive) {
      throw new Error('Cannot delete active version. Activate another version first.');
    }

    const index = versions.indexOf(targetVersion);
    versions.splice(index, 1);
    return true;
  }

  /**
   * Get version history with performance metrics
   */
  getVersionHistory(modelName: string): {
    currentVersion: string | null;
    versions: Array<{
      version: string;
      accuracy: number | undefined;
      createdAt: Date;
      deployedAt: Date | undefined;
      isActive: boolean;
    }>;
  } {
    const versions = this.listVersions(modelName);
    const activeVersion = this.getActiveVersion(modelName);

    return {
      currentVersion: activeVersion?.version || null,
      versions: versions
        .map(v => ({
          version: v.version,
          accuracy: v.accuracy,
          createdAt: v.createdAt,
          deployedAt: v.deployedAt,
          isActive: v.isActive
        }))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    };
  }

  /**
   * Export registry for persistence
   */
  exportRegistry(): VersionRegistry {
    return JSON.parse(JSON.stringify(this.registry));
  }

  /**
   * Import registry from persistence
   */
  importRegistry(registry: VersionRegistry): void {
    // Convert date strings back to Date objects
    Object.keys(registry).forEach(modelName => {
      registry[modelName] = registry[modelName].map(v => ({
        ...v,
        createdAt: new Date(v.createdAt),
        deployedAt: v.deployedAt ? new Date(v.deployedAt) : undefined,
        metadata: v.metadata
          ? {
              ...v.metadata,
              trainingDate: v.metadata.trainingDate
                ? new Date(v.metadata.trainingDate)
                : undefined
            }
          : undefined
      }));
    });

    this.registry = registry;
  }
}

/**
 * A/B testing strategy for model versions
 */
export class ABTestingStrategy {
  private versionManager: ModelVersionManager;
  private trafficSplits: Map<string, { [version: string]: number }> = new Map();

  constructor(versionManager: ModelVersionManager) {
    this.versionManager = versionManager;
  }

  /**
   * Configure A/B test traffic split
   * 
   * @example
   * abTest.configureTest('churnPredictor', {
   *   'v1.0': 0.5,  // 50% traffic
   *   'v1.1': 0.5   // 50% traffic
   * });
   */
  configureTest(modelName: string, splits: { [version: string]: number }): void {
    const total = Object.values(splits).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - 1.0) > 0.001) {
      throw new Error('Traffic splits must sum to 1.0');
    }

    // Validate versions exist
    Object.keys(splits).forEach(version => {
      const v = this.versionManager.getVersion(modelName, version);
      if (!v) {
        throw new Error(`Version ${version} not found for model ${modelName}`);
      }
    });

    this.trafficSplits.set(modelName, splits);
  }

  /**
   * Select a version based on traffic split
   * Uses consistent hashing based on entity ID for stable routing
   */
  selectVersion(modelName: string, entityId: string | number): string | null {
    const splits = this.trafficSplits.get(modelName);
    if (!splits) {
      // No A/B test configured, use active version
      const active = this.versionManager.getActiveVersion(modelName);
      return active?.version || null;
    }

    // Simple hash function for consistent routing
    const hash = this.hashEntityId(entityId);
    const versions = Object.keys(splits);
    
    let cumulative = 0;
    for (const version of versions) {
      cumulative += splits[version];
      if (hash < cumulative) {
        return version;
      }
    }

    return versions[versions.length - 1];
  }

  /**
   * Simple hash function that returns value between 0 and 1
   */
  private hashEntityId(entityId: string | number): number {
    const str = String(entityId);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash % 100) / 100;
  }

  /**
   * Get current test configuration
   */
  getTestConfig(modelName: string): { [version: string]: number } | null {
    return this.trafficSplits.get(modelName) || null;
  }

  /**
   * Stop A/B test and promote winner
   */
  promoteWinner(modelName: string, winningVersion: string): void {
    this.trafficSplits.delete(modelName);
    this.versionManager.activateVersion(modelName, winningVersion);
  }
}
