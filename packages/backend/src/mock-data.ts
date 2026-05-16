/**
 * In-memory mock data stores for demo mode.
 * Used when PostgreSQL and Redis are not available.
 *
 * Pre-seeded users:
 * - Candidate: employeeId "TEST001", password "password123"
 * - Admin: employeeId "ADMIN001", password "admin123"
 */

import bcrypt from 'bcrypt';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MockUser {
  id: string;
  employeeId: string;
  role: 'administrator' | 'candidate';
  passwordHash: string;
  name: string;
}

// ─── In-Memory Stores ────────────────────────────────────────────────────────

/** In-memory key-value store (simulates Redis) */
export class InMemoryRedis {
  private store = new Map<string, { value: string; expiresAt?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ...args: unknown[]): Promise<'OK'> {
    let expiresAt: number | undefined;
    // Handle EX (seconds) and PX (milliseconds) arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'EX' && typeof args[i + 1] === 'number') {
        expiresAt = Date.now() + (args[i + 1] as number) * 1000;
        i++;
      } else if (args[i] === 'PX' && typeof args[i + 1] === 'number') {
        expiresAt = Date.now() + (args[i + 1] as number);
        i++;
      }
    }
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const result: string[] = [];
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        result.push(key);
      }
    }
    return result;
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const newVal = (current ? parseInt(current, 10) : 0) + 1;
    await this.set(key, String(newVal));
    return newVal;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return -2;
    if (!entry.expiresAt) return -1;
    const remaining = Math.ceil((entry.expiresAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }

  async quit(): Promise<'OK'> {
    this.store.clear();
    return 'OK';
  }

  // Event emitter stubs for ioredis compatibility
  on(_event: string, _handler: (...args: unknown[]) => void): this {
    return this;
  }

  disconnect(): void {
    this.store.clear();
  }
}

/** In-memory database (simulates PostgreSQL) */
export class InMemoryDatabase {
  private users: MockUser[] = [];

  constructor() {
    // Will be initialized asynchronously
  }

  async initialize(): Promise<void> {
    const candidateHash = await bcrypt.hash('password123', 10);
    const adminHash = await bcrypt.hash('admin123', 10);

    this.users = [
      {
        id: 'candidate-001',
        employeeId: 'TEST001',
        role: 'candidate',
        passwordHash: candidateHash,
        name: 'Test Candidate',
      },
      {
        id: 'admin-001',
        employeeId: 'ADMIN001',
        role: 'administrator',
        passwordHash: adminHash,
        name: 'Admin User',
      },
    ];
  }

  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number | null }> {
    // Simple query simulation for auth lookups
    const employeeId = params?.[0] as string | undefined;

    if (text.includes('candidates') && text.includes('employee_id')) {
      const user = this.users.find(
        (u) => u.employeeId === employeeId && u.role === 'candidate'
      );
      if (user) {
        return {
          rows: [
            { id: user.id, employee_id: user.employeeId, password_hash: user.passwordHash } as unknown as T,
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    }

    if (text.includes('administrators') && text.includes('employee_id')) {
      const user = this.users.find(
        (u) => u.employeeId === employeeId && u.role === 'administrator'
      );
      if (user) {
        return {
          rows: [
            { id: user.id, employee_id: user.employeeId, password_hash: user.passwordHash } as unknown as T,
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    }

    return { rows: [], rowCount: 0 };
  }

  async close(): Promise<void> {
    // No-op for in-memory
  }
}
