import { oxAlphaProvider } from './oxalphaProvider';
import { geminiProvider } from './geminiProvider';
import { localSynthesizerProvider } from './localSynthesizerProvider';
import { providerRegistry } from './providerRegistry';
import { aiCircuitRegistry } from './circuitBreaker';
import { productObservabilityService } from '../observability/productObservability';

async function runAllIntegrationTests() {
  console.log('====================================================');
  console.log('🚀 DÉMARRAGE DE LA SUITE DE TESTS INTÉGRATION OXALPHA');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ' -> ' + detail : ''}`);
      failed++;
    }
  }

  // TEST 1: Secret Security & Sanitization
  console.log('--- 1. Audit Sécurité des Secrets & Masquage ---');
  const rawMessageWithKey = 'Error communicating with endpoint with key sk-ox-live-992384729384729384 and auth Bearer sk-ox-test-84729384';
  const sanitized = oxAlphaProvider.sanitizeMessage(rawMessageWithKey);
  assert(!sanitized.includes('sk-ox-live-992384729384729384'), 'Masquage strict de la clé API secrète');
  assert(!sanitized.includes('sk-ox-test-84729384'), 'Masquage des tokens de test');
  assert(sanitized.includes('[REDACTED_API_KEY]'), 'Substitution par le marqueur [REDACTED_API_KEY]');

  // TEST 2: Provider Metadata & Configuration Structure
  console.log('\n--- 2. Structure & Enregistrement ProviderRegistry ---');
  assert(oxAlphaProvider.id === 'oxalpha', 'ID Fournisseur correct (oxalpha)');
  assert(oxAlphaProvider.name.includes('OxAlpha'), 'Nom de marque fournisseur configuré');
  assert(oxAlphaProvider.getMetadata().type === 'cloud' || oxAlphaProvider.getMetadata().type === 'custom', 'Type de fournisseur valide');

  const summary = providerRegistry.getStatusSummary();
  const oxAlphaInSummary = summary.find((p) => p.id === 'oxalpha');
  assert(!!oxAlphaInSummary, 'OxAlpha présent dans getStatusSummary()');
  assert(oxAlphaInSummary?.maskedKey === '••••••••••••' || oxAlphaInSummary?.maskedKey === 'Non configurée', 'Clé API masquée dans getStatusSummary');
  assert(typeof oxAlphaInSummary?.configured === 'boolean', 'Statut configured booléen présent');
  assert(typeof oxAlphaInSummary?.circuitState === 'string', 'État Circuit Breaker présent');
  assert(typeof oxAlphaInSummary?.fallback === 'string', 'Fournisseur de fallback défini');

  // TEST 3: Dynamic Config Updating via Registry
  console.log('\n--- 3. Mise à jour dynamique de la configuration ---');
  providerRegistry.updateConfig('oxalpha', { priority: 1, timeout: 20000, temperature: 0.15 });
  const updatedConfig = providerRegistry.getConfig('oxalpha');
  assert(updatedConfig?.priority === 1, 'Priorité mise à jour à 1');
  assert(updatedConfig?.timeout === 20000, 'Timeout mis à jour à 20000ms');
  assert(updatedConfig?.temperature === 0.15, 'Température mise à jour à 0.15');

  // TEST 4: Server-Side Connection Test Probing
  console.log('\n--- 4. Test de Connexion Côté Serveur (testConnection) ---');
  const testResult = await providerRegistry.testProviderConnection('oxalpha');
  assert(typeof testResult.success === 'boolean', 'Retour booléen success');
  assert(typeof testResult.status === 'string', 'Code statut normalisé présent');
  assert(typeof testResult.statusLabel === 'string', 'Libellé de statut human-readable présent');
  assert(typeof testResult.latencyMs === 'number', 'Latence mesurée en millisecondes');
  assert(!JSON.stringify(testResult).includes(process.env.OXALPHA_API_KEY || 'sk-ox-secret-dummy-never-leak'), 'Aucune fuite de clé secrète dans le résultat de test');

  // TEST 5: Task-Based Model Routing
  console.log('\n--- 5. Routage Dynamique par Type de Tâche ---');
  const codeGenProviders = providerRegistry.getProvidersForTask('CODE_GENERATION');
  assert(codeGenProviders.length >= 1, 'Providers disponibles pour CODE_GENERATION');
  const firstCodeGen = codeGenProviders[0];
  assert(firstCodeGen.id === 'oxalpha' || firstCodeGen.id === 'gemini', 'OxAlpha ou Gemini sélectionné en premier selon priorité');

  // TEST 6: Circuit Breaker Resilience & Health Check
  console.log('\n--- 6. Résilience & Circuit Breaker ---');
  const oxBreaker = aiCircuitRegistry.getBreaker('oxalpha');
  assert(oxBreaker.getState() === 'CLOSED' || oxBreaker.getState() === 'HALF_OPEN', 'Circuit Breaker OxAlpha opérationnel');
  const breakerStats = oxBreaker.getStats();
  assert(typeof breakerStats.consecutiveFailures === 'number', 'Compteur de défaillances consécutives actif');

  // TEST 7: Multi-Provider Comparison Observability
  console.log('\n--- 7. Observabilité & Métriques Comparatives ---');
  const comparison = productObservabilityService.getProviderComparison();
  assert(!!comparison['oxalpha'], 'Métriques comparatives pour OxAlpha');
  assert(!!comparison['gemini'], 'Métriques comparatives pour Gemini');
  assert(!!comparison['local_engine'], 'Métriques comparatives pour Local Engine');
  assert(typeof comparison['oxalpha'].averageLatencyMs === 'number', 'Calcul de latence moyenne');
  assert(typeof comparison['oxalpha'].p95LatencyMs === 'number', 'Calcul percentile p95');
  assert(typeof comparison['oxalpha'].circuitState === 'string', 'État circuit dans l observabilité');

  // Summary
  console.log('\n====================================================');
  console.log(`📊 RÉSULTAT FINAL DES TESTS : ${passed} passés / ${failed} échoués`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllIntegrationTests().catch((err) => {
  console.error('Erreur fatale lors des tests d intégration :', err);
  process.exit(1);
});
