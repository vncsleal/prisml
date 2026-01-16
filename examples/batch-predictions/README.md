# Batch Predictions Example

This example demonstrates how to efficiently process predictions for multiple entities using PrisML's batch prediction API.

**File:** [example.ts](./example.ts)

## Overview

Batch predictions allow you to process hundreds or thousands of records efficiently in a single operation, using parallel ONNX inference for optimal performance.

## Features

- **Parallel Processing**: Predictions run concurrently for better performance
- **Customer Segmentation**: Segment users by risk and value
- **Daily Batch Jobs**: Process active users for retention campaigns
- **Performance Optimization**: Up to 10x faster than sequential predictions

## Database Schema

```prisma
model User {
  id                   Int       @id @default(autoincrement())
  email                String    @unique
  totalSpent           Float     @default(0)
  daysSinceLastLogin   Int       @default(0)
  accountAge           Int       @default(0)
  isChurned            Boolean   @default(false)
  createdAt            DateTime  @default(now())
  lastLoginAt          DateTime?
  updatedAt            DateTime  @updatedAt
}
```

## Usage

### Basic Batch Prediction

```typescript
const users = await prisma.user.withMLMany({
  where: { createdAt: { gte: lastWeek } },
  take: 100
});

users.forEach(user => {
  console.log(`${user.email}: ${user._ml.churnProbability}`);
});
```

### Customer Segmentation

```typescript
const allUsers = await prisma.user.withMLMany({ take: 1000 });

const segments = {
  highValue_lowRisk: allUsers.filter(u => 
    u.totalSpent > 500 && u._ml.churnProbability < 0.3
  ),
  highValue_highRisk: allUsers.filter(u => 
    u.totalSpent > 500 && u._ml.churnProbability >= 0.7
  )
};
```

### Daily Retention Campaign

```typescript
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
const activeUsers = await prisma.user.withMLMany({
  where: {
    OR: [
      { lastLoginAt: { gte: yesterday } },
      { updatedAt: { gte: yesterday } }
    ]
  }
});

const retentionTargets = activeUsers
  .filter(u => u._ml.churnProbability > 0.6)
  .map(u => ({
    userId: u.id,
    action: u._ml.churnProbability > 0.8 ? 'urgent_discount' : 'engagement_email'
  }));
```

## Performance Comparison

```typescript
// Sequential approach (slower)
for (let i = 0; i < 100; i++) {
  const user = await prisma.user.withML({ where: { id: i } });
  // Process user
}

// Batch approach (faster)
const users = await prisma.user.withMLMany({
  where: { id: { in: ids } }
});
// All predictions completed in parallel
```

**Typical Performance Gain**: 5-10x faster for batches of 50-100 records

## Model Training

```bash
npx prisml train
```

Training will:
1. Extract historical user data from your database
2. Train a churn prediction model using 3 features
3. Export to ONNX format with quality gates (>75% accuracy)
4. Save to `prisml/generated/churnPredictor.onnx`

## Use Cases

### 1. Daily Retention Jobs

Run batch predictions on all active users to identify churn risks and trigger automated retention campaigns.

### 2. Customer Segmentation

Segment your entire customer base by combining spending patterns with churn risk for targeted marketing.

### 3. Real-time Dashboards

Power analytics dashboards with batch predictions on filtered user sets (e.g., users by region, plan, or activity).

### 4. A/B Testing

Compare churn predictions across different user cohorts to measure the effectiveness of retention strategies.

## Production Deployment

### Scheduled Batch Job (Node.js)

```typescript
import { CronJob } from 'cron';

const job = new CronJob('0 2 * * *', async () => {
  // Run at 2 AM daily
  const users = await prisma.user.withMLMany({
    where: { isActive: true }
  });
  
  const highRisk = users.filter(u => u._ml.churnProbability > 0.7);
  
  // Send to retention system
  await retentionSystem.processBatch(highRisk);
});

job.start();
```

### Serverless Function (Vercel)

```typescript
// api/batch-predictions.ts
export default async function handler(req, res) {
  const users = await prisma.user.withMLMany({
    take: 500,
    orderBy: { lastLoginAt: 'asc' }
  });
  
  return res.json({
    processed: users.length,
    highRisk: users.filter(u => u._ml.churnProbability > 0.7).length
  });
}
```

### Docker Container

```dockerfile
FROM node:20-slim

WORKDIR /app
COPY . .
RUN npm install
RUN npx prisma generate

CMD ["node", "batch-job.js"]
```

## Optimization Tips

1. **Pagination**: Process large datasets in chunks
   ```typescript
   let skip = 0;
   const take = 1000;
   
   while (true) {
     const batch = await prisma.user.withMLMany({ skip, take });
     if (batch.length === 0) break;
     
     // Process batch
     await processBatch(batch);
     skip += take;
   }
   ```

2. **Filtering**: Only predict for relevant users
   ```typescript
   const users = await prisma.user.withMLMany({
     where: {
       lastLoginAt: { gte: lastMonth },
       isActive: true
     }
   });
   ```

3. **Caching**: Cache ONNX engine for repeated predictions (handled automatically by PrisML)

## Monitoring

Track batch prediction performance:

```typescript
const startTime = Date.now();
const users = await prisma.user.withMLMany({ take: 1000 });
const duration = Date.now() - startTime;

console.log(`Processed ${users.length} predictions in ${duration}ms`);
console.log(`Average: ${(duration / users.length).toFixed(2)}ms per prediction`);
```

## Troubleshooting

**Issue**: Batch predictions are slow

**Solutions**:
- Reduce batch size (try 100-500 records)
- Ensure ONNX model is optimized
- Check database query performance
- Use pagination for very large datasets

**Issue**: Out of memory errors

**Solutions**:
- Process in smaller chunks
- Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096`
- Use streaming if processing millions of records

## Next Steps

- See [fraud-detection](../fraud-detection/) for multi-feature models
- See [churn-prediction](../churn-prediction/) for single prediction examples
- Check [TROUBLESHOOTING.md](../../docs/TROUBLESHOOTING.md) for common issues
