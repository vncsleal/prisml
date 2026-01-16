# PrisML

**Type-safe ML for Prisma - Train and deploy ML models directly from your database schema**

[![Status](https://img.shields.io/badge/status-alpha-orange)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

## Philosophy

Define features in TypeScript, train with Python/scikit-learn, deploy with ONNX in Node.js - no microservices, no Python runtime in production.

## Quick Start

### 1. Install
```bash
npm install prisml
```

### 2. Define Model
```typescript
// ml/churn.ts
import { defineModel } from 'prisml';

export const churnModel = defineModel({
  target: 'User',
  output: 'churnProbability',
  features: {
    daysSinceLastLogin: {
      type: 'Float',
      resolve: (user) => {
        const now = new Date();
        return (now.getTime() - new Date(user.lastLogin).getTime()) / 86400000;
      }
    },
    totalSpent: {
      type: 'Float',
      resolve: (user) => user.totalSpent
    }
  },
  config: {
    algorithm: 'RandomForest',
    minAccuracy: 0.75
  }
});

churnModel.name = 'churnPredictor';
```

### 3. Train
```bash
npx prisml train -f ml/churn.ts
```

Automatically extracts data from your Prisma database and trains the model.

### 4. Query
```typescript
import { PrismaClient } from '@prisma/client';
import { prisml } from 'prisml';
import { churnModel } from './ml/churn';

const prisma = new PrismaClient().$extends(prisml([churnModel]));

const user = await prisma.user.withML({ where: { id: 1 } });

if (user._ml.churnProbability > 0.8) {
  // Send retention email...
}
```

## Key Features

- **Prisma-Native** - Auto-extracts training data from your database
- **Type-Safe** - Features defined in TypeScript
- **Zero-Config** - Docker handles Python automatically
- **Quality Gates** - Build fails if accuracy < threshold
- **Fast Inference** - <10ms predictions with ONNX
- **No Runtime Deps** - Pure Node.js in production

## Documentation

- **[API Reference](./docs/README.md)** - Complete API and usage guide
- **[Architecture](./docs/ARCHITECTURE.md)** - System design and technical details
- **[Roadmap](./docs/ROADMAP.md)** - Implementation status and future plans
- **[Product Requirements](./docs/PRD.md)** - Product vision and requirements

## Training Environment

**Docker** (Recommended) - Auto-detected and used automatically:
```bash
npx prisml train
```

**Local Python** (Advanced) - Requires Python 3.8+ with dependencies:
```bash
pip install scikit-learn>=1.3.0 onnx>=1.15.0 skl2onnx>=1.16.0 xgboost>=2.0.0
npx prisml train
```

See [docs/README.md](./docs/README.md) for feature engineering best practices, architecture details, and troubleshooting.

## CI/CD Integration

### GitHub Actions
```yaml
name: Train ML Models

on:
  push:
    paths:
      - 'prisma/ml/**'

jobs:
  train:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx prisml train --all
      - run: |
          git config user.name "PrisML Bot"
          git add prisml/generated/
          git commit -m "chore: retrain models" || true
          git push
```

## Troubleshooting

### "Python not found"
Install Docker (recommended) or Python 3.8+

### "Training failed: Accuracy below threshold"
- Add more training data
- Try different algorithm: `algorithm: 'XGBoost'`
- Lower threshold: `minAccuracy: 0.65`

### "No data found in table"
Check DATABASE_URL in .env and ensure table has data

## Command Reference

```bash
# Training
npx prisml train -f ml/model.ts    # Train specific model
npx prisml train --all             # Train all models
npx prisml train --use-docker      # Force Docker
npx prisml train --use-local-python # Force local Python

# Validation
npx prisml check                   # Verify definitions
npx prisml validate                # Check model quality
```

## Examples

See [`examples/`](./examples) directory for complete examples.

## License

MIT

Copyright © 2026 PrisML Contributors
See [docs/README.md#troubleshooting](./docs/README.md#troubleshooting) for common issues and solutions.