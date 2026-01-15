/**
 * Test ONNX Inference with trained model
 */

import { ONNXInferenceEngine } from '../src/engine/inference';
import { PrismaClient } from '@prisma/client';
import { churnPredictor } from './churn-prediction';

async function testInference() {
  const prisma = new PrismaClient();
  
  // Set the model name (normally done by loader)
  churnPredictor.name = 'churnPredictor';
  
  const engine = new ONNXInferenceEngine(churnPredictor);
  
  try {
    console.log('🔮 Testing ONNX Inference...\n');
    
    // Initialize engine (loads ONNX model)
    await engine.initialize();
    console.log('✓ Model loaded\n');
    
    // Get a user from database
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.log('No users found in database');
      return;
    }
    
    console.log('Test User:', {
      id: user.id,
      email: user.email,
      lastLogin: user.lastLogin,
      totalSpent: user.totalSpent,
      actualChurn: user.isChurned
    });
    
    // Run prediction
    const prediction = await engine.predict(user);
    
    console.log(`\nPredicted Churn: ${prediction.toFixed(4)}`);
    console.log(`Actual Churn: ${user.isChurned ? 1 : 0}`);
    console.log(`Accuracy: ${(1 - Math.abs(prediction - (user.isChurned ? 1 : 0))).toFixed(4)}`);
    
    // Batch test
    console.log('\n📊 Batch Prediction Test...\n');
    const users = await prisma.user.findMany({ take: 10 });
    const predictions = await engine.predictBatch(users);
    
    console.log('Results:');
    users.forEach((u, idx) => {
      console.log(`  User ${u.id}: Predicted=${predictions[idx].toFixed(2)}, Actual=${u.isChurned ? 1 : 0}`);
    });
    
    console.log('\n✅ Inference test complete!');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await engine.dispose();
    await prisma.$disconnect();
  }
}

testInference().catch(console.error);
