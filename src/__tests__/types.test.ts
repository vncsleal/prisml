/**
 * Unit Tests: Core Types
 */

import { describe, it, expect } from 'vitest';
import { defineModel } from '../core/types';

describe('defineModel', () => {
  it('should create a valid model definition', () => {
    const model = defineModel({
      target: 'User',
      output: 'churnProbability',
      features: {
        age: {
          type: 'Int',
          resolve: (user: any) => user.age
        }
      }
    });

    expect(model.target).toBe('User');
    expect(model.output).toBe('churnProbability');
    expect(model.features.age).toBeDefined();
    expect(model.features.age.type).toBe('Int');
  });

  it('should use default config values', () => {
    const model = defineModel({
      target: 'User',
      output: 'score',
      features: {
        value: {
          type: 'Float',
          resolve: (u: any) => u.value
        }
      }
    });

    // Config is optional, so we need to check or set defaults
    expect(model.config?.algorithm).toBeUndefined();
    expect(model.config?.minAccuracy).toBeUndefined();
    expect(model.config?.testSplit).toBeUndefined();
  });

  it('should allow custom config values', () => {
    const model = defineModel({
      target: 'User',
      output: 'score',
      features: {
        value: {
          type: 'Float',
          resolve: (u: any) => u.value
        }
      },
      config: {
        algorithm: 'XGBoost',
        minAccuracy: 0.85,
        testSplit: 0.3
      }
    });

    expect(model.config?.algorithm).toBe('XGBoost');
    expect(model.config?.minAccuracy).toBe(0.85);
    expect(model.config?.testSplit).toBe(0.3);
  });

  it('should support multiple features', () => {
    const model = defineModel({
      target: 'Order',
      output: 'fraudScore',
      features: {
        amount: {
          type: 'Float',
          resolve: (order: any) => order.amount
        },
        itemCount: {
          type: 'Int',
          resolve: (order: any) => order.items.length
        },
        isInternational: {
          type: 'Boolean',
          resolve: (order: any) => order.country !== 'US'
        }
      }
    });

    expect(Object.keys(model.features)).toHaveLength(3);
    expect(model.features.amount.type).toBe('Float');
    expect(model.features.itemCount.type).toBe('Int');
    expect(model.features.isInternational.type).toBe('Boolean');
  });

  it('should execute feature resolve functions', () => {
    const model = defineModel({
      target: 'User',
      output: 'score',
      features: {
        computedValue: {
          type: 'Float',
          resolve: (user: any) => user.a + user.b
        }
      }
    });

    const result = model.features.computedValue.resolve({ a: 10, b: 20 });
    expect(result).toBe(30);
  });
});
