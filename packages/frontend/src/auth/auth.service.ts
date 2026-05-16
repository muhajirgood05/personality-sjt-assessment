/**
 * Authentication service for the frontend.
 * Stores JWT tokens in memory only (not localStorage) for security.
 *
 * Validates: Requirements 1.1, 1.2
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  employeeId: string;
  password: string;
}

export interface LoginResponse {
  success: true;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    role: 'administrator' | 'candidate';
    candidateId?: string;
    adminId?: string;
  };
}

export interface LoginErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR' | 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED';
    message: string;
    details?: {
      lockedUntil?: string;
      remainingSeconds?: string;
    };
  };
}

export interface RefreshResponse {
  success: true;
  data: {
    accessToken: string;
    expiresIn: number;
  };
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  role: 'administrator' | 'candidate' | null;
  userId: string | null;
}

// ─── In-Memory Token Store ───────────────────────────────────────────────────

let authState: AuthState = {
  accessToken: null,
  refreshToken: null,
  role: null,
  userId: null,
};

/**
 * Get the current access token from memory.
 */
export function getAccessToken(): string | null {
  return authState.accessToken;
}

/**
 * Get the current refresh token from memory.
 */
export function getRefreshToken(): string | null {
  return authState.refreshToken;
}

/**
 * Get the current auth state (read-only snapshot).
 */
export function getAuthState(): Readonly<AuthState> {
  return { ...authState };
}

/**
 * Check if the user is currently authenticated.
 */
export function isAuthenticated(): boolean {
  return authState.accessToken !== null;
}

/**
 * Store tokens in memory after successful login.
 */
export function setTokens(data: {
  accessToken: string;
  refreshToken: string;
  role: 'administrator' | 'candidate';
  userId: string;
}): void {
  authState = {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    role: data.role,
    userId: data.userId,
  };
}

/**
 * Update only the access token (after refresh).
 */
export function updateAccessToken(accessToken: string): void {
  authState = { ...authState, accessToken };
}

/**
 * Clear all tokens from memory (logout).
 */
export function clearTokens(): void {
  authState = {
    accessToken: null,
    refreshToken: null,
    role: null,
    userId: null,
  };
}

// ─── API Functions ───────────────────────────────────────────────────────────

/**
 * Attempt to log in with the given credentials.
 * Returns the login response or error response from the server.
 */
export async function login(
  credentials: LoginCredentials
): Promise<LoginResponse | LoginErrorResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  const data = (await response.json()) as LoginResponse | LoginErrorResponse;

  if (data.success) {
    const loginData = data.data;
    setTokens({
      accessToken: loginData.accessToken,
      refreshToken: loginData.refreshToken,
      role: loginData.role,
      userId: loginData.candidateId ?? loginData.adminId ?? '',
    });
  }

  return data;
}

/**
 * Refresh the access token using the stored refresh token.
 * Returns true if refresh was successful, false otherwise.
 */
export async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = authState.refreshToken;
  if (!refreshToken) {
    return false;
  }

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearTokens();
      return false;
    }

    const data = (await response.json()) as RefreshResponse;
    if (data.success) {
      updateAccessToken(data.data.accessToken);
      return true;
    }

    clearTokens();
    return false;
  } catch {
    clearTokens();
    return false;
  }
}

/**
 * Log out the current user. Clears tokens from memory and notifies the server.
 */
export async function logout(): Promise<void> {
  const accessToken = authState.accessToken;
  const refreshToken = authState.refreshToken;

  clearTokens();

  if (accessToken) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      });
    } catch {
      // Best-effort logout notification to server
    }
  }
}
