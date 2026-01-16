/**
 * E2E Test: Prisma Extension API
 * 
 * Tests the complete workflow:
 * 1. Define model with features
 * 2. Train model (generates ONNX)
 * 3. Use Prisma extension to query predictions
 */

import { PrismaClient } from '@prisma/client';
import { prisml, defineModel } from '../src';

// Define the churn prediction model
const churnPredictor = defineModel({
  target: 'User',
  output: 'churnProbability',
  features: {
    daysSinceLastLogin: {
      type: 'Float' as const,
      resolve: (user: any) => {
        const now = new Date();
        const lastLogin = new Date(user.lastLogin);
        return (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24);
      }
    },
    totalSpent: {
      type: 'Float' as const,
      resolve: (user: any) => user.totalSpent
    }
  },
  config: {
    algorithm: 'RandomForest',
    minAccuracy: 0.75
  }
});

// Set the model name (required for file paths)
churnPredictor.name = 'churnPredictor';

async function testExtension() {
  console.log(' Testing PrisML Extension API...\n');

  // Create Prisma client with PrisML extension
  const prisma = new PrismaClient().$extends(
    prisml([churnPredictor])
  );

  try {
    // Test 1: Single prediction via extension
    console.log(' Test 1: Single User Prediction');
    const user = await prisma.user.findFirst({
      where: { id: 501 }
    });

    if (!user) {
      console.error(' Test user not found (ID: 501)');
      return;
    }

    console.log('User:', {
      id: user.id,
      email: user.email,
      lastLogin: user.lastLogin,
      totalSpent: user.totalSpent,
      actualChurn: user.isChurned
    });

    // Query with ML predictions using withML method
    // @ts-expect-error - Dynamic extension method
    const userWithML = await prisma.user.withML({
      where: { id: user.id }
    });

    if (!userWithML || !userWithML._ml) {
      console.error(' Extension did not return _ml field');
      return;
    }

    console.log('\nPrediction Result:');
    const prediction = userWithML._ml.churnProbability;
    const predictedClass = typeof prediction === 'number' ? prediction : 0;
    const actualClass = userWithML.isChurned ? 1 : 0;
    
    console.log(`  Predicted: ${prediction} (Class: ${predictedClass})`);
    console.log(`  Actual: ${actualClass}`);
    console.log(`  Match: ${predictedClass === actualClass ? '' : ''}\n`);

    // Test 2: Batch predictions (using withML for each)
    console.log(' Test 2: Batch Predictions (10 users)');
    const userIds = await prisma.user.findMany({
      take: 10,
      skip: 1,  // Skip the first user we already tested
      select: { id: true, isChurned: true }
    });
    
    console.log(`Found ${userIds.length} users for batch testing`);

    console.log('\nResults:');
    let correct = 0;
    for (const { id, isChurned } of userIds) {
      // @ts-expect-error - Dynamic extension method
      const u = await prisma.user.withML({ where: { id } });
      if (!u) {
        console.log(`  User ${id}: Not found, skipping`);
        continue;
      }
      
      const prediction = u._ml?.churnProbability || 0;
      const predicted = typeof prediction === 'number' ? prediction : 0;
      const actual = isChurned ? 1 : 0;
      const isCorrect = predicted === actual;
      if (isCorrect) correct++;
      
      console.log(`  User ${id}: Predicted=${predicted}, Actual=${actual} ${isCorrect ? '' : ''}`);
    }

    console.log(`\nBatch Accuracy: ${(correct / userIds.length * 100).toFixed(1)}% (${correct}/${userIds.length})`);

    console.log('\n Extension API test complete!\n');

  } catch (error: any) {
    console.error(' Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testExtension().catch(console.error);
