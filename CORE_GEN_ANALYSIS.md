# Core vs Gen: Architectural Analysis

**Question:** Should Core (ONNX predictions) and Gen (LLM/embeddings) remain separate concepts?

**Decision:** ✅ **Unified `_ml` API** - Use single namespace, different engines internally

**Status:** Implementation complete (Core), Gen planned for V2

---

## Current Design (Docs)

```typescript
// Core: Synchronous, deterministic predictions
const user = await prisma.user.findUnique({
  include: {
    _predictions: {
      churnProbability: true,  // ONNX inference, <10ms
      fraudScore: true
    }
  }
});

// Gen: Asynchronous, LLM-powered fields
const document = await prisma.document.vectorSearch({
  query: "...",
  limit: 10
});

const comment = await prisma.comment.findUnique({
  include: {
    _gen: {
      sentiment: true,  // OpenAI API, >500ms
      summary: true
    }
  }
});
```

**Separation:** Different APIs (`_predictions` vs `_gen`), different namespaces, different docs sections.

---

## Analysis

### ✅ Arguments FOR Separation

1. **Fundamentally Different Execution Models**
   - Core: In-process, CPU-bound, synchronous
   - Gen: Network I/O, async, external dependencies
   
2. **Different Cost Models**
   - Core: Free (compute is yours)
   - Gen: Pay-per-token (OpenAI, Anthropic)
   
3. **Different Reliability Characteristics**
   - Core: Deterministic, predictable latency (<10ms)
   - Gen: Non-deterministic, variable latency (500ms-5s), can fail
   
4. **Different Development Workflows**
   - Core: Train → ONNX → Commit → Deploy
   - Gen: Configure API → Call → Cache
   
5. **Clear Product Phasing**
   - Phase 1: Core (build credibility, zero-infra promise)
   - Phase 2: Gen (expand TAM, monetization hook)

6. **Different Mental Models**
   - Core: "I trained this on my data"
   - Gen: "I'm calling an external service"

### ❌ Arguments AGAINST Separation

1. **User Confusion**
   - Two APIs for "ML-powered fields" is unnecessarily complex
   - Users don't care about implementation, they want "smart fields"
   
2. **Arbitrary Boundaries**
   - What about local LLM inference via ONNX? Is that Core or Gen?
   - What about embeddings generated during training? Core or Gen?
   - Async ONNX inference for large models? Core or Gen?
   
3. **API Fragmentation**
   - `_predictions.field` vs `_gen.field` vs `.vectorSearch()`
   - Inconsistent developer experience
   
4. **Documentation Overhead**
   - Current docs show this is confusing (Gen extensively documented but not implemented)
   - Users expect both to work, get frustrated when Gen doesn't
   
5. **Evolution Problems**
   - What happens when Core adds async support?
   - What happens when Gen adds deterministic models?
   - Forced to maintain artificial separation

---

## 🎯 Recommended Approach: Unified API, Separated Engine

**Principle:** Expose ONE concept to users ("ML-powered fields"), but implement with TWO engines internally.

### Proposed User-Facing API

```typescript
// Single unified namespace for ALL ML fields
const user = await prisma.user.findUnique({
  include: {
    _ml: {
      // Core fields (sync, fast, deterministic)
      churnProbability: true,      // ONNX
      fraudScore: true,             // ONNX
      
      // Gen fields (async, slow, non-deterministic)  
      riskSummary: true,            // OpenAI - auto-awaited
      similarUsers: { take: 5 }     // Vector search
    }
  }
});

// PrisML automatically:
// 1. Runs Core predictions synchronously
// 2. Awaits Gen predictions (or returns promises if not awaited)
// 3. User doesn't need to know which is which
```

### Model Definition (Same API)

```typescript
// Core model (trains to ONNX)
export const churnModel = defineModel({
  type: 'prediction',  // or just infer from presence of 'features'
  target: 'User',
  output: 'churnProbability',
  features: {
    daysInactive: { ... }
  },
  config: {
    algorithm: 'RandomForest'
  }
});

// Gen model (calls external API)
export const summaryModel = defineModel({
  type: 'generative',  // or infer from presence of 'provider'
  target: 'Comment',
  output: 'aiSummary',
  provider: {
    name: 'openai',
    model: 'gpt-4',
    prompt: (comment) => `Summarize: ${comment.text}`
  }
});

// Vector model (embeddings + search)
export const embeddingModel = defineEmbedding({
  target: 'Document',
  field: 'content',
  provider: 'openai',  // or 'local', 'cohere'
  dimensions: 1536
});
```

### Internal Architecture (Still Separated)

```
src/
  extension/
    index.ts          # Unified extension entry point
    core-engine.ts    # ONNX inference (existing)
    gen-engine.ts     # LLM/API calls (new)
    vector-engine.ts  # pgvector queries (new)
  
  models/
    prediction.ts     # Core model definitions
    generative.ts     # Gen model definitions  
    embedding.ts      # Vector model definitions
```

**Benefits:**
- Users see ONE concept: "PrisML adds ML fields to Prisma"
- Implementation stays clean: separate engines for different backends
- Easy to add new types: local LLMs, custom APIs, etc.
- Documentation is simpler: one API reference, implementation details separate

---

## 🏗️ Proposed Implementation Strategy

### Phase 1: Core Foundation (Current - Week 3-4)
- ✅ ONNX inference engine
- 🚧 Prisma extension with `_ml` namespace
- 🚧 Support for Core (prediction) models only
- 📋 Documentation focused on predictions

### Phase 2: Gen Addition (Week 9-12)
- Add gen-engine.ts for LLM calls
- Same `_ml` namespace, auto-detected type
- Add caching layer for Gen results
- Vector search as separate method (`.vectorSearch()`)

### Phase 3: Unified Polish (Week 13-16)
- Local LLM support (Core-like latency, Gen-like interface)
- Hybrid models (ONNX + LLM refinement)
- Unified caching strategy
- A/B testing framework

---

## 🎨 Documentation Structure

### Recommended Organization

```
docs/
  README.md                    # Quick start (Core only initially)
  
  guides/
    predictions.md             # Core models (churn, fraud, scoring)
    embeddings.md              # Vector search (Phase 2)
    generative.md              # LLM-powered fields (Phase 2)
    
  architecture/
    overview.md                # High-level: one API, multiple engines
    inference-engine.md        # Core: ONNX details
    api-engine.md              # Gen: LLM integration
    extension.md               # Prisma integration layer
    
  api/
    defineModel.md             # Unified API reference
    extension.md               # _ml namespace
```

**Key Change:** Don't split by "Core vs Gen" in user-facing docs. Split by USE CASE:
- "How do I predict churn?" → predictions.md
- "How do I do semantic search?" → embeddings.md  
- "How do I add AI summaries?" → generative.md

Each guide explains what engine is used, but users don't need to think about it upfront.

---

## 💡 Recommendation: UNIFIED API

**Short Answer:** Keep engines separate internally, but unify the user-facing API.

**Rationale:**
1. **Simpler Mental Model:** "PrisML adds ML fields" vs "Core vs Gen layers"
2. **Future-Proof:** Hybrid models, local LLMs, custom backends all fit naturally
3. **Better DX:** One namespace (`_ml`), one `defineModel()` API
4. **Clearer Docs:** Organize by use case, not implementation
5. **Easier Evolution:** Can add new engines without API changes

**Migration Path:**
1. Week 3-4: Implement `_ml` extension for Core models only
2. Document as "PrisML predictions" (not "Core layer")
3. Phase 2: Add Gen support to same `_ml` namespace
4. Phase 3: Add local LLMs, custom providers (users don't care it's "Core" tech)

---

## 🚀 Immediate Action Items

### This Week: Implement Unified Extension

1. **Create `src/extension/index.ts`:**
   ```typescript
   export function prisml(models: PrisMLModel[]) {
     return Prisma.defineExtension({
       name: 'prisml',
       result: {
         user: {
           _ml: {
             needs: { /* auto-detect fields */ },
             compute: async (user) => {
               // Route to appropriate engine based on model type
               return predictions;
             }
           }
         }
       }
     });
   }
   ```

2. **Update Documentation:**
   - Change `_predictions` → `_ml` everywhere
   - Remove "Core vs Gen" section from README
   - Add "Currently supports: Predictions (ONNX). Coming soon: Embeddings, Generative."

3. **Update Examples:**
   ```typescript
   // Old (don't use)
   include: { _predictions: { churnProbability: true } }
   
   // New (unified)
   include: { _ml: { churnProbability: true } }
   ```

### Next Steps: Document Phases Clearly

Instead of "Core vs Gen", use:
- **Phase 1: Predictions** (ONNX, train on your data)
- **Phase 2: Embeddings** (Vector search, pgvector)
- **Phase 3: Generative** (LLM-powered fields, caching)

Each phase adds to the SAME `_ml` API.

---

## 📊 Comparison Summary

| Aspect | Current Docs (Separated) | Proposed (Unified) |
|--------|-------------------------|-------------------|
| User API | `_predictions` + `_gen` + `.vectorSearch()` | `_ml.field` for all |
| Mental Model | "Two types of ML" | "ML-powered fields" |
| Documentation | Split sections, confusing | Use case driven |
| Implementation | Separate (good) | Still separate (internal) |
| Future Evolution | Fragile (new APIs) | Flexible (same API) |
| User Confusion | High (which to use?) | Low (one way) |

**Verdict:** Unified API is clearer, more flexible, and easier to document.
