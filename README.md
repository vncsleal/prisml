# PrisML

**The Prisma of Predictive Fields.**

PrisML allows you to define, train, and query Machine Learning models directly within your TypeScript/Prisma application. Define features once in TypeScript, train with battle-tested Python ML libraries, deploy with zero runtime dependencies.

## 🎯 Philosophy

**Best of Both Worlds:**
- ✨ **Define** features in TypeScript (type-safe, DRY, integrated with Prisma)
- 🐍 **Train** with Python ML ecosystem (scikit-learn, XGBoost, your existing tooling)
- 🚀 **Deploy** as ONNX in Node.js (no Python runtime, no microservices, no cold starts)

**The Secret:** Your feature engineering code runs identically during training and inference, making train/serve skew **impossible**.

## 🚀 Quick Start

### 1. Define your Model
Create `ml.ts` in your project:

```typescript
import { defineModel } from 'prisml';
import { User } from '@prisma/client';

export const ChurnModel = defineModel<User>({
  target: 'User',
  output: 'churnProbability',
  features: {
    daysInactive: {
      type: 'Int',
      resolve: (user) => diffDays(now(), user.lastLogin)
    }
  }
});
```

### 2. Train (The Build Step)
PrisML extracts features from your database using the **same TypeScript code** that will run in production, then delegates to Python for training:

```bash
npx prisml train -f ml.ts
```

**What happens (automatically):**
1. PrisML detects if Docker is available
2. **If Docker found:** Pulls `prisml/trainer:latest` (contains Python + ML libraries)
3. **If no Docker:** Falls back to local Python (or warns for lite mode)
4. Prisma Client fetches your data (type-safe, optimized)
5. Your `resolve` functions extract features (guaranteed consistency)
6. Python subprocess trains the model (scikit-learn/XGBoost)
7. Model exported as ONNX (portable, optimized)
8. Artifact saved to `prisml/generated/` (commit to git)

**Requirements:** 
- ✅ **Recommended:** Docker Desktop (Python invisible, zero config)
- ⚠️ **Fallback:** Python 3.8+ with pip (manual setup)
- 💡 **CI/CD:** Use `prisml/trainer` Docker image (pre-configured)

### 3. Query (The Runtime)
Use the Prisma Client Extension to get predictions instantly:

```typescript
const user = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    _predictions: {
      churnProbability: true
    }
  }
});

if (user._predictions.churnProbability > 0.8) {
  // send email...
}
```

## �️ Installation

### Step 1: Install PrisML
```bash
npm install prisml
```

### Step 2: Choose Your Training Environment

**Option A: Docker (Recommended - Zero Python Setup)**
```bash
# Install Docker Desktop (if not already installed)
# macOS: brew install --cask docker
# Windows: Download from docker.com
# Linux: apt install docker.io

# That's it! PrisML auto-detects and uses Docker
npx prisml train
```

**Option B: Local Python (For Advanced Users)**
```bash
# Only if you prefer manual control
pip install scikit-learn>=1.3.0 onnx>=1.15.0 skl2onnx>=1.16.0 xgboost>=2.0.0

npx prisml train --use-local-python
```

**Option C: CI/CD (GitHub Actions)**
```yaml
# .github/workflows/train.yml
- uses: prisml/train-action@v1
  with:
    model-files: 'prisma/ml/**/*.ts'
```

**The "Invisible Python" Philosophy:**
You never interact with Python directly. Docker handles the complexity. Your `package.json` remains pure Node.js.

---

## 📚 Documentation

### Core Documentation
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - System design, build pipeline, runtime, deployment
- **[PRD.md](./docs/PRD.md)** - Product requirements, roadmap, implementation status
- **[YC_PLAN.md](./docs/YC_PLAN.md)** - Vision, strategy, monetization plan

### Quick Links
- [Feature Engineering Best Practices](#%EF%B8%8F-feature-engineering-best-practices)
- [CI/CD Integration](#-cicd-integration)  
- [Troubleshooting](#-troubleshooting)
- [Auto-Detection Strategy](#-auto-detection--fallback-strategy)

---

## 🔍 Auto-Detection & Fallback Strategy

PrisML intelligently chooses the best training method:

```
npx prisml train
         ↓
    [Detect Docker?]
         ↓
    YES → Use prisml/trainer:latest (fast, reliable)
         ↓
    NO → [Detect Python?]
         ↓
         YES → Use local Python (requires setup)
         ↓
         NO → [Dataset < 1000 rows?]
              ↓
              YES → Pure JS fallback (slow, experimental)
              ↓
              NO → ERROR: Install Docker or Python
```

**Override Options:**
```bash
npx prisml train --use-docker          # Force Docker
npx prisml train --use-local-python    # Force local Python
npx prisml train --use-js-fallback     # Force JS (experimental)
```

## 🎓 How It Works

### The Problem PrisML Solves

Traditional ML pipelines have a **train/serve skew** problem:

```python
# training.py
df['days_inactive'] = (now - df['last_login']).dt.days
df['avg_order'] = df['total_spent'] / df['order_count']  # Feature engineering
```

```typescript
// api/predict.ts (6 months later, different developer)
const daysInactive = daysSince(user.lastLogin);  // ❌ Forgot to divide!
const avgOrder = user.totalSpent / user.orderCount;
```

**Result:** Model trained on different data than it receives in production → degraded accuracy.

### PrisML's Solution

**Define features once:**
```typescript
export const ChurnModel = defineModel<User>({
  target: 'User',
  output: 'churnProbability',
  features: {
    daysInactive: {
      type: 'Int',
      resolve: (user) => Math.floor((Date.now() - user.lastLogin.getTime()) / 86400000)
    },
    avgOrderValue: {
      type: 'Float',
      resolve: (user) => user.totalSpent / (user.orderCount || 1)
    }
  }
});
```

**This code runs:**
- ✅ During training (via Prisma data extraction)
- ✅ During inference (via Prisma extension)
- ✅ Guaranteed identical logic
- ✅ TypeScript compiler enforces schema compatibility

### Why Python Subprocess?

You might wonder: "Why not pure TypeScript ML?"

**Because Python has:**
- Battle-tested algorithms (RandomForest, XGBoost, LightGBM)
- 20+ years of optimization (scikit-learn since 2007)
- GPU support for large datasets
- Your team's existing ML expertise

**PrisML's approach:**
- Feature engineering: TypeScript (your domain)
- Training: Python (ML experts' domain)  
- Inference: ONNX in Node.js (DevOps-friendly)

Think of it like TypeScript → JavaScript compilation. You write in one language, run in another, get the best of both.

## 🛠️ Feature Engineering Best Practices

### Keep Features Pure

❌ **Bad: Side effects**
```typescript
resolve: (user) => {
  console.log('Processing:', user.id);  // Don't log
  return user.totalSpent;
}
```

✅ **Good: Pure functions**
```typescript
resolve: (user) => user.totalSpent
```

### Handle Nulls Gracefully

✅ **Always provide defaults**
```typescript
resolve: (user) => {
  if (!user.orderCount || user.orderCount === 0) {
    return 0;
  }
  return user.totalSpent / user.orderCount;
}
```

### Use Deterministic Logic

❌ **Bad: Non-deterministic**
```typescript
resolve: (user) => Math.random()  // Different every time!
```

✅ **Good: Deterministic from entity**
```typescript
resolve: (user) => {
  const REFERENCE_DATE = new Date('2026-01-01');
  return Math.floor(
    (REFERENCE_DATE.getTime() - user.createdAt.getTime()) / 86400000
  );
}
```

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: Train ML Models

on:
  push:
    paths:
      - 'prisma/ml/**'
      - 'prisma/schema.prisma'

jobs:
  train:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      
      - run: npm ci
      - run: npx prisml train --all
      # Docker pre-installed on GitHub runners ✅
      
      - name: Commit artifacts
        run: |
          git config user.name "PrisML Bot"
          git add prisml/generated/
          git commit -m "chore: retrain models" || true
          git push
```

### Vercel/Netlify

```json
{
  "scripts": {
    "build": "npx prisml train && next build"
  }
}
```

Models are trained during build, deployed with your app.

## 🐛 Troubleshooting

### "Python not found"

**Solution:** Install Docker (recommended) or Python 3.8+
```bash
# macOS
brew install --cask docker

# Or use Python
brew install python@3.11
pip3 install scikit-learn onnx skl2onnx
```

### "Training failed: Accuracy below threshold"

**Solutions:**
- Add more training data
- Improve features
- Try different algorithm: `config: { algorithm: 'XGBoost' }`
- Lower threshold: `minAccuracy: 0.65`

### "ONNX inference error"

**Cause:** Features changed after training

**Fix:**
```bash
npx prisml train --force  # Retrain with new features
```

## 📦 Architecture

### Build Time (Development)
```
TypeScript Feature Definitions
         ↓
Prisma Data Extraction (Type-Safe)
         ↓
Python Subprocess (scikit-learn, XGBoost)
         ↓
ONNX Model Export
         ↓
Commit artifact to git
```

### Runtime (Production)
```
Node.js Application
         ↓
Prisma Client Extension
         ↓
In-Process ONNX Runtime (CPU)
         ↓
Sub-10ms predictions
```

**Key Principle:** Python only runs during `npm run build` / `prisml train`. Your production app has **zero Python dependencies**.

### Layers
1.  **Core (Sync):** Deterministic predictive fields (e.g. Churn, Fraud) - ONNX inference
2.  **Gen (Async):** Generative fields and vector search (Planned V2) - External APIs

---

## 🚀 Quick Command Reference

```bash
# Installation
npm install prisml

# Initialize project
npx prisml init

# Train models (auto-detects environment)
npx prisml train
npx prisml train --all           # Train all models
npx prisml train --use-docker    # Force Docker
npx prisml train --use-local-python  # Force local Python

# Validation
npx prisml check                 # Verify feature definitions
npx prisml validate              # Check model quality

# Development
npm run build                    # Build TypeScript
npm test                         # Run tests
npm run train                    # Custom script for training
```

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Areas we need help:**
- Additional ML algorithms (LightGBM, CatBoost)
- Example projects (more use cases)
- Performance optimizations
- Documentation improvements

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

**Copyright © 2026 PrisML Contributors**

---

## 🔗 Links

- **Documentation:** [/docs](/docs)
- **GitHub Issues:** [Report bugs](https://github.com/vinico/prisml/issues)
- **Discussions:** [Ask questions](https://github.com/vinico/prisml/discussions)
- **Twitter:** [@prisml_dev](https://twitter.com/prisml_dev)

---

**Built with ❤️ by developers who believe ML should be as easy as writing TypeScript.**
