// src/server/db.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface LicenseRecord {
  id: string;
  key: string;
  status: 'unused' | 'active' | 'revoked' | 'expired';
  duration_days: number; // 1, 7, 30, -1 (lifetime)
  expires_at: string | null;
  device_id: string | null;
  device_fingerprint: string | null;
  last_ip: string | null;
  last_used_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

// In-memory store (empty by default; used only in development when Supabase is not configured)
class MemoryLicenseDB {
  private licenses: Map<string, LicenseRecord> = new Map();

  public async getByKey(key: string): Promise<LicenseRecord | null> {
    const formatted = key.trim().toUpperCase();
    return this.licenses.get(formatted) || null;
  }

  public async getById(id: string): Promise<LicenseRecord | null> {
    for (const lic of this.licenses.values()) {
      if (lic.id === id) return lic;
    }
    return null;
  }

  public async getAll(): Promise<LicenseRecord[]> {
    return Array.from(this.licenses.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public async create(record: Partial<LicenseRecord>): Promise<LicenseRecord> {
    const now = new Date().toISOString();
    const id = `mem-${Math.random().toString(36).substring(2, 9)}`;
    const full: LicenseRecord = {
      id,
      key: record.key!.trim().toUpperCase(),
      status: record.status || 'unused',
      duration_days: record.duration_days || 30,
      expires_at: record.expires_at || null,
      device_id: record.device_id || null,
      device_fingerprint: record.device_fingerprint || null,
      last_ip: record.last_ip || null,
      last_used_at: record.last_used_at || null,
      note: record.note || null,
      created_at: now,
      updated_at: now,
    };
    this.licenses.set(full.key, full);
    return full;
  }

  public async update(key: string, updates: Partial<LicenseRecord>): Promise<LicenseRecord | null> {
    const existing = await this.getByKey(key);
    if (!existing) return null;
    const updated: LicenseRecord = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.licenses.set(existing.key, updated);
    return updated;
  }

  public async delete(key: string): Promise<boolean> {
    return this.licenses.delete(key.trim().toUpperCase());
  }
}

const memoryDB = new MemoryLicenseDB();

export class LicenseDB {
  public static getSupabaseClient(): SupabaseClient | null {
    return this.getSupabase();
  }

  private static getSupabase(): SupabaseClient | null {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isProduction = process.env.NODE_ENV === 'production';

    const isValidConfig = url && key && url.startsWith('http') && !url.includes('your-project');

    if (isProduction && !isValidConfig) {
      throw new Error('Server not configured: Missing required Supabase environment variables in production (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).');
    }

    if (isValidConfig) {
      try {
        return createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      } catch (e) {
        if (isProduction) {
          throw new Error('Server not configured: Failed to connect to Supabase database.');
        }
        console.error('Failed to initialize Supabase client:', e);
        return null;
      }
    }

    return null;
  }

  public static async getByKey(rawKey: string): Promise<LicenseRecord | null> {
    const key = rawKey.trim().toUpperCase();
    const supabase = this.getSupabase();

    if (supabase) {
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('key', key)
        .single();

      if (error || !data) return null;
      return data as LicenseRecord;
    }

    return memoryDB.getByKey(key);
  }

  public static async getById(id: string): Promise<LicenseRecord | null> {
    const supabase = this.getSupabase();

    if (supabase) {
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) return null;
      return data as LicenseRecord;
    }

    return memoryDB.getById(id);
  }

  public static async getAll(): Promise<LicenseRecord[]> {
    const supabase = this.getSupabase();

    if (supabase) {
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) return [];
      return data as LicenseRecord[];
    }

    return memoryDB.getAll();
  }

  public static async create(record: {
    key: string;
    duration_days: number;
    status?: 'unused' | 'active';
    note?: string;
  }): Promise<LicenseRecord | null> {
    const supabase = this.getSupabase();
    const key = record.key.trim().toUpperCase();

    if (supabase) {
      const { data, error } = await supabase
        .from('licenses')
        .insert({
          key,
          duration_days: record.duration_days,
          status: record.status || 'unused',
          note: record.note || null,
        })
        .select()
        .single();

      if (error || !data) {
        console.error('Supabase insert error:', error);
        return null;
      }
      return data as LicenseRecord;
    }

    return memoryDB.create(record);
  }

  public static async update(key: string, updates: Partial<LicenseRecord>): Promise<LicenseRecord | null> {
    const formattedKey = key.trim().toUpperCase();
    const supabase = this.getSupabase();

    if (supabase) {
      const { data, error } = await supabase
        .from('licenses')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('key', formattedKey)
        .select()
        .single();

      if (error || !data) {
        console.error('Supabase update error:', error);
        return null;
      }
      return data as LicenseRecord;
    }

    return memoryDB.update(formattedKey, updates);
  }

  public static async delete(key: string): Promise<boolean> {
    const formattedKey = key.trim().toUpperCase();
    const supabase = this.getSupabase();

    if (supabase) {
      const { error } = await supabase
        .from('licenses')
        .delete()
        .eq('key', formattedKey);

      return !error;
    }

    return memoryDB.delete(formattedKey);
  }
}
