# PrisML: Y Combinator Master Plan (Pivot: The In-Process Stack)

**Status:** v2.0 (Post-Critique)
**Target Batch:** S26
**One-Liner:** "PrisML adds Computed Predictive Columns to your Database."

---

## 1. The Pivot: Why We Changed
We abandoned the "Platform" approach (Python sidecars, Docker containers).
**Insight:** Vercel/Next.js developers will not adopt a tool that breaks their "Serverless Monolith" architecture.
**Solution:** PrisML is now **In-Process**. It runs entirely within Node.js using ONNX Runtime. It feels like a library, not infrastructure.

---

## 2. The Product Strategy

### Phase 1: The "Lodash for Predictions" (Open Source)
**Goal:** Become the default way to do simple logic that is too hard for `if/else` statements.
**Target User:** The "Product Engineer" building a SaaS.
**Use Cases:**
- "Sort leads by probability of conversion" (not alphabetical).
- "Flag transactions that look weird" (Fraud).
- "Predict if a user is about to cancel" (Churn).

**The "Hook":**
> *"Stop writing 50 complex SQL queries to guess churn. Define it once in PrisML, train it on your data, and query it like a regular column."*

### Phase 2: The "Vector" Expansion (Open Core)
**Goal:** Capture the RAG / GenAI market without losing simplicity.
**Product:**
- `prisml push` manages `pgvector` indexes automatically.
- `prisma.table.vectorSearch()` becomes the standard API for retrieval.

### Phase 3: PrisML Cloud (Monetization)
**Problem:** "Training on my laptop is slow and heats up my room."
**Solution:**
- **Remote Build:** Run `npx prisml train --remote`. We suck up the data (securely), train on a massive GPU cluster, and download the optimized `.onnx` file to your repo.
- **Price:** Free tier (local), $29/mo (remote builds + history).

---

## 3. Why This Wins (The "Vercel Alignment")
1.  **Zero DevOps:** It just works in a Next.js API route. No cold starts (if architected correctly). No separate backend.
2.  **Git-Native:** Models are files. You commit them. You revert them. CI/CD understands them.
3.  **Prisma-Native:** We draft off the success of the most popular TS ORM.

---

## 4. The "Secret Sauce" (Technical Moat)
Our competitor is "Python Scripts."
Our moat is **Determinism.**
- In Python, you might accidentally train on `string` and serve `int`.
- In PrisML, that is a **Compile Error**.
- We guarantee that the "Training Logic" and "Serving Logic" are bit-for-bit identical because they are generated from the same TypeScript source.

---

## 5. Risks (Updated)
*   **Risk:** "ONNX Runtime is too heavy for AWS Lambda."
    *   *Mitigation:* Aggressive optimization. We only support "Tree" models initially (very small). We lazy-load the runtime.
*   **Risk:** "Prisma builds this."
    *   *Mitigation:* Prisma is focused on "Data Access," not "Compute." This is a distinct layer. We can likely partner.

---

## 6. Execution Plan
1.  **Build MVP:** `defineModel` -> `train` (local JS trainer) -> `predict` (runtime).
2.  **Launch "Churn-in-a-Box":** A copy-paste Next.js template.
3.  **Iterate:** Add ONNX support for more complex models.