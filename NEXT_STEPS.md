# Next Steps Assessment

**Date:** January 15, 2026  
**Current Status:** Prisma Extension Implemented ✅

---

## ✅ What's Complete (Week 1-3)

### Core Infrastructure
- ✅ ONNX inference engine with caching
- ✅ Python training script (scikit-learn → ONNX)
- ✅ Feature processor with type-safe extraction
- ✅ Environment auto-detection (Docker/Python)
- ✅ E2E training pipeline validated

### Extension API (NEW)
- ✅ Prisma Client extension implementation
- ✅ Model method pattern (`prisma.model.withML()`)
- ✅ Unified `_ml` namespace
- ✅ Multi-model support per entity
- ✅ Engine caching and error handling
- ✅ 100% test accuracy on E2E tests

### Documentation
- ✅ README updated with correct API
- ✅ Architecture decision documented
- ✅ Implementation notes captured
- ✅ Gap analysis complete

---

## 🎯 Priority Next Steps

### Tier 1: Production Readiness (1-2 weeks)

#### 1. **Prisma Data Extractor** (HIGH PRIORITY)
**Status:** Not implemented  
**Impact:** Critical - core promise of "Prisma-native training"

**Current Problem:**
```typescript
// Training reads hardcoded data in examples/
const trainingData = [
  { totalSpent: 100, daysSinceLastLogin: 30, isChurned: true },
  // ... hardcoded
];
```

**Target:**
```typescript
// Should work:
npx prisml train  // Auto-extracts from Prisma database
```

**Tasks:**
- Create `src/cli/extractor.ts`
- Implement `extractTrainingData(model: PrisMLModel)`
- Auto-select Prisma query fields based on feature dependencies
- Handle pagination for large datasets
- Integrate with train command

**Estimate:** 3-4 days

---

#### 2. **Quality Gates** (MEDIUM PRIORITY)
**Status:** Partially implemented  
**Impact:** Medium - prevents shipping bad models

**Current:** Training calculates accuracy but doesn't enforce thresholds

**Target:**
```typescript
defineModel({
  config: {
    minAccuracy: 0.75  // Build fails if not met
  }
});
```

**Tasks:**
- Update `scripts/train.py` to exit(1) on low accuracy
- Add CLI validation of `minAccuracy` config
- Document failure scenarios
- Test in CI/CD context

**Estimate:** 1-2 days

---

#### 3. **Package Configuration** (MEDIUM PRIORITY)
**Status:** Not configured  
**Impact:** Medium - blocks npm publication

**Current:** No CLI bin, no build scripts

**Target:**
```bash
npm install -g prisml
prisml train  # Works globally
```

**Tasks:**
- Add `bin` field to package.json
- Create build scripts (TypeScript → dist/)
- Setup prepublishOnly hook
- Test local installation workflow
- Configure package.json `files` field

**Estimate:** 1 day

---

#### 4. **Type Safety Improvements** (LOW PRIORITY)
**Status:** Runtime validation only  
**Impact:** Low-Medium - improves DX

**Current:** No compile-time validation of feature fields

**Target:**
```typescript
defineModel<User>({
  features: {
    // TypeScript error if 'invalidField' doesn't exist on User
    invalidField: { resolve: (u) => u.invalidField }
  }
});
```

**Options:**
- A) Zod schemas for runtime validation
- B) TypeScript codegen from Prisma schema
- C) Accept runtime-only (current)

**Recommendation:** Keep current for MVP, add Zod in V1.1

**Estimate:** 2-3 days (if pursued)

---

### Tier 2: Developer Experience (2-3 weeks)

#### 5. **Testing Infrastructure**
- Unit tests for inference engine
- Integration tests with real Prisma database
- E2E tests for different algorithms
- CI/CD pipeline (GitHub Actions)

**Estimate:** 4-5 days

#### 6. **Better Error Messages**
- Validation errors with context
- Training failures with suggestions
- Clear ONNX loading errors
- Feature extraction debugging

**Estimate:** 2-3 days

#### 7. **Documentation Polish**
- API reference with TypeDoc
- Troubleshooting guide
- Migration guides
- Example projects (fraud detection, lead scoring)

**Estimate:** 3-4 days

---

### Tier 3: Advanced Features (V1.1+)

#### 8. **Batch Prediction Optimization**
**Current:** Must call `withML()` per entity

**Target:**
```typescript
const users = await prisma.user.withMLMany({
  where: { createdAt: { gte: lastWeek } }
});
// Returns array with _ml on each
```

**Estimate:** 2-3 days

#### 9. **Model Versioning**
- Track model versions in database
- A/B testing support
- Rollback capabilities
- Performance tracking

**Estimate:** 5-7 days

#### 10. **Gen Layer (V2)**
- Vector embeddings
- Semantic search
- LLM-powered fields
- External API integration

**Estimate:** 2-3 weeks

---

## 🚀 Recommended Roadmap

### Week 4 (Current)
- ✅ Extension implemented
- 🎯 Prisma Data Extractor
- 🎯 Quality Gates
- 🎯 Package Configuration

### Week 5-6
- Testing infrastructure
- Error message improvements
- Documentation polish
- First npm alpha release

### Week 7-8
- Beta testing with real projects
- Performance optimization
- Community feedback integration
- V1.0 release preparation

### V1.1+ (Future)
- Batch prediction optimization
- Model versioning
- Additional algorithms
- Gen Layer exploration

---

## 📊 Success Metrics

### MVP Success (Week 6)
- ✅ Extension API working
- ✅ Prisma data extraction
- ✅ Quality gates enforced
- ✅ Published on npm
- ✅ 3+ example projects
- ✅ CI/CD documented

### V1.0 Success (Week 8)
- 100+ npm downloads
- 10+ GitHub stars
- 2+ external contributors
- 0 critical bugs
- <10ms p99 inference latency
- 90%+ test coverage

---

## 🔧 Technical Debt to Address

### Current Issues
1. **Terminal corruption** in heredoc operations (use file tools instead)
2. **No error handling** for missing Prisma schema
3. **Hardcoded paths** (`prisml/generated`) should be configurable
4. **No logging framework** (currently console.log)
5. **TypeScript strict mode** not enabled

### Not Urgent (Can Wait)
- Model artifact compression
- Incremental training support
- GPU acceleration
- Streaming predictions

---

## 💡 Open Questions

1. **Should we support custom Python training scripts?**
   - Pro: Flexibility for advanced users
   - Con: Complexity, harder to maintain quality gates
   - **Recommendation:** Not for V1, consider V2

2. **How to handle schema migrations?**
   - Question: What happens when User model changes?
   - Options: Auto-retrain, warn, invalidate model
   - **Recommendation:** Start with warnings, auto-retrain in V1.1

3. **Should extension be opt-in or automatic?**
   - Current: Manual `$extends(prisml([models]))`
   - Alternative: Auto-detect from schema
   - **Recommendation:** Keep manual for V1 (more control)

---

## 🎯 Immediate Action Items (This Week)

### Day 1-2: Prisma Data Extractor
- [ ] Create `src/cli/extractor.ts`
- [ ] Implement field dependency analysis
- [ ] Add Prisma Client integration
- [ ] Test with real database

### Day 3: Quality Gates
- [ ] Update train.py with accuracy threshold
- [ ] Add CLI validation
- [ ] Document failure modes
- [ ] Test in CI

### Day 4: Package Prep
- [ ] Configure package.json
- [ ] Add build scripts
- [ ] Test local installation
- [ ] Prepare for alpha release

### Day 5: Testing & Polish
- [ ] Add unit tests for new features
- [ ] Update documentation
- [ ] Fix any remaining TypeScript errors
- [ ] Create release checklist

---

## Summary

**Current State:** Core infrastructure complete, extension API working  
**Biggest Gap:** Prisma data extraction (critical for "Prisma-native" promise)  
**Timeline to Alpha:** 1 week (with data extractor)  
**Timeline to V1.0:** 4-6 weeks (with testing + docs)

**Confidence Level:** High - no major blockers, clear path forward
