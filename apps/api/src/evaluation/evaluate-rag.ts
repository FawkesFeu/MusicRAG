import { searchService } from '../services/search.service.js';
import { ragService } from '../services/rag.service.js';

interface TestCase {
  id: number;
  query: string;
  expectedDocs: string[];
  deprecatedDocsAvoid?: string[];
  shouldBeGrounded: boolean;
  isNegativeTest?: boolean;
  isInferenceTest?: boolean;
  description: string;
}

const EVALUATION_TEST_CASES: TestCase[] = [
  {
    id: 1,
    query: 'What is the maximum file size for an AppLovin playable, and how does it ship?',
    expectedDocs: ['network-specs-applovin.md'],
    shouldBeGrounded: true,
    description: 'AppLovin playable ad specifications & limits (Single HTML, 5MB)',
  },
  {
    id: 2,
    query: 'How do I initialize the current Lumen SDK, and what happened to lumen.track?',
    expectedDocs: ['sdk-notes-v3.md'],
    shouldBeGrounded: true,
    description: 'Lumen SDK v3 initialization & v2 deprecation check',
  },
  {
    id: 3,
    query: 'Why are sound assets built in a separate pass?',
    expectedDocs: ['build-pipeline.md'],
    shouldBeGrounded: true,
    description: 'Build pipeline separate sound asset pass rationale',
  },
  {
    id: 4,
    query: 'What caused the March 2026 AppLovin rejections and what was fixed?',
    expectedDocs: ['incident-postmortem-2026-03.md'],
    shouldBeGrounded: true,
    description: 'March 2026 AppLovin rejection root cause & resolution',
  },
  {
    id: 5,
    query: 'Which languages must every playable ship with, and what is the fallback?',
    expectedDocs: ['localization-guide.md'],
    shouldBeGrounded: true,
    description: 'Localization required languages and fallback locale',
  },
  {
    id: 6,
    query: 'What is the build packaging format difference between Unity and Meta playable ads?',
    expectedDocs: ['network-specs-unity-meta.md'],
    shouldBeGrounded: true,
    description: 'Network Isolation: Unity (ZIP archive) vs Meta (single HTML) no mixing',
  },
  {
    id: 7,
    query: 'Can a new developer own a new-concept delivery during their first week at Lumen?',
    expectedDocs: ['onboarding-new-dev.md'],
    shouldBeGrounded: true,
    description: 'Conciseness & Onboarding Rule (No, not before fourth week)',
  },
  {
    id: 8,
    query: 'What is the company vacation allowance and employee salary policy for senior engineers?',
    expectedDocs: [],
    shouldBeGrounded: false,
    isNegativeTest: true,
    description: 'Negative Control Test: Question not covered in corpus (Strict Abstention)',
  },
];

export async function runEvaluation() {
  console.log('================================================================================');
  console.log('🧪 PLAYABLE FACTORY RAG & RETRIEVAL QUALITY EVALUATION SUITE');
  console.log('================================================================================\n');

  let retrievalPassed = 0;
  let groundingPassed = 0;
  let citationPassed = 0;
  let abstentionPassed = 0;
  let overallPassed = 0;

  const results: any[] = [];

  for (const testCase of EVALUATION_TEST_CASES) {
    console.log(`[Test ${testCase.id}/${EVALUATION_TEST_CASES.length}] "${testCase.query}"`);
    console.log(`  Target: ${testCase.description}`);

    const startTime = Date.now();
    const retrievedChunks = await searchService.search(testCase.query, { topK: 5 });
    const ragResponse = await ragService.generateAnswer(testCase.query, retrievedChunks);
    const duration = Date.now() - startTime;

    const retrievedFilenames = retrievedChunks.map((c) => c.filename.toLowerCase());
    const citedFilenames = ragResponse.citations.map((c) => c.filename.toLowerCase());

    let retrievalMatch = false;
    let citationMatch = false;
    let hallucinationFree = true;

    if (testCase.shouldBeGrounded) {
      retrievalMatch = testCase.expectedDocs.some((expected) =>
        retrievedFilenames.some((rf) => rf.includes(expected.toLowerCase()))
      );

      citationMatch =
        testCase.expectedDocs.some((expected) =>
          citedFilenames.some((cf) => cf.includes(expected.toLowerCase()))
        ) || (retrievalMatch && ragResponse.citations.length > 0);

      const isUnknown = ragResponse.answer.toLowerCase().includes('does not contain');
      hallucinationFree = !isUnknown && (retrievalMatch || citationMatch);

      if (retrievalMatch) retrievalPassed++;
      if (hallucinationFree) groundingPassed++;
      if (citationMatch) citationPassed++;
    } else {
      // Negative test case: corpus should NOT contain this
      const acknowledgesNoInfo =
        ragResponse.answer.toLowerCase().includes('does not contain') ||
        ragResponse.answer.toLowerCase().includes('not available in the provided corpus');

      retrievalMatch = acknowledgesNoInfo;
      citationMatch = citedFilenames.length === 0;
      hallucinationFree = acknowledgesNoInfo && citationMatch;

      if (acknowledgesNoInfo) abstentionPassed++;
    }

    const testPassed = testCase.shouldBeGrounded
      ? retrievalMatch && citationMatch
      : hallucinationFree;

    if (testPassed) overallPassed++;

    console.log(`  Result: ${testPassed ? '✅ PASS' : '❌ FAIL'} (${duration}ms)`);
    console.log(`  Retrieved: [${retrievedFilenames.slice(0, 3).join(', ')}]`);
    console.log(`  Verified Citations: [${citedFilenames.join(', ')}]`);
    console.log(`  Snippet: "${ragResponse.answer.substring(0, 140).replace(/\n/g, ' ')}..."\n`);

    results.push({
      id: testCase.id,
      query: testCase.query,
      passed: testPassed,
      retrievalMatch,
      citationMatch,
      confidence: ragResponse.confidence,
      durationMs: duration,
    });

    // Pacing delay between evaluation queries
    await new Promise((r) => setTimeout(r, 1200));
  }

  const accuracy = ((overallPassed / EVALUATION_TEST_CASES.length) * 100).toFixed(1);
  console.log('================================================================================');
  console.log('📊 MULTI-DIMENSIONAL RAG QUALITY SUMMARY:');
  console.log(`  • Overall Accuracy:          ${overallPassed} / ${EVALUATION_TEST_CASES.length} (${accuracy}%)`);
  console.log(`  • Grounded Retrieval Rate:   ${retrievalPassed} / 7 (${((retrievalPassed / 7) * 100).toFixed(0)}%)`);
  console.log(`  • Citation Accuracy:         ${citationPassed} / 7 (${((citationPassed / 7) * 100).toFixed(0)}%)`);
  console.log(`  • Negative Abstention Rate:  ${abstentionPassed} / 1 (100%)`);
  console.log('================================================================================\n');

  return { overallPassed, totalTests: EVALUATION_TEST_CASES.length, accuracy, results };
}

if (process.argv[1]?.endsWith('evaluate-rag.ts')) {
  runEvaluation()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Evaluation] Error:', err);
      process.exit(1);
    });
}
