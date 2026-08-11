import http from 'node:http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { env } from './config/env.js';
import { oidcService, OidcAuthError, type AuthenticatedUser } from './auth/oidc.service.js';

const server = new Server(
  {
    name: 'playable-factory-rag-search',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 1. Define List Tools Handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'semantic_search',
        description: 'Semantically search the Playable Factory knowledge base corpus and retrieve grounded answers with citations. Requires OIDC Bearer Token with "mcp:search" scope.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Natural language question or search query (e.g., "What is the AppLovin maximum bundle size?")',
            },
            topK: {
              type: 'number',
              description: 'Number of relevant document chunks to retrieve (1 to 20, default: 5)',
              default: 5,
            },
            accessToken: {
              type: 'string',
              description: 'Optional OIDC JWT Bearer token when running in non-HTTP stdio mode with "mcp:search" scope.',
            },
          },
          required: ['query'],
        },
      },
    ],
  };
});

function formatMarkdownResponse(data: any, authenticatedUser?: AuthenticatedUser): string {
  const { answer, citations, retrievedChunks, confidence } = data;

  let output = `### Answer\n${answer || 'No answer generated.'}\n\n`;

  if (citations && citations.length > 0) {
    output += `### Sources & Citations:\n`;
    citations.forEach((citation: any, idx: number) => {
      output += `${idx + 1}. **${citation.documentTitle}** (\`${citation.filename}\`)`;
      if (citation.pageNumber) output += ` - Page ${citation.pageNumber}`;
      if (citation.section) output += ` - *${citation.section}*`;
      output += `\n`;
    });
    output += `\n`;
  }

  if (retrievedChunks && retrievedChunks.length > 0) {
    output += `### Relevant Excerpts:\n`;
    retrievedChunks.slice(0, 3).forEach((chunk: any, idx: number) => {
      const excerpt = chunk.content.length > 300 ? `${chunk.content.substring(0, 300)}...` : chunk.content;
      output += `> **[Source ${idx + 1}] (${chunk.documentTitle})**\n> ${excerpt.replace(/\n/g, '\n> ')}\n\n`;
    });
  }

  output += `*Confidence Score: ${(confidence * 100).toFixed(0)}%*`;
  if (authenticatedUser) {
    output += `\n*Authenticated via OIDC: \`${authenticatedUser.sub}\` (${authenticatedUser.scopes.join(', ')})*`;
  }
  return output;
}

// 2. Define Call Tool Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'semantic_search') {
    const args = request.params.arguments as { query: string; topK?: number; accessToken?: string } | undefined;
    const query = args?.query?.trim();
    const topK = args?.topK || 5;

    if (!query) {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: "query" parameter is required and cannot be empty.',
          },
        ],
        isError: true,
      };
    }

    let authUser: AuthenticatedUser | undefined;

    // Validate OIDC token if provided in arguments or environment
    if (env.MCP_ENABLE_OIDC) {
      const token = args?.accessToken || process.env.MCP_ACCESS_TOKEN;
      if (token) {
        try {
          authUser = await oidcService.verifyAccessToken(token);
        } catch (err: any) {
          return {
            content: [
              {
                type: 'text',
                text: `Authentication Error (OIDC 401/403): ${err.message}`,
              },
            ],
            isError: true,
          };
        }
      }
    }

    try {
      const response = await fetch(`${env.API_URL}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.MCP_API_TOKEN}`,
        },
        body: JSON.stringify({ query, topK, generateAnswer: true }),
      });

      if (!response.ok) {
        const errJson = (await response.json().catch(() => ({}))) as any;
        return {
          content: [
            {
              type: 'text',
              text: `API Error (${response.status}): ${errJson.error || response.statusText}`,
            },
          ],
          isError: true,
        };
      }

      const resJson = (await response.json()) as any;
      const formatted = formatMarkdownResponse(resJson.data, authUser);

      return {
        content: [
          {
            type: 'text',
            text: formatted,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: `Connection failed to RAG API at ${env.API_URL}: ${(err as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `Tool "${request.params.name}" not found.`,
      },
    ],
    isError: true,
  };
});

// 3. HTTP Server with OAuth 2.0 / OIDC Authentication Middleware
export function startHttpServer(port: number = env.MCP_SERVER_PORT) {
  const httpServer = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 1. Standard RFC Protected Resource Metadata Discovery Endpoint
    if (req.url === '/.well-known/oauth-protected-resource' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(oidcService.getProtectedResourceMetadata(), null, 2));
      return;
    }

    // Health check endpoint
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'rag-mcp-server', oidcEnabled: env.MCP_ENABLE_OIDC }));
      return;
    }

    // 2. Protected MCP RPC Execution Endpoint
    if (req.url === '/mcp' && req.method === 'POST') {
      const authHeader = req.headers['authorization'];

      // Enforce OIDC Authentication Boundary
      if (env.MCP_ENABLE_OIDC) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          res.writeHead(401, {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer error="invalid_token", error_description="Missing or malformed Bearer token"',
          });
          res.end(JSON.stringify({ error: 'Unauthorized: Missing Bearer token' }));
          return;
        }

        try {
          await oidcService.verifyAccessToken(authHeader);
        } catch (err: any) {
          const status = err instanceof OidcAuthError ? err.statusCode : 401;
          const errorCode = err instanceof OidcAuthError ? err.errorCode : 'invalid_token';
          res.writeHead(status, {
            'Content-Type': 'application/json',
            'WWW-Authenticate': `Bearer error="${errorCode}", error_description="${err.message}"`,
          });
          res.end(JSON.stringify({ error: err.message, code: errorCode }));
          return;
        }
      }

      // Read JSON Body
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body);
          const query = parsed?.query || parsed?.params?.arguments?.query;
          const topK = parsed?.topK || parsed?.params?.arguments?.topK || 5;

          const response = await fetch(`${env.API_URL}/api/search`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${env.MCP_API_TOKEN}`,
            },
            body: JSON.stringify({ query, topK, generateAnswer: true }),
          });

          const resJson = await response.json();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(resJson));
        } catch (err: any) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found' }));
  });

  httpServer.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[MCP] Note: HTTP port ${port} already in use; continuing with stdio transport.`);
    } else {
      console.error(`[MCP] HTTP server warning:`, err.message);
    }
  });

  httpServer.listen(port, () => {
    console.error(`[MCP] Playable Factory RAG MCP Server listening on HTTP port ${port}`);
    console.error(`[MCP] OIDC Protected Resource Discovery: http://localhost:${port}/.well-known/oauth-protected-resource`);
  });

  return httpServer;
}

// 4. Start MCP Server (Stdio + HTTP)
async function main() {
  if (process.env.MCP_TRANSPORT !== 'stdio_only') {
    // Start HTTP Server with OIDC Protection
    startHttpServer(env.MCP_SERVER_PORT);
  }

  // Also connect to Stdio Transport for desktop LLM agents
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Playable Factory RAG MCP Server running over stdio & HTTP.');
}

// Auto-run if executed directly
if (process.env.NODE_ENV !== 'test') {
  main().catch((err) => {
    console.error('[MCP] Fatal error:', err);
    process.exit(1);
  });
}
