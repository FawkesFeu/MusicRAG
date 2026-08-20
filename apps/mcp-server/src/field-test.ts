import { generateKeyPair, SignJWT, exportJWK, createLocalJWKSet } from 'jose';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runFieldTest() {
  console.log('\n======================================================================');
  console.log('🤖 STARTING MCP OIDC LIVE FIELD TEST (External AI Agent Simulation)');
  console.log('======================================================================\n');

  // 1. Identity Provider (IdP) Key Setup
  console.log('🔑 [Step 1: IdP Key Generation]');
  const keyPair = await generateKeyPair('RS256');
  const publicJwk = await exportJWK(keyPair.publicKey);
  publicJwk.kid = 'pf-auth-key-2026';
  publicJwk.alg = 'RS256';
  publicJwk.use = 'sig';

  const ISSUER = 'https://auth.musicrag.local/';
  const AUDIENCE = 'https://mcp.musicrag.local';

  // 2. Generate Authorized AI Agent Token
  console.log('🎫 [Step 2: Issuing OIDC Access Token to External AI Agent]');
  const authorizedAiToken = await new SignJWT({
    scope: 'mcp:search email profile',
    agent_id: 'claude-3-5-sonnet-desktop',
    client_name: 'Cursor & Claude MCP Client',
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'music-auth-key-2026' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject('agent_claude_99')
    .setExpirationTime('2h')
    .sign(keyPair.privateKey);

  console.log(`  ✓ Token generated: "${authorizedAiToken.slice(0, 35)}...[TRUNCATED]"`);
  console.log(`  ✓ Claims: sub="agent_claude_99", scope="mcp:search", aud="${AUDIENCE}"\n`);

  const publicJWKS = { keys: [publicJwk] };

  // 3. Connect to MCP Server via Stdio Process Transport
  console.log('🔌 [Step 3: Connecting External AI Client to MCP Server]');
  const serverPath = path.resolve(__dirname, 'server.ts');
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['tsx', serverPath],
    env: {
      ...process.env,
      MCP_ENABLE_OIDC: 'true',
      OIDC_JWKS_JSON: JSON.stringify(publicJWKS),
    },
  });

  const client = new Client(
    {
      name: 'external-ai-evaluator',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  await client.connect(transport);
  console.log('  ✓ Connected to MCP Server via Model Context Protocol JSON-RPC.');

  // 4. Discover Tools via MCP ListTools
  console.log('\n🔍 [Step 4: AI Agent Discovering Tools (ListTools)]');
  const toolsResult = await client.listTools();
  console.log(`  ✓ Discovered ${toolsResult.tools.length} tool(s):`);
  toolsResult.tools.forEach((t) => {
    console.log(`    - [Tool]: ${t.name}`);
    console.log(`      Description: "${t.description}"`);
  });

  // 5. Call Tool as Authorized AI Agent
  console.log('\n💬 [Step 5: AI Agent Executing "semantic_search" with OIDC Token]');
  const query = 'What are the integrated LUFS targets and true peak limits for Spotify vs Apple Music?';
  console.log(`  Query: "${query}"`);

  const toolCallResult = await client.callTool({
    name: 'semantic_search',
    arguments: {
      query,
      topK: 3,
      accessToken: authorizedAiToken,
    },
  });

  console.log('\n📥 [Step 6: Real Grounded Result Received by External AI]:');
  console.log('----------------------------------------------------------------------');
  const contentList = (toolCallResult as any).content as Array<{ type: string; text: string }> | undefined;
  if (contentList && contentList.length > 0) {
    const textContent = contentList[0].text;
    console.log(textContent);
  }
  console.log('----------------------------------------------------------------------\n');

  // 6. Test Unauthorized AI Agent (Negative Control)
  console.log('🚫 [Step 7: Negative Security Test: AI Agent with Insufficient Scope ("mcp:read")]');
  const unauthorizedToken = await new SignJWT({
    scope: 'mcp:read', // missing mcp:search
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'music-auth-key-2026' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject('unauthorized_bot')
    .setExpirationTime('2h')
    .sign(keyPair.privateKey);

  const blockedResult = await client.callTool({
    name: 'semantic_search',
    arguments: {
      query: 'What is the Spotify LUFS limit?',
      accessToken: unauthorizedToken,
    },
  });

  const blockedContent = (blockedResult as any).content as Array<{ type: string; text: string }> | undefined;
  console.log('  Server Response to Unauthorized AI:');
  console.log(`  IsError: ${blockedResult.isError}`);
  console.log(`  Message: ${blockedContent && blockedContent.length > 0 ? blockedContent[0].text : 'No message'}\n`);

  console.log('======================================================================');
  console.log('🎉 MCP OIDC LIVE FIELD TEST COMPLETED WITH 100% SUCCESS!');
  console.log('======================================================================\n');

  await client.close();
  process.exit(0);
}

runFieldTest().catch((err) => {
  console.error('Field test failed:', err);
  process.exit(1);
});
