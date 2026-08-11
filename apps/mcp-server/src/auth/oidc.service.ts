import { createRemoteJWKSet, createLocalJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import { env } from '../config/env.js';

export interface AuthenticatedUser {
  sub: string;
  issuer: string;
  audience: string | string[];
  scopes: string[];
  email?: string;
  name?: string;
  rawPayload: JWTPayload;
}

export class OidcAuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 401,
    public readonly errorCode: string = 'invalid_token'
  ) {
    super(message);
    this.name = 'OidcAuthError';
  }
}

export class OidcService {
  private remoteJWKSet: JWTVerifyGetKey | null = null;
  private jwksUri: string;
  private issuer: string;
  private audience: string;
  private requiredScope: string;

  constructor(customConfig?: {
    jwksUri?: string;
    issuer?: string;
    audience?: string;
    requiredScope?: string;
    customJWKS?: JWTVerifyGetKey;
  }) {
    this.jwksUri = customConfig?.jwksUri || env.OIDC_JWKS_URI;
    this.issuer = customConfig?.issuer || env.OIDC_ISSUER;
    this.audience = customConfig?.audience || env.OIDC_AUDIENCE;
    this.requiredScope = customConfig?.requiredScope || env.OIDC_REQUIRED_SCOPE;

    if (customConfig?.customJWKS) {
      this.remoteJWKSet = customConfig.customJWKS;
    }
  }

  private getJWKS(): JWTVerifyGetKey {
    if (!this.remoteJWKSet) {
      if (process.env.OIDC_JWKS_JSON) {
        try {
          const parsed = JSON.parse(process.env.OIDC_JWKS_JSON);
          this.remoteJWKSet = createLocalJWKSet(parsed);
          return this.remoteJWKSet;
        } catch {
          // fall through to remote
        }
      }

      try {
        this.remoteJWKSet = createRemoteJWKSet(new URL(this.jwksUri), {
          cooldownDuration: 30000,
          timeoutDuration: 5000,
        });
      } catch (err) {
        throw new OidcAuthError(
          `Invalid OIDC JWKS URI configured: ${this.jwksUri}`,
          500,
          'server_error'
        );
      }
    }
    return this.remoteJWKSet;
  }

  /**
   * Verifies an OIDC Access Token against the remote JWKS endpoint:
   * 1. Cryptographic RS256/ES256 signature verification
   * 2. Issuer verification
   * 3. Audience verification
   * 4. Expiration & Not Before timestamp checks
   * 5. Mandatory Scope enforcement (e.g. mcp:search)
   */
  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    if (!token || typeof token !== 'string') {
      throw new OidcAuthError('Missing Bearer access token', 401, 'invalid_token');
    }

    const cleanToken = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();
    if (!cleanToken) {
      throw new OidcAuthError('Bearer token is empty', 401, 'invalid_token');
    }

    try {
      const keySet = this.getJWKS();
      const { payload } = await jwtVerify(cleanToken, keySet, {
        issuer: this.issuer,
        audience: this.audience,
        clockTolerance: 10, // 10s clock skew tolerance
      });

      // Extract scopes (supports standard OAuth2 space-delimited string or array)
      let tokenScopes: string[] = [];
      if (typeof payload.scope === 'string') {
        tokenScopes = payload.scope.split(' ').filter(Boolean);
      } else if (Array.isArray(payload.scope)) {
        tokenScopes = payload.scope.map(String);
      } else if (Array.isArray((payload as any).scp)) {
        tokenScopes = (payload as any).scp.map(String);
      } else if (typeof (payload as any).scp === 'string') {
        tokenScopes = (payload as any).scp.split(' ').filter(Boolean);
      } else if (Array.isArray((payload as any).permissions)) {
        // Auth0 API permissions array
        tokenScopes = (payload as any).permissions.map(String);
      }

      // Enforce required scope
      if (this.requiredScope && !tokenScopes.includes(this.requiredScope)) {
        throw new OidcAuthError(
          `Insufficient scope. Required scope: "${this.requiredScope}", provided: [${tokenScopes.join(', ')}]`,
          403,
          'insufficient_scope'
        );
      }

      return {
        sub: payload.sub || 'anonymous',
        issuer: typeof payload.iss === 'string' ? payload.iss : this.issuer,
        audience: payload.aud || this.audience,
        scopes: tokenScopes,
        email: typeof payload.email === 'string' ? payload.email : undefined,
        name: typeof payload.name === 'string' ? payload.name : undefined,
        rawPayload: payload,
      };
    } catch (error: any) {
      if (error instanceof OidcAuthError) {
        throw error;
      }

      // jose specific error mapping
      if (error.code === 'ERR_JWT_EXPIRED') {
        throw new OidcAuthError('Access token has expired', 401, 'invalid_token');
      }
      if (error.code === 'ERR_JWT_CLAIM_VALIDATION_FAILED') {
        throw new OidcAuthError(`Claim validation failed: ${error.message}`, 401, 'invalid_token');
      }
      if (error.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
        throw new OidcAuthError('Cryptographic signature verification failed', 401, 'invalid_token');
      }

      throw new OidcAuthError(
        `Token verification failed: ${error.message || 'Unknown error'}`,
        401,
        'invalid_token'
      );
    }
  }

  /**
   * Generates standard RFC Protected Resource Metadata for OAuth 2.0 / MCP Discovery.
   */
  getProtectedResourceMetadata() {
    return {
      resource: this.audience,
      authorization_servers: [this.issuer],
      scopes_supported: [this.requiredScope, 'mcp:read'],
      bearer_methods_supported: ['header'],
      resource_documentation: 'https://modelcontextprotocol.io/docs/concepts/architecture#security',
    };
  }
}

export const oidcService = new OidcService();
