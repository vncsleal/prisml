# Troubleshooting Guide

## Table of Contents

- [Installation Issues](#installation-issues)
- [Database Connection](#database-connection)
- [Training Errors](#training-errors)
- [Inference Errors](#inference-errors)
- [Type Safety](#type-safety)
- [Performance Issues](#performance-issues)

---

## Installation Issues

### "Cannot find module 'prisml'"

**Problem:** Package not installed or not found in node_modules.

**Solution:**
```bash
npm install prisml
# or
pnpm add prisml
# or
yarn add prisml
```

### "Command 'prisml' not found"

**Problem:** CLI binary not in PATH.

**Solution:**
```bash
# Use with npx
npx prisml train -f ml/model.ts

# Or install globally
npm install -g prisml
prisml train
```

---

## Database Connection

### DatabaseConnectionError: Failed to connect to database

**Symptoms:**
- Training fails immediately
- Error mentions DATABASE_URL

**Common Causes:**

1. **Missing .env file**
   ```bash
   # Create .env file
   DATABASE_URL="postgresql://user:password@localhost:5432/mydb"
   ```

2. **Incorrect connection string format**
   ```bash
   # Correct format
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
   
   # For Neon (serverless)
   DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require"
   ```

3. **Database not running**
   ```bash
   # Check if PostgreSQL is running
   pg_isready
   
   # Start PostgreSQL
   brew services start postgresql  # macOS
   sudo service postgresql start   # Linux
   ```

4. **Firewall blocking connection**
   - Check database host firewall rules
   - Verify SSL requirements for cloud databases
   - Test connection: `psql $DATABASE_URL`

---

## Training Errors

### NoDataError: No training data found

**Problem:** The target table is empty or doesn't exist.

**Solutions:**

1. **Verify table exists:**
   ```sql
   SELECT COUNT(*) FROM "User";
   ```

2. **Run Prisma migrations:**
   ```bash
   npx prisma migrate deploy
   ```

3. **Seed database:**
   ```bash
   npx prisma db seed
   ```

4. **Check Prisma model name matches:**
   ```typescript
   // Ensure this matches your schema.prisma
   defineModel({
     target: 'User',  // Must match: model User { ... }
     // ...
   });
   ```

### TrainingFailedError: Accuracy below threshold

**Problem:** Model accuracy is below `minAccuracy` setting.

**Example:**
```
Model accuracy 65.0% is below threshold 75.0%
```

**Solutions:**

1. **Increase training data size**
   - Aim for 1000+ samples minimum
   - More data = better accuracy

2. **Try different algorithms**
   ```typescript
   config: {
     algorithm: 'XGBoost',  // Often more accurate
     minAccuracy: 0.75
   }
   ```

3. **Add more predictive features**
   ```typescript
   features: {
     // Add features that correlate with target
     daysSinceLastLogin: { ... },
     totalSpent: { ... },
     orderCount: { ... },  // New feature
     avgOrderValue: { ... }  // New feature
   }
   ```

4. **Lower threshold temporarily**
   ```typescript
   config: {
     minAccuracy: 0.65  // Lower for testing
   }
   ```

5. **Check data quality**
   - Look for null values
   - Check for outliers
   - Verify label distribution
   ```sql
   SELECT isChurned, COUNT(*) 
   FROM "User" 
   GROUP BY isChurned;
   -- Ensure balanced classes (not 99% one class)
   ```

### PythonNotFoundError: Docker/Python not available

**Problem:** No training backend available.

**Solutions:**

1. **Install Docker (Recommended):**
   - Download: https://www.docker.com/products/docker-desktop
   - Verify: `docker --version`
   - PrisML auto-detects and uses Docker

2. **Or install Python locally:**
   ```bash
   # macOS
   brew install python@3.11
   
   # Ubuntu
   sudo apt install python3 python3-pip
   
   # Install dependencies
   pip install scikit-learn onnx skl2onnx xgboost
   ```

### FeatureExtractionError: Failed to extract feature

**Problem:** Feature resolve function threw an error.

**Example:**
```
Failed to extract feature 'daysSinceLastLogin'
Field: lastLogin
Error: Cannot read property 'getTime' of null
```

**Solutions:**

1. **Handle null values**
   ```typescript
   features: {
     daysSinceLastLogin: {
       type: 'Int',
       resolve: (user) => {
         if (!user.lastLogin) return 0;  // Handle null
         const now = new Date();
         return Math.floor((now - user.lastLogin) / 86400000);
       }
     }
   }
   ```

2. **Check field exists in schema**
   ```prisma
   // schema.prisma
   model User {
     id        Int      @id
     lastLogin DateTime?  // Field must exist
   }
   ```

3. **Test resolve function manually**
   ```typescript
   const testUser = { lastLogin: new Date() };
   const result = features.daysSinceLastLogin.resolve(testUser);
   console.log(result);  // Should be a number
   ```

---

## Inference Errors

### ModelNotFoundError: Trained model not found

**Problem:** ONNX model file doesn't exist.

**Solutions:**

1. **Train the model first:**
   ```bash
   npx prisml train -f ml/churn.ts
   ```

2. **Verify model file exists:**
   ```bash
   ls -la prisml/generated/
   # Should see: churnPredictor.onnx
   ```

3. **Check model name matches:**
   ```typescript
   // ml/churn.ts
   export const churnPredictor = defineModel({ ... });
   
   // Must match in prisma extension
   const prisma = new PrismaClient().$extends(prisml([churnPredictor]));
   ```

### InferenceNotInitializedError: Engine not initialized

**Problem:** Trying to predict before calling `initialize()`.

**Solution:**
```typescript
const engine = new ONNXInferenceEngine(model);

// MUST call initialize before predict
await engine.initialize();

// Now predictions work
const prediction = await engine.predict(user);
```

### ModelLoadError: Failed to load ONNX model

**Problem:** ONNX file is corrupted or incompatible.

**Solutions:**

1. **Retrain the model:**
   ```bash
   rm prisml/generated/*.onnx
   npx prisml train
   ```

2. **Check ONNX runtime version:**
   ```bash
   npm list onnxruntime-node
   # Should be >= 1.14.0
   ```

3. **Verify Python export:**
   - Ensure scikit-learn and skl2onnx are up to date
   - Check scripts/train.py for export errors

---

## Type Safety

### "Property does not exist on type"

**Problem:** TypeScript complains about fields used in features.

**Example:**
```typescript
// Error: Property 'lastLogin' does not exist on type 'User'
resolve: (user) => user.lastLogin
```

**Solutions:**

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Use correct type annotation:**
   ```typescript
   import { User } from '@prisma/client';
   
   const model = defineModel<User>({
     target: 'User',
     features: {
       daysSince: {
         type: 'Int',
         resolve: (user) => user.lastLogin  // Now type-safe
       }
     }
   });
   ```

3. **Use type assertion for dynamic fields:**
   ```typescript
   resolve: (user: any) => user.customField
   ```

### "_ml property does not exist"

**Problem:** TypeScript doesn't know about `_ml` field.

**Solution:**
```typescript
// Add @ts-expect-error directive
// @ts-expect-error - _ml field added by extension
const prediction = user._ml.churnProbability;

// Or cast to any
const prediction = (user as any)._ml.churnProbability;
```

---

## Performance Issues

### Slow training (>5 minutes)

**Causes & Solutions:**

1. **Too much data:**
   ```typescript
   // Limit training set size
   const dataset = await extractor.extractTrainingData(model, {
     batchSize: 1000,
     limit: 10000  // Cap at 10k samples
   });
   ```

2. **Complex features:**
   - Simplify resolve functions
   - Avoid expensive calculations
   - Pre-compute values in database

3. **Algorithm choice:**
   ```typescript
   config: {
     algorithm: 'LogisticRegression'  // Faster than XGBoost
   }
   ```

### Slow inference (>100ms per prediction)

**Causes & Solutions:**

1. **Model not cached:**
   - Extension automatically caches engines
   - First prediction is slower (model loading)
   - Subsequent predictions are <10ms

2. **Complex feature extraction:**
   ```typescript
   // Avoid database queries in resolve
   resolve: async (user) => {
     // DON'T DO THIS
     const orders = await prisma.order.findMany({ ... });
     return orders.length;
   }
   
   // Instead: pre-compute in database
   resolve: (user) => user.orderCount
   ```

3. **Batch predictions:**
   ```typescript
   // Instead of N individual queries
   for (const id of ids) {
     const user = await prisma.user.withML({ where: { id } });
   }
   
   // Use predictBatch (if available)
   const users = await prisma.user.findMany();
   const predictions = await engine.predictBatch(users);
   ```

---

## Common Questions

### Q: Can I use PrisML with MongoDB?

**A:** Not yet. V1 supports PostgreSQL, MySQL, and SQLite. MongoDB support is planned for V2.

### Q: How do I update a trained model?

**A:** Retrain and commit the new ONNX file:
```bash
npx prisml train
git add prisml/generated/
git commit -m "retrain: update churn model"
```

### Q: Can I use GPU for training?

**A:** Not in V1. Training uses scikit-learn on CPU. GPU support planned for V2 with PyTorch.

### Q: How do I debug feature extraction?

**A:** Add logging in resolve functions:
```typescript
resolve: (user) => {
  const value = user.totalSpent || 0;
  console.log(`Feature value for user ${user.id}: ${value}`);
  return value;
}
```

### Q: What if my model needs to be retrained regularly?

**A:** Set up CI/CD to retrain on schedule:
```yaml
# .github/workflows/retrain.yml
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
jobs:
  retrain:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx prisml train --all
      - run: git add prisml/generated/
      - run: git commit -m "chore: retrain models"
      - run: git push
```

---

## Getting Help

If you're still stuck:

1. Check [GitHub Issues](https://github.com/vncsleal/prisml/issues)
2. Review [docs/README.md](./README.md) for API reference
3. Open a new issue with:
   - Error message (full stack trace)
   - Minimal reproduction
   - Environment (Node version, OS, database)
