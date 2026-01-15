import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { loadDefinitions } from '../loader';
import { FeatureProcessor } from '../../engine/processor';
import { PrisMLModel } from '../../core/types';
import { PrismaClient } from '@prisma/client';

interface TrainOptions {
  file: string;
}

export async function trainCommand(options: TrainOptions) {
  console.log(chalk.gray(`Loading definitions from ${options.file}...`));

  try {
    const models = await loadDefinitions(options.file);
    console.log(chalk.green(`✔ Loaded ${models.length} models.`));

    if (models.length === 0) {
      console.warn(chalk.yellow('No models found. Did you export them using `defineModel`?'));
      return;
    }

    // Process each model
    for (const model of models) {
      await trainSingleModel(model);
    }

  } catch (error: any) {
    console.error(chalk.red(`
❌ Fatal Error: ${error.message}`));
    process.exit(1);
  }
}

async function trainSingleModel(model: PrisMLModel) {
  console.log(chalk.blue(`
🤖 Processing Model: ${chalk.bold(model.name)} (Target: ${model.target})`));
  
  const prisma = new PrismaClient();

  try {
    // 1. Initialize Processor
    const processor = new FeatureProcessor(model);

    // 2. Fetch Data
    console.log(chalk.gray(`   Connecting to database...`));
    
    // Dynamic delegate access: prisma.user, prisma.post, etc.
    const delegate = (prisma as any)[model.target.toLowerCase()] || (prisma as any)[model.target];
    
    if (!delegate) {
      throw new Error(`Prisma Client has no model named '${model.target}'. Check your schema.`);
    }

    console.log(chalk.gray(`   Fetching rows from table '${model.target}'...`));
    const startFetch = Date.now();
    const entities = await delegate.findMany();
    const fetchTime = Date.now() - startFetch;
    console.log(chalk.green(`   ✔ Fetched ${entities.length} rows in ${fetchTime}ms`));

    // 3. Extract Features
    console.log(chalk.gray(`   Extracting features...`));
    const startExtract = Date.now();
    const dataset = await processor.processBatch(entities);
    const extractTime = Date.now() - startExtract;
    console.log(chalk.green(`   ✔ Extracted ${dataset.length} vectors in ${extractTime}ms`));

    // 4. Prepare Training Data for Python
    console.log(chalk.gray(`   Preparing training data...`));
    
    // Extract labels from entities (assumes output field exists)
    const labels = entities.map((entity: any) => entity[model.output]);
    
    // Determine task type (classification vs regression)
    const taskType = typeof labels[0] === 'number' && labels.every((l: any) => l === 0 || l === 1)
      ? 'classification'
      : 'regression';

    const trainingData = {
      features: dataset,
      labels,
      metadata: {
        model_name: model.name,
        feature_names: Object.keys(model.features).sort(),
        task_type: taskType,
        target_field: model.output,
      }
    };

    // Save training data to temp JSON file
    const tempDir = path.join(process.cwd(), '.prisml', 'tmp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const dataPath = path.join(tempDir, `${model.name}_data.json`);
    fs.writeFileSync(dataPath, JSON.stringify(trainingData, null, 2));

    // 5. Train with Python subprocess
    console.log(chalk.gray(`   Training model with Python (${model.config?.algorithm || 'RandomForest'})...`));
    
    const outDir = path.join(process.cwd(), 'prisml', 'generated');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    
    const artifactPath = path.join(outDir, `${model.name}.onnx`);
    const scriptPath = path.join(process.cwd(), 'scripts', 'train.py');
    
    const algorithm = model.config?.algorithm || 'RandomForest';
    const minAccuracy = model.config?.minAccuracy || 0.7;
    const testSplit = model.config?.testSplit || 0.2;

    try {
      // Call Python training script
      const pythonCmd = `python3 "${scriptPath}" --input "${dataPath}" --output "${artifactPath}" --algorithm ${algorithm} --min-accuracy ${minAccuracy} --test-split ${testSplit}`;
      
      execSync(pythonCmd, {
        stdio: 'inherit', // Show Python output in real-time
        cwd: process.cwd()
      });

      console.log(chalk.green(`   ✔ Training Complete!`));
      
      // Clean up temp data file
      fs.unlinkSync(dataPath);

    } catch (error: any) {
      throw new Error(`Python training failed. Ensure Python 3 and dependencies are installed.\nRun: pip install -r scripts/requirements.txt`);
    }

  } catch (err: any) {
    console.error(chalk.red(`   ❌ Failed to process model: ${err.message}`));
  } finally {
    await prisma.$disconnect();
  }
}