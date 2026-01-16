# Churn Prediction Example

Basic binary classification model demonstrating PrisML fundamentals.

## Overview

Predicts whether a user is likely to churn (stop using the service) based on their login activity and spending patterns.

## Schema

```prisma
// schema.prisma
model User {
  id         Int      @id @default(autoincrement())
  email      String   @unique
  lastLogin  DateTime
  totalSpent Float    @default(0)
  isChurned  Boolean  @default(false) // Label for training
  createdAt  DateTime @default(now())
}
```

## Features

### daysSinceLastLogin
Days since the user's last login. Higher values indicate inactive users more likely to churn.

### totalSpent
Total amount the user has spent. Higher spending often correlates with lower churn.

## Training

```bash
# Train the model
npx prisml train -f examples/churn-prediction/model.ts

# Expected output:
# Extracted 500 samples in 123ms
# Training with docker backend (RandomForest)...
# Training Complete!
# Accuracy: 78.5%
```

## Usage with Extension API (Recommended)

```typescript
import { PrismaClient } from '@prisma/client';
import { prisml } from 'prisml';
import { churnPredictor } from './examples/churn-prediction/model';

const prisma = new PrismaClient().$extends(prisml([churnPredictor]));

// Query user with churn prediction
const user = await prisma.user.withML({ where: { id: 123 } });

// @ts-expect-error - _ml field added by extension
const churnRisk = user._ml.churnProbability;

if (churnRisk > 0.7) {
  console.log('High churn risk - send retention email');
  await sendRetentionEmail(user.email);
}
```

## Usage with Direct Engine

```typescript
import { ONNXInferenceEngine } from 'prisml';
import { churnPredictor } from './examples/churn-prediction/model';

const engine = new ONNXInferenceEngine(churnPredictor);
await engine.initialize();

const user = await prisma.user.findUnique({ where: { id: 123 } });
const churnProbability = await engine.predict(user);

console.log(`Churn Risk: ${(churnProbability * 100).toFixed(1)}%`);
```

## Interpreting Results

- **< 0.3** - Low risk: User is engaged and active
- **0.3 - 0.7** - Medium risk: Monitor user activity
- **> 0.7** - High risk: Immediate intervention needed

## Improving Accuracy

If accuracy is below target (75%):

1. **Add more features:**
   ```typescript
   features: {
     daysSinceLastLogin: { ... },
     totalSpent: { ... },
     orderCount: {  // New feature
       type: 'Int',
       resolve: (user) => user.orders?.length || 0
     },
     avgSessionDuration: {  // New feature
       type: 'Float',
       resolve: (user) => user.avgSessionMinutes || 0
     }
   }
   ```

2. **Increase training data:**
   - Aim for 1000+ labeled users
   - Ensure balanced dataset (not 95% one class)

3. **Try different algorithm:**
   ```typescript
   config: {
     algorithm: 'XGBoost',  // Often more accurate
     minAccuracy: 0.75
   }
   ```

## Monitoring in Production

Track prediction performance:

```typescript
// Log predictions for analysis
await prisma.churnPrediction.create({
  data: {
    userId: user.id,
    predictedScore: churnRisk,
    timestamp: new Date()
  }
});

// Weekly: Update labels based on actual churn
// Then retrain to improve accuracy
```

## Automated Retraining

```yaml
# .github/workflows/retrain-churn.yml
name: Retrain Churn Model
on:
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Mondays

jobs:
  retrain:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - name: Train model
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npx prisml train -f examples/churn-prediction/model.ts
      - name: Commit model
        run: |
          git add prisml/generated/
          git commit -m "retrain: churn model"
          git push
```

## Next Steps

- See [test-extension.ts](../test-extension.ts) for testing examples
- See [fraud-detection/](../fraud-detection/) for a more advanced example
- Read [docs/TROUBLESHOOTING.md](../../docs/TROUBLESHOOTING.md) for common issues
