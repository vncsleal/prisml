# Model Versioning & A/B Testing

This example demonstrates PrisML's model versioning system and A/B testing capabilities for safe production deployments.

**File:** [example.ts](./example.ts)

## Overview

Model versioning allows you to:
- Track multiple model versions with performance metrics
- A/B test new models before full deployment
- Compare performance between versions
- Rollback to previous versions in emergencies
- Maintain version history and audit trail

## Features

### Version Management
- **Registration**: Track model versions with metadata and metrics
- **Activation**: Deploy specific versions to production
- **Comparison**: Compare accuracy and performance between versions
- **Rollback**: Revert to previous versions instantly
- **Cleanup**: Delete old, unused versions safely

### A/B Testing
- **Traffic Splitting**: Configure percentage splits (e.g., 70/30)
- **Consistent Routing**: Same users always get same version
- **Distribution Analysis**: Verify traffic distribution
- **Winner Promotion**: Graduate successful tests to 100% traffic

## Quick Start

```typescript
import { ModelVersionManager, ABTestingStrategy } from 'prisml';

const versionManager = new ModelVersionManager('./models');

// Register a new version
versionManager.registerVersion('churnPredictor', 'v1.1', {
  modelPath: './models/churn-v1.1.onnx',
  accuracy: 0.87,
  metrics: {
    precision: 0.85,
    recall: 0.89,
    f1Score: 0.87
  }
});

// Deploy to production
versionManager.activateVersion('churnPredictor', 'v1.1');
```

## Usage Examples

### 1. Register Model Versions

```typescript
versionManager.registerVersion('churnPredictor', 'v2.0', {
  modelPath: '/models/churn-v2.0.onnx',
  accuracy: 0.89,
  metrics: {
    precision: 0.87,
    recall: 0.91,
    f1Score: 0.89
  },
  metadata: {
    trainingDate: new Date(),
    datasetSize: 20000,
    algorithm: 'XGBoost',
    features: ['totalSpent', 'daysSinceLastLogin', 'engagement', 'purchaseFrequency']
  }
});
```

### 2. Compare Versions

```typescript
const comparison = versionManager.compareVersions('churnPredictor', 'v1.0', 'v2.0');

console.log(`Accuracy improvement: +${comparison.accuracyDiff * 100}%`);
console.log(`Precision improvement: +${comparison.metricsDiff.precision * 100}%`);
```

### 3. A/B Testing Setup

```typescript
const abTesting = new ABTestingStrategy(versionManager);

// 80/20 split: 80% on stable v1.0, 20% testing v2.0
abTesting.configureTest('churnPredictor', {
  'v1.0': 0.8,
  'v2.0': 0.2
});

// Users are consistently routed to same version
const userId = 'user-123';
const version = abTesting.selectVersion('churnPredictor', userId);
console.log(`User ${userId} gets ${version}`); // Always same result
```

### 4. Traffic Distribution

```typescript
// Verify traffic distribution
const distribution = { 'v1.0': 0, 'v2.0': 0 };

for (let i = 0; i < 1000; i++) {
  const version = abTesting.selectVersion('churnPredictor', `user-${i}`);
  distribution[version]++;
}

console.log(`v1.0: ${distribution['v1.0']} users (${distribution['v1.0'] / 10}%)`);
console.log(`v2.0: ${distribution['v2.0']} users (${distribution['v2.0'] / 10}%)`);
```

### 5. Promote Winner

```typescript
// After A/B test shows v2.0 performs better
abTesting.promoteWinner('churnPredictor', 'v2.0');

// Now all users get v2.0
```

### 6. Emergency Rollback

```typescript
// Critical bug detected in v2.0
versionManager.rollback('churnPredictor', 'v1.0');

// System immediately reverts to stable v1.0
```

### 7. Version History

```typescript
const history = versionManager.getVersionHistory('churnPredictor');

console.log(`Current: ${history.currentVersion}`);
history.versions.forEach(v => {
  console.log(`${v.version}: ${v.accuracy} (${v.isActive ? 'active' : 'inactive'})`);
});
```

## Production Patterns

### Canary Deployment

```typescript
// Start with 5% traffic on new version
abTesting.configureTest('churnPredictor', {
  'v1.0': 0.95,
  'v2.0': 0.05
});

// Monitor for 24 hours...
// If metrics look good, increase to 25%
abTesting.configureTest('churnPredictor', {
  'v1.0': 0.75,
  'v2.0': 0.25
});

// Eventually promote to 100%
abTesting.promoteWinner('churnPredictor', 'v2.0');
```

### Blue-Green Deployment

```typescript
// Deploy new version but don't activate
versionManager.registerVersion('churnPredictor', 'v2.0', {...});

// Test on staging
// When ready, instant switch
versionManager.activateVersion('churnPredictor', 'v2.0');

// Instant rollback if needed
versionManager.rollback('churnPredictor', 'v1.0');
```

### Gradual Rollout

```typescript
// Week 1: 10% traffic
abTesting.configureTest('churnPredictor', { 'v1.0': 0.9, 'v2.0': 0.1 });

// Week 2: 30% traffic
abTesting.configureTest('churnPredictor', { 'v1.0': 0.7, 'v2.0': 0.3 });

// Week 3: 50% traffic
abTesting.configureTest('churnPredictor', { 'v1.0': 0.5, 'v2.0': 0.5 });

// Week 4: 100% if metrics are good
abTesting.promoteWinner('churnPredictor', 'v2.0');
```

## Persistence

Save and restore version registry across restarts:

```typescript
// Export to database or file
const registry = versionManager.exportRegistry();
await saveToDatabase(registry);

// Restore on startup
const savedRegistry = await loadFromDatabase();
versionManager.importRegistry(savedRegistry);
```

## Integration with Prisma Extension

```typescript
import { prisml } from 'prisml';
import { PrismaClient } from '@prisma/client';

// Version manager determines which model to use
const activeVersion = versionManager.getActiveVersion('churnPredictor');
const modelPath = activeVersion.modelPath;

// Load model from versioned path
const churnModel = defineModel({
  name: 'churnPredictor',
  modelPath: activeVersion.modelPath,
  // ... other config
});

const prisma = new PrismaClient().$extends(prisml([churnModel]));
```

## Monitoring

Track version performance in production:

```typescript
// Log prediction results by version
const version = versionManager.getActiveVersion('churnPredictor')?.version;

const result = await prisma.user.withML({ where: { id: userId } });

await analytics.track({
  event: 'ml_prediction',
  modelVersion: version,
  prediction: result._ml.churnProbability,
  userId
});
```

## Best Practices

1. **Always test new versions with A/B testing** before full deployment
2. **Start with small traffic percentages** (5-10%) for new models
3. **Monitor metrics closely** during A/B tests
4. **Keep previous version** until new version is fully validated
5. **Have rollback plan ready** for emergencies
6. **Document version changes** in metadata
7. **Clean up old versions** after validation period
8. **Persist registry** to database for production systems

## Metrics to Track

During A/B tests, monitor:
- **Model accuracy** on live data
- **Prediction latency** (p50, p95, p99)
- **Error rates** and exceptions
- **Business metrics** (churn reduction, fraud detection rate)
- **User experience** impact

## Troubleshooting

**Issue**: A/B test traffic split not matching expected distribution

**Solution**: 
- Ensure sufficient sample size (1000+ users)
- Check hash function consistency
- Verify version names match exactly

**Issue**: Cannot delete active version

**Solution**:
- Activate a different version first
- Then delete the old version

**Issue**: Version registry not persisting

**Solution**:
- Call `exportRegistry()` after version changes
- Save to database or file
- Call `importRegistry()` on startup

## Next Steps

- See [batch-predictions](../batch-predictions/) for efficient bulk processing
- See [fraud-detection](../fraud-detection/) for multi-feature models
- Check [TROUBLESHOOTING.md](../../docs/TROUBLESHOOTING.md) for common issues
