import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

export const env = {
  API_URL: process.env.API_URL || 'http://localhost:3001',
  MCP_SERVER_PORT: parseInt(process.env.MCP_SERVER_PORT || '3002', 10),
  MCP_API_TOKEN: process.env.MCP_API_TOKEN || 'mcp-secret-token-rag-2026',
  
  // OIDC Resource Server Configuration
  OIDC_ISSUER: process.env.OIDC_ISSUER || 'https://auth.musicrag.local/',
  OIDC_AUDIENCE: process.env.OIDC_AUDIENCE || 'https://mcp.musicrag.local',
  OIDC_JWKS_URI: process.env.OIDC_JWKS_URI || 'https://auth.musicrag.local/.well-known/jwks.json',
  OIDC_REQUIRED_SCOPE: process.env.OIDC_REQUIRED_SCOPE || 'mcp:search',
  MCP_ENABLE_OIDC: process.env.MCP_ENABLE_OIDC !== 'false',
};
