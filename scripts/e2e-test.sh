#!/bin/bash
# End-to-End Test: Train → Infer

echo " PrisML End-to-End Pipeline Test"
echo "===================================="
echo ""

# Step 1: Train model with Docker
echo "📦 Step 1: Training model with Docker..."
npx ts-node src/cli/index.ts train --file examples/churn-prediction.ts

if [ $? -ne 0 ]; then
  echo " Training failed!"
  exit 1
fi

echo ""
echo " Training complete!"
echo ""

# Step 2: Verify model files exist
echo "📁 Step 2: Verifying model files..."
if [ ! -f "prisml/generated/churnPredictor.onnx" ]; then
  echo " ONNX model not found!"
  exit 1
fi

if [ ! -f "prisml/generated/churnPredictor.metadata.json" ]; then
  echo " Metadata file not found!"
  exit 1
fi

echo " Model files verified!"
echo ""

# Step 3: Show model metrics
echo " Step 3: Model Metrics..."
cat prisml/generated/churnPredictor.metadata.json
echo ""
echo ""

# Step 4: Test inference
echo " Step 4: Testing inference..."
npx ts-node examples/test-inference.ts

if [ $? -ne 0 ]; then
  echo " Inference failed!"
  exit 1
fi

echo ""
echo " End-to-End test PASSED!"
echo "🎉 The 'Invisible Python' promise is fulfilled:"
echo "   - Docker training: ✓"
echo "   - ONNX export: ✓"
echo "   - Zero-dependency inference: ✓"
