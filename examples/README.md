# PrisML Examples

This directory contains example models and usage patterns for PrisML.

## File Naming Convention

- **`model.ts`** - Actual ML model definitions (churn-prediction, fraud-detection)
- **`example.ts`** - Demonstration/usage code (batch-predictions, model-versioning)
- **`test-*.ts`** - Testing utilities

---

## Examples Overview

### 1. Churn Prediction (`churn-prediction/`)

Basic binary classification model predicting user churn.

**Features:**
- `daysSinceLastLogin` - Days since user's last login
- `totalSpent` - Total amount spent by user

**Documentation:** See [churn-prediction/README.md](./churn-prediction/README.md)

**Usage:**
```bash
# Train the model
npx prisml train -f examples/churn-prediction/model.ts

# Use in production (see test-extension.ts)
```

**Use Case:** Identify users at risk of churning to trigger retention campaigns.

---

### 2. Fraud Detection (`fraud-detection/`)

Advanced fraud detection model for e-commerce transactions.

**Features:**
- Transaction amount patterns
- Account age and verification
- Geographic patterns
- Temporal patterns
- Transaction history

**Documentation:** See [fraud-detection/README.md](./fraud-detection/README.md)

**Usage:**
```bash
npx prisml train -f examples/fraud-detection/model.ts
```

**Use Case:** Real-time fraud detection for payment processing.

---

### 3. Batch Predictions (`batch-predictions/`)

Efficiently process predictions for multiple entities with parallel ONNX inference.

**Features:**
- Parallel batch processing
- Customer segmentation
- Daily retention campaigns
- Performance optimization (5-10x faster)

**Documentation:** See [batch-predictions/README.md](./batch-predictions/README.md)

**Usage:**
```typescript
const users = await prisma.user.withMLMany({
  where: { createdAt: { gte: lastWeek } },
  take: 100
});
```

**Use Case:** Analytics dashboards, scheduled jobs, bulk processing.

---

### 4. Model Versioning (`model-versioning/`)

Demonstration of PrisML's version management and A/B testing capabilities.

**Features:**
- Version registration and tracking
- A/B testing with traffic splits
- Performance comparison
- Safe rollback procedures

**Documentation:** See [model-versioning/README.md](./model-versioning/README.md)

**Usage:**
```typescript
const versionManager = new ModelVersionManager('./models');
versionManager.activateVersion('churnPredictor', 'v2.0');
```

**Use Case:** Production deployments, canary releases, performance monitoring.

---

### 3. Test Files

#### `test-extension.ts`
Tests the Prisma Client extension API (recommended for production).

**Run:**
```bash
# After training churn-prediction model
ts-node examples/test-extension.ts
```

**Features:**
- Single prediction via `prisma.user.withML()`
- Batch predictions
- Accuracy testing

#### `test-inference.ts`
Tests direct ONNX inference without Prisma extension.

**Run:**
```bash
# After training churn-prediction model
ts-node examples/test-inference.ts
```

**Use Case:** Debugging, performance testing, understanding the engine.

---

## Getting Started

### 1. Setup Database

Ensure you have a Prisma schema with a User model:

```prisma
model User {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  lastLogin   DateTime
  totalSpent  Float    @default(0)
  isChurned   Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

### 2. Seed Data

```bash
npx prisma db seed
```

### 3. Train Model

```bash
npx prisml train -f examples/churn-prediction/model.ts
```

### 4. Run Examples

```bash
# Test extension API
ts-node examples/test-extension.ts

# Test direct inference
ts-node examples/test-inference.ts
```

---

## Production Patterns

### Recommended: Extension API

```typescript
import { PrismaClient } from '@prisma/client';
import { prisml } from 'prisml';
import { churnPredictor } from './examples/churn-prediction/model';

const prisma = new PrismaClient().$extends(prisml([churnPredictor]));

// Query with predictions
const user = await prisma.user.withML({ where: { id: 123 } });

// @ts-expect-error - _ml field added by extension
if (user._ml.churnProbability > 0.7) {
  await sendRetentionEmail(user.email);
}
```

### Advanced: Direct Engine Usage

```typescript
import { ONNXInferenceEngine } from 'prisml';
import { churnPredictor } from './examples/churn-prediction/model';

const engine = new ONNXInferenceEngine(churnPredictor);
await engine.initialize();

const user = await prisma.user.findUnique({ where: { id: 123 } });
const prediction = await engine.predict(user);
```

---

## Creating Your Own Model

1. **Define Features:**
```typescript
import { defineModel } from 'prisml';

export const myModel = defineModel<MyPrismaType>({
  target: 'MyTable',
  output: 'myPrediction',
  features: {
    feature1: {
      type: 'Float',
      resolve: (entity) => entity.someField
    }
  },
  config: {
    algorithm: 'RandomForest',
    minAccuracy: 0.75
  }
});

myModel.name = 'myModel';
```

2. **Train:**
```bash
npx prisml train -f path/to/your/model.ts
```

3. **Use:**
```typescript
const prisma = new PrismaClient().$extends(prisml([myModel]));
const result = await prisma.myTable.withML({ where: { id: 1 } });
```

---

## Best Practices

1. **Start Simple:** Begin with 2-3 features, test, then expand
2. **Handle Nulls:** Always handle null/undefined values in resolve functions
3. **Test Locally:** Use test files to verify before production deployment
4. **Monitor Performance:** Track prediction accuracy and retrain regularly
5. **Version Models:** Commit ONNX files to git for reproducibility

---

## Troubleshooting

See [docs/TROUBLESHOOTING.md](../docs/TROUBLESHOOTING.md) for common issues and solutions.

## More Examples

Looking for more examples? Check:
- [docs/README.md](../docs/README.md) - API documentation with examples
- [fraud-detection/](./fraud-detection/) - Advanced fraud detection
