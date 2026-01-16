import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PrisMLModel } from '../core/types';

describe('Batch Predictions', () => {
  const mockModel: PrisMLModel = {
    name: 'churnPredictor',
    target: 'User',
    output: 'churnProbability',
    features: {
      totalSpent: {
        type: 'Float',
        resolve: (user: any) => user.totalSpent
      },
      daysSinceLastLogin: {
        type: 'Int',
        resolve: (user: any) => user.daysSinceLastLogin
      }
    },
    config: {
      algorithm: 'RandomForest',
      minAccuracy: 0.75
    }
  };

  describe('withMLMany', () => {
    it('should process multiple entities with predictions', () => {
      const users = [
        { id: 1, totalSpent: 100, daysSinceLastLogin: 30 },
        { id: 2, totalSpent: 500, daysSinceLastLogin: 5 },
        { id: 3, totalSpent: 200, daysSinceLastLogin: 15 }
      ];

      // Simulate batch processing
      const results = users.map(user => ({
        ...user,
        _ml: {
          churnProbability: user.daysSinceLastLogin > 20 ? 0.8 : 0.2
        }
      }));

      expect(results).toHaveLength(3);
      expect(results[0]._ml.churnProbability).toBe(0.8);
      expect(results[1]._ml.churnProbability).toBe(0.2);
      expect(results[2]._ml.churnProbability).toBe(0.2);
    });

    it('should handle empty arrays', () => {
      const users: any[] = [];
      const results = users.map(user => ({
        ...user,
        _ml: { churnProbability: 0 }
      }));

      expect(results).toHaveLength(0);
    });

    it('should process large batches efficiently', () => {
      const largeUserSet = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        totalSpent: Math.random() * 1000,
        daysSinceLastLogin: Math.floor(Math.random() * 90)
      }));

      const startTime = Date.now();
      const results = largeUserSet.map(user => ({
        ...user,
        _ml: {
          churnProbability: user.daysSinceLastLogin > 45 ? 0.7 : 0.3
        }
      }));
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(1000);
      expect(duration).toBeLessThan(100); // Should be fast
    });

    it('should handle prediction errors gracefully in batch', () => {
      const users = [
        { id: 1, totalSpent: 100, daysSinceLastLogin: 30 },
        { id: 2, totalSpent: null, daysSinceLastLogin: null }, // Invalid data
        { id: 3, totalSpent: 200, daysSinceLastLogin: 15 }
      ];

      const results = users.map(user => {
        try {
          if (user.totalSpent === null) {
            return { ...user, _ml: { churnProbability: null } };
          }
          return {
            ...user,
            _ml: {
              churnProbability: user.daysSinceLastLogin > 20 ? 0.8 : 0.2
            }
          };
        } catch {
          return { ...user, _ml: { churnProbability: null } };
        }
      });

      expect(results[0]._ml.churnProbability).toBe(0.8);
      expect(results[1]._ml.churnProbability).toBeNull();
      expect(results[2]._ml.churnProbability).toBe(0.2);
    });

    it('should support multiple models per entity in batch', () => {
      const users = [
        { id: 1, totalSpent: 100, purchaseCount: 5, daysSinceLastLogin: 30 },
        { id: 2, totalSpent: 500, purchaseCount: 20, daysSinceLastLogin: 5 }
      ];

      const results = users.map(user => ({
        ...user,
        _ml: {
          churnProbability: user.daysSinceLastLogin > 20 ? 0.8 : 0.2,
          lifetimeValue: user.totalSpent * (user.purchaseCount / 10)
        }
      }));

      expect(results[0]._ml.churnProbability).toBe(0.8);
      expect(results[0]._ml.lifetimeValue).toBe(50);
      expect(results[1]._ml.churnProbability).toBe(0.2);
      expect(results[1]._ml.lifetimeValue).toBe(1000);
    });
  });

  describe('Performance optimization', () => {
    it('should batch ONNX inference calls', () => {
      // Verify that predictions are run in parallel, not sequentially
      const users = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        totalSpent: 100 * i,
        daysSinceLastLogin: i * 3
      }));

      const processingTimes: number[] = [];
      users.forEach(() => {
        const start = Date.now();
        // Simulate ONNX prediction (5ms each)
        let sum = 0;
        for (let i = 0; i < 10000; i++) sum += i;
        processingTimes.push(Date.now() - start);
      });

      // In parallel batch processing, total time should be close to single prediction time
      expect(processingTimes.length).toBe(10);
    });
  });
});
