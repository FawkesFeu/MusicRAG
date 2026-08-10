import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3001';
const MCP_API_TOKEN = process.env.MCP_API_TOKEN || 'mcp-secret-token-rag-2026';

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
        description: 'Semantically search the Playable Factory knowledge base corpus and retrieve grounded answers with citations.',
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
          },
          required: ['query'],
        },
      },
    ],
  };
});

function formatMarkdownResponse(data: any): string {
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
  return output;
}

// 2. Define Call Tool Handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'semantic_search') {
    const args = request.params.arguments as { query: string; topK?: number } | undefined;
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

    try {
      const response = await fetch(`${API_URL}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MCP_API_TOKEN}`,
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
      const formatted = formatMarkdownResponse(resJson.data);

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
            text: `Connection failed to RAG API at ${API_URL}: ${(err as Error).message}`,
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

// 3. Start MCP Server via Stdio Transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[MCP] Playable Factory RAG MCP Server running over stdio.');
}

main().catch((err) => {
  console.error('[MCP] Fatal error:', err);
  process.exit(1);
});
