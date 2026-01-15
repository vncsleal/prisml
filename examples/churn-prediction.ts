/**
 * Example: Using PrisML with real ONNX inference
 * 
 * This demonstrates the complete workflow:
 * 1. Define features in TypeScript
 * 2. Train model with Python subprocess
 * 3. Run real-time predictions with ONNX
 */

import { defineModel } from '../src/core/types';
import { ONNXInferenceEngine } from '../src/engine/inference';
import { PrismaClient, User } from '@prisma/client';

// 1. Define ML Model (features + config)
export const churnPredictor = defineModel<User>({
  target: 'User',
  output: 'willChurn', // Binary classification: 0 or 1
  
  features: {
    // Numeric features based on actual User schema
    daysSinceLastLogin: {
      type: 'Int',
      resolve: (user: User) => {
        const lastLogin = new Date(user.lastLogin);
        const now = new Date();
        return Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
      }
    },
    
    totalSpent: {
      type: 'Float',
      resolve: (user: User) => user.totalSpent || 0
    },
    
    // Boolean features (auto-encoded to 0/1)
    isChurned: {
      type: 'Boolean',
      resolve: (user: User) => user.isChurned
    }
  },
  
  config: {
    algorithm: 'RandomForest',
    minAccuracy: 0.75,
    testSplit: 0.2
  }
});

// 2. Training (CLI command)
// Run: npx prisml train --file examples/churn-prediction.ts
// This will:
//   - Extract features from all User records
//   - Call scripts/train.py with the data
//   - Export trained model to prisml/generated/churnPredictor.onnx

// 3. Real-time Prediction (Runtime)
async function predictChurnRisk() {
  const prisma = new PrismaClient();
  
  // Initialize ONNX inference engine
  const engine = new ONNXInferenceEngine(churnPredictor);
  await engine.initialize(); // Loads the .onnx model
  
  try {
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: 123 }
    });
    
    if (!user) {
      console.log('User not found');
      return;
    }
    
    // Run prediction (uses ONNX runtime)
    const churnProbability = await engine.predict(user);
    
    console.log(`Churn Risk: ${(churnProbability * 100).toFixed(1)}%`);
    
    if (churnProbability > 0.7) {
      console.log('⚠️  High churn risk - trigger retention campaign');
    }
    
    // Batch prediction example
    const allUsers = await prisma.user.findMany({
      take: 100
    });
    
    const predictions = await engine.predictBatch(allUsers);
    
    const highRiskUsers = allUsers.filter((_, idx) => predictions[idx] > 0.7);
    console.log(`Found ${highRiskUsers.length} high-risk users`);
    
  } finally {
    await engine.dispose(); // Release ONNX session
    await prisma.$disconnect();
  }
}

// Run prediction
predictChurnRisk().catch(console.error);
