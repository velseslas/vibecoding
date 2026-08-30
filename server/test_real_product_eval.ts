import { conversationEngine } from './conversation/conversationEngine';
import * as fs from 'fs';

const logFile = './eval_output.log';
fs.writeFileSync(logFile, '=== START REAL PRODUCT EVALUATION ===\n');

function log(msg: string) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + '\n');
}

async function runRealProductEvaluation() {
  log('============================================================');
  log('REAL PRODUCT GENERATION EVALUATION');
  log('============================================================\n');

  const testPrompts = [
    { key: 'Facebook', prompt: 'Crée-moi un clone de Facebook moderne.' },
    { key: 'Instagram', prompt: 'Crée-moi Instagram.' },
    { key: 'Construction Management', prompt: 'Crée-moi une application de gestion de chantiers.' },
    { key: 'Marketplace', prompt: 'Crée-moi une marketplace moderne.' },
    { key: 'Hotel Booking', prompt: 'Crée-moi une application de réservation d hôtellerie.' }
  ];

  const genericForbiddenStrings = [
    'Interface principale interactive',
    'Contrôles de filtrage',
    'Gestion des données dynamiques',
    'Navigation fluide',
    'Feedback visuel sur les actions',
    'États vides conviviaux',
    'Exigence implicite du pattern produit',
    'Fonctionnalité explicite demandée par l utilisateur'
  ];

  for (const item of testPrompts) {
    log(`\n============================================================`);
    log(`EVALUATING TEST: ${item.key}`);
    log(`PROMPT: "${item.prompt}"`);
    log(`============================================================`);

    const projectId = `proj_real_eval_${item.key.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const start = Date.now();

    try {
      const res = await conversationEngine.processUserMessage({
        projectId,
        prompt: item.prompt
      });

      const duration = Date.now() - start;
      const html = res.previewHtml || '';

      log(`\n--- 1. INTENT & ARCHETYPE ---`);
      log(`Archetype: ${res.productUnderstanding?.archetype}`);
      log(`Title: ${res.productBlueprint?.title}`);
      log(`Summary: ${res.productUnderstanding?.productGoal || ''}`);

      log(`\n--- 2. PRODUCT BLUEPRINT & UX PLAN ---`);
      log(`Blueprint Screens: ${JSON.stringify(res.productBlueprint?.screens?.map(s => s.title))}`);
      log(`Key Features: ${JSON.stringify(res.productBlueprint?.features)}`);

      log(`\n--- 3. PROVIDER & MODEL METRICS ---`);
      log(`Provider Used: ${res.orchestrationMetrics?.providerUsed}`);
      log(`Model Used: ${res.orchestrationMetrics?.modelUsed}`);
      log(`Duration: ${duration} ms`);

      log(`\n--- 4. GENERATION SOURCE ---`);
      log(`Source: ${res.orchestrationMetrics?.fellBack ? 'Fallback/Local Synthesizer' : 'Real LLM'}`);

      log(`\n--- 5. HTML PREVIEW ANALYSIS ---`);
      log(`HTML Length: ${html.length} chars`);

      let detectedGenericStrings: string[] = [];
      for (const str of genericForbiddenStrings) {
        if (html.includes(str)) {
          detectedGenericStrings.push(str);
        }
      }

      log(`Generic Checklist Strings Found: ${detectedGenericStrings.length > 0 ? detectedGenericStrings.join(', ') : 'NONE (PASS)'}`);

      // Specific Feature Audit in HTML
      log(`\n--- 6. DOM / FEATURE INSPECTION ---`);
      if (item.key === 'Facebook') {
        log(`- Header / Navigation: ${html.includes('header') || html.includes('nav')}`);
        log(`- Stories Bar: ${html.includes('Story') || html.includes('story') || html.includes('Stories')}`);
        log(`- Feed / Posts: ${html.includes('post') || html.includes('Post') || html.includes('feed')}`);
        log(`- Like Action: ${html.includes('Like') || html.includes("J'aime") || html.includes('like')}`);
        log(`- Comments Action: ${html.includes('Comment') || html.includes('comment') || html.includes('Commenter')}`);
        log(`- Modals / Creation: ${html.includes('modal') || html.includes('Modal') || html.includes('Publier')}`);
        log(`- Sidebar / Contacts: ${html.includes('Amis') || html.includes('Contacts') || html.includes('raccourci') || html.includes('sidebar')}`);
      } else if (item.key === 'Instagram') {
        log(`- Grid / Feed: ${html.includes('grid') || html.includes('Feed') || html.includes('feed')}`);
        log(`- Stories Carousel: ${html.includes('story') || html.includes('Stories') || html.includes('Story')}`);
        log(`- Likes / Hearts: ${html.includes('like') || html.includes('heart') || html.includes("J'aime")}`);
        log(`- Comments Modal: ${html.includes('comment') || html.includes('Comment')}`);
        log(`- Profile / Avatar: ${html.includes('profile') || html.includes('avatar') || html.includes('Profil')}`);
      } else if (item.key === 'Construction Management') {
        log(`- Chantiers List / Kanban: ${html.includes('Chantier') || html.includes('chantier') || html.includes('Projet')}`);
        log(`- Status Tracking: ${html.includes('En cours') || html.includes('Terminé') || html.includes('Avancement')}`);
        log(`- Team / Workers: ${html.includes('Équipe') || html.includes('Ouvrier') || html.includes('Artisan')}`);
      } else if (item.key === 'Marketplace') {
        log(`- Products Grid: ${html.includes('Produit') || html.includes('produit') || html.includes('Article')}`);
        log(`- Category Filters: ${html.includes('Catégorie') || html.includes('Filtre') || html.includes('Prix')}`);
        log(`- Cart / Checkout: ${html.includes('Panier') || html.includes('cart') || html.includes('Acheter')}`);
      } else if (item.key === 'Hotel Booking') {
        log(`- Search Bar (Dates/City): ${html.includes('Recherche') || html.includes('Ville') || html.includes('Date')}`);
        log(`- Hotel Cards: ${html.includes('Hôtel') || html.includes('hotel') || html.includes('Nuit')}`);
        log(`- Booking Modal: ${html.includes('Réserver') || html.includes('Réservation')}`);
      }

      log(`\n--- 7. SAMPLE HTML SNIPPET (First 300 chars) ---`);
      log(html.slice(0, 300));

    } catch (err: any) {
      log(`Error processing ${item.key}: ${err?.message || err}`);
    }
  }

  log('\n=== EVALUATION COMPLETE ===');
}

runRealProductEvaluation().catch(err => log(`Fatal error: ${err}`));
