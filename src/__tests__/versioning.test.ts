import { describe, it, expect, beforeEach } from 'vitest';
import { ModelVersionManager, ABTestingStrategy } from '../core/versioning';
import path from 'path';

describe('Model Versioning', () => {
  let versionManager: ModelVersionManager;

  beforeEach(() => {
    versionManager = new ModelVersionManager(path.join(process.cwd(), 'test-models'));
  });

  describe('ModelVersionManager', () => {
    it('should register a new version', () => {
      const version = versionManager.registerVersion('churnPredictor', 'v1.0', {
        modelPath: '/models/churn-v1.0.onnx',
        accuracy: 0.85,
        metrics: {
          precision: 0.82,
          recall: 0.88,
          f1Score: 0.85
        }
      });

      expect(version.version).toBe('v1.0');
      expect(version.accuracy).toBe(0.85);
      expect(version.isActive).toBe(false);
      expect(version.metrics?.precision).toBe(0.82);
    });

    it('should activate a version', () => {
      versionManager.registerVersion('churnPredictor', 'v1.0', {
        modelPath: '/models/v1.0.onnx',
        accuracy: 0.85
      });

      versionManager.activateVersion('churnPredictor', 'v1.0');
      const active = versionManager.getActiveVersion('churnPredictor');

      expect(active).not.toBeNull();
      expect(active?.version).toBe('v1.0');
      expect(active?.isActive).toBe(true);
      expect(active?.deployedAt).toBeInstanceOf(Date);
    });

    it('should only have one active version at a time', () => {
      versionManager.registerVersion('churnPredictor', 'v1.0', {
        modelPath: '/models/v1.0.onnx'
      });
      versionManager.registerVersion('churnPredictor', 'v1.1', {
        modelPath: '/models/v1.1.onnx'
      });

      versionManager.activateVersion('churnPredictor', 'v1.0');
      versionManager.activateVersion('churnPredictor', 'v1.1');

      const versions = versionManager.listVersions('churnPredictor');
      const activeVersions = versions.filter(v => v.isActive);

      expect(activeVersions).toHaveLength(1);
      expect(activeVersions[0].version).toBe('v1.1');
    });

    it('should list all versions', () => {
      versionManager.registerVersion('churnPredictor', 'v1.0', {
        modelPath: '/models/v1.0.onnx'
      });
      versionManager.registerVersion('churnPredictor', 'v1.1', {
        modelPath: '/models/v1.1.onnx'
      });
      versionManager.registerVersion('churnPredictor', 'v1.2', {
        modelPath: '/models/v1.2.onnx'
      });

      const versions = versionManager.listVersions('churnPredictor');
      expect(versions).toHaveLength(3);
      expect(versions.map(v => v.version)).toEqual(['v1.0', 'v1.1', 'v1.2']);
    });

    it('should compare two versions', () => {
      versionManager.registerVersion('churnPredictor', 'v1.0', {
        modelPath: '/models/v1.0.onnx',
        accuracy: 0.80,
        metrics: { precision: 0.78, recall: 0.82 }
      });
      versionManager.registerVersion('churnPredictor', 'v1.1', {
        modelPath: '/models/v1.1.onnx',
        accuracy: 0.85,
        metrics: { precision: 0.83, recall: 0.87 }
      });

      const comparison = versionManager.compareVersions('churnPredictor', 'v1.0', 'v1.1');

      expect(comparison).not.toBeNull();
      expect(comparison?.accuracyDiff).toBeCloseTo(0.05, 5);
      expect(comparison?.metricsDiff.precision).toBeCloseTo(0.05, 5);
      expect(comparison?.metricsDiff.recall).toBeCloseTo(0.05, 5);
    });

    it('should rollback to previous version', () => {
      versionManager.registerVersion('churnPredictor', 'v1.0', {
        modelPath: '/models/v1.0.onnx'
      });
      versionManager.registerVersion('churnPredictor', 'v1.1', {
        modelPath: '/models/v1.1.onnx'
      });

      versionManager.activateVersion('churnPredictor', 'v1.1');
      versionManager.rollback('churnPredictor', 'v1.0');

      const active = versionManager.getActiveVersion('churnPredictor');
      expect(active?.version).toBe('v1.0');
    });

    it('should not delete active version', () => {
      versionManager.registerVersion('churnPredictor', 'v1.0', {
        modelPath: '/models/v1.0.onnx'
      });
      versionManager.activateVersion('churnPredictor', 'v1.0');

      expect(() => {
        versionManager.deleteVersion('churnPredictor', 'v1.0');
      }).toThrow('Cannot delete active version');
    });

    it('should delete inactive version', () => {
      versionManager.registerVersion('churnPredictor', 'v1.0', {
        modelPath: '/models/v1.0.onnx'
      });
      versionManager.registerVersion('churnPredictor', 'v1.1', {
        modelPath: '/models/v1.1.onnx'
      });

      versionManager.activateVersion('churnPredictor', 'v1.1');
      const deleted = versionManager.deleteVersion('churnPredictor', 'v1.0');

      expect(deleted).toBe(true);
      expect(versionManager.listVersions('churnPredictor')).toHaveLength(1);
    });

    it('should get version history', async () => {
      versionManager.registerVersion('churnPredictor', 'v1.0', {
        modelPath: '/models/v1.0.onnx',
        accuracy: 0.80
      });
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      versionManager.registerVersion('churnPredictor', 'v1.1', {
        modelPath: '/models/v1.1.onnx',
        accuracy: 0.85
      });
      versionManager.activateVersion('churnPredictor', 'v1.1');

      const history = versionManager.getVersionHistory('churnPredictor');

      expect(history.currentVersion).toBe('v1.1');
      expect(history.versions).toHaveLength(2);
      expect(history.versions[0].version).toBe('v1.1'); // Most recent first
    });

    it('should export and import registry', () => {
      versionManager.registerVersion('churnPredictor', 'v1.0', {
        modelPath: '/models/v1.0.onnx',
        accuracy: 0.85
      });
      versionManager.activateVersion('churnPredictor', 'v1.0');

      const exported = versionManager.exportRegistry();
      
      const newManager = new ModelVersionManager(path.join(process.cwd(), 'test-models'));
      newManager.importRegistry(exported);

      const active = newManager.getActiveVersion('churnPredictor');
      expect(active?.version).toBe('v1.0');
      expect(active?.accuracy).toBe(0.85);
    });
  });

  describe('ABTestingStrategy', () => {
    let abTesting: ABTestingStrategy;

    beforeEach(() => {
      versionManager.registerVersion('churnPredictor', 'v1.0', {
        modelPath: '/models/v1.0.onnx'
      });
      versionManager.registerVersion('churnPredictor', 'v1.1', {
        modelPath: '/models/v1.1.onnx'
      });
      abTesting = new ABTestingStrategy(versionManager);
    });

    it('should configure A/B test with valid splits', () => {
      abTesting.configureTest('churnPredictor', {
        'v1.0': 0.5,
        'v1.1': 0.5
      });

      const config = abTesting.getTestConfig('churnPredictor');
      expect(config).toEqual({ 'v1.0': 0.5, 'v1.1': 0.5 });
    });

    it('should reject invalid traffic splits', () => {
      expect(() => {
        abTesting.configureTest('churnPredictor', {
          'v1.0': 0.6,
          'v1.1': 0.5 // Sum = 1.1, invalid
        });
      }).toThrow('Traffic splits must sum to 1.0');
    });

    it('should reject non-existent versions', () => {
      expect(() => {
        abTesting.configureTest('churnPredictor', {
          'v1.0': 0.5,
          'v2.0': 0.5 // Doesn't exist
        });
      }).toThrow('Version v2.0 not found');
    });

    it('should consistently route same entity to same version', () => {
      abTesting.configureTest('churnPredictor', {
        'v1.0': 0.5,
        'v1.1': 0.5
      });

      const userId = 'user-123';
      const version1 = abTesting.selectVersion('churnPredictor', userId);
      const version2 = abTesting.selectVersion('churnPredictor', userId);

      expect(version1).toBe(version2); // Same user gets same version
    });

    it('should distribute traffic according to splits', () => {
      abTesting.configureTest('churnPredictor', {
        'v1.0': 0.7,
        'v1.1': 0.3
      });

      const results = { 'v1.0': 0, 'v1.1': 0 };
      
      // Test with 1000 different users
      for (let i = 0; i < 1000; i++) {
        const version = abTesting.selectVersion('churnPredictor', `user-${i}`);
        if (version) (results as any)[version]++;
      }

      // Should be roughly 70/30 split (allow 10% variance)
      expect(results['v1.0']).toBeGreaterThan(600);
      expect(results['v1.0']).toBeLessThan(800);
      expect(results['v1.1']).toBeGreaterThan(200);
      expect(results['v1.1']).toBeLessThan(400);
    });

    it('should promote winner and stop A/B test', () => {
      abTesting.configureTest('churnPredictor', {
        'v1.0': 0.5,
        'v1.1': 0.5
      });

      abTesting.promoteWinner('churnPredictor', 'v1.1');

      const config = abTesting.getTestConfig('churnPredictor');
      expect(config).toBeNull(); // Test stopped

      const active = versionManager.getActiveVersion('churnPredictor');
      expect(active?.version).toBe('v1.1'); // Winner activated
    });

    it('should fallback to active version when no A/B test configured', () => {
      versionManager.activateVersion('churnPredictor', 'v1.0');

      const version = abTesting.selectVersion('churnPredictor', 'user-123');
      expect(version).toBe('v1.0');
    });
  });
});
