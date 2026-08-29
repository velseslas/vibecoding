import { conversationEngine } from './server/conversation/conversationEngine';

async function runAudit() {
  console.log('====================================================');
  console.log('1. TESTING SHORT PROMPTS (PHASE 5)');
  console.log('====================================================');
  const prompts = [
    { name: 'CRM', text: 'Crée-moi un CRM moderne.' },
    { name: 'Marketplace', text: 'Crée-moi une marketplace de vêtements.' },
    { name: 'Chantiers', text: 'Crée-moi une application de gestion de chantiers.' },
    { name: 'Hotels', text: 'Crée-moi une application de réservation d hôtellerie.' }
  ];

  for (const p of prompts) {
    const start = Date.now();
    const pid = 'proj_' + p.name.toLowerCase() + '_' + Date.now();
    const res = await conversationEngine.processUserMessage({ projectId: pid, prompt: p.text });
    console.log(`PROMPT [${p.name}]: "${p.text}"`);
    console.log(`- Archetype: ${res.productUnderstanding?.archetype}`);
    console.log(`- Title: ${res.productBlueprint?.title}`);
    console.log(`- Provider/Model: ${res.orchestrationMetrics?.providerUsed} / ${res.orchestrationMetrics?.modelUsed}`);
    console.log(`- HTML Length: ${res.previewHtml?.length || 0}`);
    console.log(`- Duration: ${Date.now() - start} ms\n`);
  }

  console.log('====================================================');
  console.log('2. TESTING CONVERSATION CONTEXT (PHASE 6 & 7)');
  console.log('====================================================');
  const convPid = 'proj_crm_context_' + Date.now();
  
  console.log('Step 1: "Crée-moi un CRM moderne."');
  const r1 = await conversationEngine.processUserMessage({ projectId: convPid, prompt: 'Crée-moi un CRM moderne.' });
  console.log(`R1 Title: ${r1.productBlueprint?.title}, HTML Len: ${r1.previewHtml?.length}`);

  console.log('Step 2: "Ajoute les clients."');
  const r2 = await conversationEngine.processUserMessage({ projectId: convPid, prompt: 'Ajoute les clients.' });
  console.log(`R2 AI Reply: ${r2.aiResponseText?.slice(0, 100)}`);
  console.log(`R2 HTML Len: ${r2.previewHtml?.length}`);

  console.log('Step 3: "Ajoute maintenant les opportunités."');
  const r3 = await conversationEngine.processUserMessage({ projectId: convPid, prompt: 'Ajoute maintenant les opportunités.' });
  console.log(`R3 AI Reply: ${r3.aiResponseText?.slice(0, 100)}`);

  console.log('Step 4: "Ajoute une recherche dans la liste des clients."');
  const r4 = await conversationEngine.processUserMessage({ projectId: convPid, prompt: 'Ajoute une recherche dans la liste des clients.' });
  console.log(`R4 AI Reply: ${r4.aiResponseText?.slice(0, 100)}`);
}

runAudit().catch(err => console.error('Audit script error:', err));
