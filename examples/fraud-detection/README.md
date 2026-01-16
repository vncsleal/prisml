# Fraud Detection Example

This example demonstrates using PrisML to build a real-time fraud detection system for e-commerce transactions.

## Overview

The fraud detector analyzes transactions in real-time to identify potentially fraudulent activity based on:
- Transaction amount patterns
- Account age and verification status
- Geographic patterns (international vs domestic)
- Temporal patterns (time of day, day of week)
- User transaction history

## Schema

```prisma
// schema.prisma
model User {
  id                Int           @id @default(autoincrement())
  email             String        @unique
  createdAt         DateTime      @default(now())
  isVerified        Boolean       @default(false)
  totalTransactions Int           @default(0)
  totalSpent        Float         @default(0)
  transactions      Transaction[]
}

model Transaction {
  id               Int      @id @default(autoincrement())
  amount           Float
  currency         String   @default("USD")
  createdAt        DateTime @default(now())
  ipAddress        String
  deviceId         String
  isInternational  Boolean  @default(false)
  isFraud          Boolean  @default(false) // Label for training
  userId           Int
  user             User     @relation(fields: [userId], references: [id])
}
```

## Training

```bash
# 1. Ensure database has labeled transaction data
npx prisma db seed

# 2. Train the fraud detection model
npx prisml train -f examples/fraud-detection/model.ts

# Expected output:
# Extracted 5000 samples in 234ms
# Training with docker backend (XGBoost)...
# Training Complete!
# Accuracy: 92.3%
```

## Production Usage

```typescript
import { PrismaClient } from '@prisma/client';
import { prisml } from 'prisml';
import { fraudDetector } from './examples/fraud-detection/model';

const prisma = new PrismaClient().$extends(prisml([fraudDetector]));

// Process new transaction
async function processPayment(transactionId: number) {
  const tx = await prisma.transaction.withML({
    where: { id: transactionId },
    include: { user: true } // Required for user features
  });
  
  // @ts-expect-error - _ml added by extension
  const fraudScore = tx._ml.fraudScore;
  
  if (fraudScore > 0.8) {
    // High risk - block and review
    await blockTransaction(tx.id);
    await notifyFraudTeam(tx.id, fraudScore);
    return { approved: false, reason: 'fraud_risk' };
  } else if (fraudScore > 0.5) {
    // Medium risk - require additional verification
    await require2FA(tx.userId);
    return { approved: false, reason: 'verification_required' };
  } else {
    // Low risk - approve
    await approveTransaction(tx.id);
    return { approved: true };
  }
}
```

## Features Explained

### amountRatio
Compares transaction amount to user's historical average. Unusually large transactions score higher.

### accountAge
Newer accounts are more likely to be fraudulent. Measured in days since account creation.

### isInternational
International transactions have higher fraud rates in many industries.

### isVerified
Unverified accounts (no email/phone confirmation) are higher risk.

### transactionCount
Users with no transaction history are higher risk.

### hourOfDay & dayOfWeek
Fraud patterns vary by time. For example, more fraud occurs late at night (2-5am).

### amountCents
Log-scaled transaction amount handles wide range ($1 to $10,000+).

## Monitoring & Improvement

### 1. Track Predictions
```typescript
// Log predictions for analysis
await prisma.fraudPrediction.create({
  data: {
    transactionId: tx.id,
    score: fraudScore,
    wasBlocked: fraudScore > 0.8,
    timestamp: new Date()
  }
});
```

### 2. Update Labels
```typescript
// After investigation, update ground truth
await prisma.transaction.update({
  where: { id: transactionId },
  data: { isFraud: true } // Confirmed fraud
});
```

### 3. Retrain Regularly
```bash
# Weekly retraining to adapt to new patterns
npx prisml train -f examples/fraud-detection/model.ts

# Commit updated model
git add prisml/generated/fraudDetector.onnx
git commit -m "retrain: update fraud model (week 23)"
```

## Performance Metrics

- **Training Time:** ~30 seconds for 10,000 transactions
- **Inference Time:** <5ms per transaction
- **Memory:** ~20MB for model
- **Accuracy:** 85-95% (varies by data quality)

## Common Issues

### Low Accuracy (<85%)

1. **Imbalanced dataset** - Ensure mix of fraud/legitimate:
   ```sql
   SELECT isFraud, COUNT(*) FROM "Transaction" GROUP BY isFraud;
   -- Should be roughly 10-20% fraud
   ```

2. **Need more features** - Add:
   - Device fingerprinting
   - Geolocation distance from previous transactions
   - Velocity (transactions per hour)

3. **More training data** - Aim for 5,000+ transactions

### False Positives

If blocking too many legitimate transactions:
- Increase threshold: `fraudScore > 0.9`
- Add whitelist for verified users
- Use 2FA instead of blocking for medium risk

### False Negatives

If missing too much fraud:
- Lower threshold: `fraudScore > 0.6`
- Add more fraud indicators as features
- Retrain with recent fraud cases

## CI/CD Integration

```yaml
# .github/workflows/retrain-fraud-model.yml
name: Retrain Fraud Model
on:
  schedule:
    - cron: '0 0 * * 0' # Weekly
  workflow_dispatch:

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
        run: npx prisml train -f examples/fraud-detection/model.ts
      - name: Commit model
        run: |
          git config user.name "PrisML Bot"
          git add prisml/generated/
          git commit -m "retrain: fraud model $(date +%Y-%m-%d)"
          git push
```

## Advanced: A/B Testing

Test new models before deploying:

```typescript
// Load both models
const fraudDetectorV1 = loadModel('fraudDetector-v1');
const fraudDetectorV2 = loadModel('fraudDetector-v2');

// Randomly assign users
const useV2 = Math.random() < 0.1; // 10% on new model

const score = useV2
  ? await fraudDetectorV2.predict(tx)
  : await fraudDetectorV1.predict(tx);

// Track performance by version
await logPrediction(tx.id, score, useV2 ? 'v2' : 'v1');
```

## License

MIT
