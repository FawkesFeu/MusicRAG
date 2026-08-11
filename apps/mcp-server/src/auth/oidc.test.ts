import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPair, SignJWT, exportJWK, type GenerateKeyPairResult, createLocalJWKSet, type JSONWebKeySet } from 'jose';
import { OidcService, OidcAuthError } from './oidc.service.js';

describe('MCP Server OIDC Resource Server Authentication', () => {
  let keyPair: GenerateKeyPairResult;
  let attackerKeyPair: GenerateKeyPairResult;
  let publicJWKS: JSONWebKeySet;
  let oidcService: OidcService;

  const ISSUER = 'https://auth.playablefactory.com/';
  const AUDIENCE = 'https://mcp.playablefactory.com';
  const REQUIRED_SCOPE = 'mcp:search';

  beforeAll(async () => {
    // Generate valid IdP RS256 Keypair
    keyPair = await generateKeyPair('RS256');
    const publicJwk = await exportJWK(keyPair.publicKey);
    publicJwk.kid = 'test-key-1';
    publicJwk.alg = 'RS256';
    publicJwk.use = 'sig';

    publicJWKS = { keys: [publicJwk] };

    // Generate untrusted attacker keypair
    attackerKeyPair = await generateKeyPair('RS256');

    // Initialize OidcService with local JWKS mock
    const localJWKS = createLocalJWKSet(publicJWKS);
    oidcService = new OidcService({
      issuer: ISSUER,
      audience: AUDIENCE,
      requiredScope: REQUIRED_SCOPE,
      customJWKS: localJWKS,
    });
  });

  it('1. Successfully verifies valid OIDC JWT with required scope', async () => {
    const token = await new SignJWT({
      scope: 'mcp:search email profile',
      email: 'engineer@playablefactory.com',
      name: 'Baran Erol',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject('usr_12345')
      .setExpirationTime('1h')
      .sign(keyPair.privateKey);

    const user = await oidcService.verifyAccessToken(`Bearer ${token}`);

    expect(user.sub).toBe('usr_12345');
    expect(user.email).toBe('engineer@playablefactory.com');
    expect(user.scopes).toContain('mcp:search');
    expect(user.issuer).toBe(ISSUER);
    expect(user.audience).toBe(AUDIENCE);
  });

  it('2. Rejects request with missing or empty Bearer token', async () => {
    await expect(oidcService.verifyAccessToken('')).rejects.toThrow(OidcAuthError);
    await expect(oidcService.verifyAccessToken('')).rejects.toMatchObject({
      statusCode: 401,
      errorCode: 'invalid_token',
    });
  });

  it('3. Rejects expired OIDC access tokens', async () => {
    const expiredToken = await new SignJWT({
      scope: 'mcp:search',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject('usr_expired')
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1800) // Expired 30 mins ago
      .sign(keyPair.privateKey);

    await expect(oidcService.verifyAccessToken(expiredToken)).rejects.toMatchObject({
      statusCode: 401,
      message: 'Access token has expired',
    });
  });

  it('4. Rejects token with invalid issuer (untrusted IdP)', async () => {
    const wrongIssuerToken = await new SignJWT({
      scope: 'mcp:search',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
      .setIssuedAt()
      .setIssuer('https://malicious-idp.com/')
      .setAudience(AUDIENCE)
      .setSubject('usr_fake')
      .setExpirationTime('1h')
      .sign(keyPair.privateKey);

    await expect(oidcService.verifyAccessToken(wrongIssuerToken)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('5. Rejects token with invalid audience (token intended for another API)', async () => {
    const wrongAudienceToken = await new SignJWT({
      scope: 'mcp:search',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience('https://other-service.com')
      .setSubject('usr_other')
      .setExpirationTime('1h')
      .sign(keyPair.privateKey);

    await expect(oidcService.verifyAccessToken(wrongAudienceToken)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('6. Rejects token with insufficient scope (e.g. mcp:read instead of mcp:search)', async () => {
    const insufficientScopeToken = await new SignJWT({
      scope: 'mcp:read analytics:view', // missing mcp:search
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject('usr_limited')
      .setExpirationTime('1h')
      .sign(keyPair.privateKey);

    await expect(oidcService.verifyAccessToken(insufficientScopeToken)).rejects.toMatchObject({
      statusCode: 403,
      errorCode: 'insufficient_scope',
    });
  });

  it('7. Rejects tampered tokens signed with an untrusted key', async () => {
    const attackerToken = await new SignJWT({
      scope: 'mcp:search',
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key-1' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setSubject('usr_hacker')
      .setExpirationTime('1h')
      .sign(attackerKeyPair.privateKey); // Signed with untrusted key

    await expect(oidcService.verifyAccessToken(attackerToken)).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('8. Exposes standard RFC Protected Resource Metadata', () => {
    const metadata = oidcService.getProtectedResourceMetadata();
    expect(metadata.resource).toBe(AUDIENCE);
    expect(metadata.authorization_servers).toContain(ISSUER);
    expect(metadata.scopes_supported).toContain('mcp:search');
    expect(metadata.bearer_methods_supported).toContain('header');
  });
});
