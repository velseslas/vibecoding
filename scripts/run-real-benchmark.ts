import { realProductGenerationBenchmarkRunner } from '../server/tests/realProductGenerationBenchmark';

async function main() {
  console.log('Starting Real Product Generation Benchmark (Passe 2)...');
  const report = await realProductGenerationBenchmarkRunner.runFullBenchmark();
  console.log('\n==================================================');
  console.log('FINAL BENCHMARK REPORT RESULT');
  console.log('==================================================');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error('Benchmark execution error:', err);
  process.exit(1);
});
