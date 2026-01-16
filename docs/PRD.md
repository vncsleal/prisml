# Product Requirement Document (PRD): PrisML

**Project Name:** PrisML
**Version:** 2.0.0 (The "In-Process" Pivot)
**Status:** In Development
**Date:** 2026-01-14

---

## 1. Executive Summary

**PrisML** is a "Computed Columns on Steroids" engine for Prisma. It allows full-stack developers to define predictive fields (e.g., `churnRisk`, `leadScore`) in TypeScript that are:
1.  **Declared** alongside their database schema.
2.  **Compiled** into portable, strictly-versioned model artifacts (ONNX).
3.  **Executed** in-process within the Node.js runtime (zero external infrastructure).

It rejects the traditional "Python Sidecar" architecture in favor of a strictly typed, schema-driven approach that treats **Training as a Migration** and **Inference as a Query**.

---

## 2. Target Audience

*   **Primary:** TypeScript/Node.js Product Engineers using Prisma.
*   **Goal:** "I want to add a 'Spam Score' to my `Comment` model without learning MLOps, setting up Python, or paying for SageMaker."

---

## 3. Core Philosophy & Constraints

### 3.1 The "No-Go" List (Strict Bounds)
*   **No Deep Learning (V1):** We will not support large LLMs or Vision models in Core.
*   **No Online Learning:** Models are immutable artifacts generated at build time. No "learning on the fly."
*   **No Python Runtime:** The production app must run 100% in Node.js. Python is used only for the build-step (hidden from the user via Docker/CLI).

### 3.2 The "Must-Have" List
*   **Evaluation Gates:** `prisml push` must fail if the model accuracy drops below a defined threshold.
*   **Zero-Infra Runtime:** Inference must be a singleton `onnxruntime` instance sharing the App's event loop.
*   **Type Safety:** Feature inputs must be validated against the Prisma Schema at compile time.

---

## 4. Functional Requirements

### 4.1 Feature Definition (The Schema)
Users define "Predictive Models" that look like Prisma Models.

```typescript
// ml/churn.ts
export const ChurnModel = defineModel({
  target: "User",
  output: "churnProbability", // float
  features: {
    daysInactive: {
      type: "Int",
      resolve: (user) => diffDays(now(), user.lastLogin)
    }
  },
  config: {
    algorithm: "XGBoost", // Default
    minAccuracy: 0.85     // Quality Gate
  }
});
```

### 4.2 The "Build" Step (Training)
*   **Command:** `npx prisml train`
*   **Environment Detection (Automatic):**
    1.  Checks for Docker → Uses `prisml/trainer:latest` container (recommended)
    2.  No Docker? Checks for Python 3.8+ → Uses local Python installation
    3.  No Python? → Offers experimental JS fallback (<1000 rows) or exits with setup instructions
*   **Behavior:**
    1.  Extracts data using the `resolve` functions via Prisma Client
    2.  Writes features to temporary CSV
    3.  Spawns Python subprocess (Docker or local)
    4.  Trains model using scikit-learn/XGBoost
    5.  Evaluates metrics (accuracy, precision, recall, F1)
    6.  **Quality Gate:** Fails build if accuracy < `minAccuracy` (CI/CD integration)
    7.  Converts to ONNX using `skl2onnx`
    8.  **Output:** `.onnx` binary artifact in `prisml/generated/` directory
*   **User Experience:**
    *   With Docker: "Invisible Python" - zero manual setup
    *   Without Docker: Clear instructions for one-time Python installation
    *   Both: Professional-grade training with battle-tested ML libraries

### 4.3 The "Query" Step (Inference)
*   **Mechanism:** Prisma Client Extension.
*   **Behavior:**
    ```typescript
    const user = await prisma.user.findUnique({
      where: { id: 1 },
      include: {
        _predictions: {
           churnProbability: true // <--- Calculated via Native Runtime
        }
      }
    });
    ```

---

## 5. Technical Architecture

### 5.1 Layer 1: PrisML Core (Synchronous)
*   **Training:** Python subprocess (scikit-learn, XGBoost) via Docker or local installation
*   **Runtime:** ONNX Runtime for Node.js (`onnxruntime-node`)
*   **Latency:** Sub-10ms inference
*   **Use Case:** Classification, Regression on tabular data
*   **Storage:** ONNX model files stored in repo (committed with code)
*   **Deployment:** Zero Python dependency in production (Node.js + ONNX only)

### 5.2 Layer 2: PrisML Gen (Asynchronous - Future V2)
*   **Runtime:** HTTP Calls (OpenAI, Anthropic).
*   **Latency:** > 500ms.
*   **Use Case:** Embeddings, Summarization, RAG.
*   **Interface:** `prisma.document.vectorSearch(...)`.

---

## 6. Roadmap

### Phase 1: The "Invisible Python" MVP (Current)
*   `defineModel` API with TypeScript type safety
*   `prisml train` CLI with intelligent environment detection
*   Docker-first approach (auto-pulls `prisml/trainer:latest`)
*   Python fallback (local installation for advanced users)
*   ONNX model export with `onnxruntime-node` inference
*   `_predictions` Prisma Client Extension
*   Support for RandomForest, XGBoost, Logistic Regression
*   Quality gates (minimum accuracy thresholds)
*   Git-native model versioning

### Phase 2: The "Vector" Layer
*   `@prisml.embed` schema directive for automatic embeddings
*   Automatic `pgvector` migration generation
*   `prisma.table.vectorSearch()` API for semantic search
*   Integration with OpenAI, Cohere, local models

### Phase 3: The "Cloud" (Monetization)
*   Offload `prisml train` to remote GPU clusters
*   Model registry and versioning hosting
*   Drift detection and automatic retraining
*   Performance monitoring and A/B testing
*   **Price:** Free tier (local), $29/mo (remote builds + analytics)

---

## 7. Success Metrics
*   **DX:** A user can go from "npm install" to "first prediction" in < 15 minutes.
*   **Performance:** Inference adds < 10ms overhead to a Prisma query.
*   **Safety:** 100% protection against "Training-Serving Skew" (Compilation error if inputs don't match).

---

## 8. Implementation Status & Roadmap

### Current Status (January 2026)
**Overall Progress:** ~35% complete  
**Grade:** MVP skeleton exists, needs production hardening

### Phase 1: Core Implementation (8-10 weeks)

**Week 1-2: ML Runtime**
- [ ] Implement ONNX inference engine (`src/engine/inference.ts`)
- [ ] Python training script (`scripts/train.py`)
- [ ] Environment auto-detection (`src/cli/environment-detector.ts`)
- [ ] Docker image creation (`Dockerfile.trainer`)

**Week 3-4: Quality & Testing**
- [ ] Unit tests (target: 70% coverage)
- [ ] Integration tests with real Prisma + PostgreSQL
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] ESLint + Prettier configuration

**Week 5-6: Developer Experience**
- [ ] CLI improvements (progress bars, error messages)
- [ ] Input validation (Zod schemas)
- [ ] Feature normalization/scaling
- [ ] String feature encoding (Label/OneHot)

**Week 7-8: Documentation & Examples**
- [ ] 5+ example projects (churn, fraud, lead scoring)
- [ ] Quickstart guide with video
- [ ] API reference (TypeDoc)
- [ ] Migration guides

### Phase 2: Production Ready (4-6 weeks)

**Weeks 9-10: Performance**
- [ ] Model caching optimization
- [ ] Batch processing for large datasets
- [ ] Performance benchmarks
- [ ] Memory profiling

**Weeks 11-12: Stability**
- [ ] Error handling improvements
- [ ] Logging infrastructure (pino)
- [ ] Health checks
- [ ] Monitoring hooks

### Phase 3: Launch (2-4 weeks)

**Weeks 13-14: Polish**
- [ ] Security audit
- [ ] Dependency updates
- [ ] CHANGELOG.md
- [ ] LICENSE + SECURITY.md

**Weeks 15-16: Marketing**
- [ ] npm publish
- [ ] Launch blog post
- [ ] Product Hunt submission
- [ ] Community building (Discord/Discussions)

### Critical Fixes Required

**🔴 Security**
- Rotate exposed database credentials immediately
- Add `.env` to `.gitignore`
- Create `.env.example`

**🔴 Core Functionality**
- Replace mock inference with real ONNX Runtime
- Implement actual Python training (not setTimeout)
- Fix Prisma extension Proxy implementation

**🟡 Engineering Best Practices**
- Add `bin` field to package.json
- Create build scripts (`npm run build`)
- Setup prepublishOnly hook