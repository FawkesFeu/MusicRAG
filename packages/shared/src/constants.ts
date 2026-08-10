export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export const DEFAULT_CHUNK_SETTINGS = {
  MAX_CHUNK_SIZE: 512,
  OVERLAP_SIZE: 50,
  SEPARATORS: ['\n## ', '\n### ', '\n\n', '\n', '. ', ' ', ''],
} as const;

export const DEFAULT_SEARCH_SETTINGS = {
  TOP_K: 5,
  MIN_SIMILARITY: 0.2,
  VECTOR_DIMENSION: 768, // Google text-embedding-004
} as const;

export const MODELS = {
  LLM_DEFAULT: 'gemini-2.0-flash',
  EMBEDDING_DEFAULT: 'text-embedding-004',
} as const;

export const DEMO_CREDENTIALS = {
  ADMIN: {
    email: 'admin@example.com',
    password: 'admin123Password!',
    name: 'Admin User',
  },
  USER: {
    email: 'user@example.com',
    password: 'user123Password!',
    name: 'Standard User',
  },
} as const;
