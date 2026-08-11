export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  // In browser, if NEXT_PUBLIC_API_URL is unset, relative URLs are proxied by Next.js rewrites
  if (typeof window !== 'undefined') {
    return '';
  }
  return 'http://localhost:3001';
}

export class ApiError extends Error {
  constructor(public statusCode: number, message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('rag_access_token');
}

export function setAuthTokens(accessToken: string, refreshToken: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('rag_access_token', accessToken);
  localStorage.setItem('rag_refresh_token', refreshToken);
}

export function clearAuthTokens() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('rag_access_token');
  localStorage.removeItem('rag_refresh_token');
  localStorage.removeItem('rag_user');
}

export const apiClient = {
  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = getApiBaseUrl();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(response.status, data.error || 'Network request failed', data.code);
    }

    return data.data !== undefined ? data.data : data;
  },

  get<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  },

  post<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  },

  patch<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async streamSearch(
    params: { query: string; topK?: number; generateAnswer?: boolean },
    callbacks: {
      onMetadata?: (data: { query: string; retrievedChunks: any[] }) => void;
      onDelta?: (delta: string) => void;
      onDone?: (data: any) => void;
      onError?: (err: Error) => void;
    },
    signal?: AbortSignal
  ): Promise<void> {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/search/stream`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: params.query,
          topK: params.topK || 5,
          generateAnswer: params.generateAnswer ?? true,
        }),
        signal,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new ApiError(response.status, errorJson.error || 'Streaming request failed');
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported in this browser environment');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep trailing incomplete line in buffer
        buffer = lines.pop() || '';

        let currentEvent = 'message';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.substring(6).trim();
          } else if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.substring(5).trim();
            try {
              const data = JSON.parse(dataStr);
              if (currentEvent === 'metadata') {
                callbacks.onMetadata?.(data);
              } else if (currentEvent === 'delta') {
                callbacks.onDelta?.(data.delta);
              } else if (currentEvent === 'done') {
                callbacks.onDone?.(data);
              } else if (currentEvent === 'error') {
                callbacks.onError?.(new Error(data.error || 'Streaming error'));
              }
            } catch (e) {
              console.warn('[SSE] Error parsing stream line:', dataStr);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        callbacks.onError?.(err);
      }
    }
  },
};

