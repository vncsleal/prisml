#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { trainCommand } from './commands/train';

const program = new Command();

program
  .name('prisml')
  .description('PrisML CLI - The Prisma Machine Learning Adapter')
  .version('1.0.0');

program
  .command('train')
  .description('Train models defined in your features file')
  .option('-f, --file <path>', 'Path to your feature definition file', 'src/ml.ts')
  .action(trainCommand);

program.parse();
