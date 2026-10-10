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

// In-memory fallback database for local development / testing without Supabase credentials
class MemoryLicenseDB {
  private licenses: Map<string, LicenseRecord> = new Map();

  constructor() {
    this.seedDefaultKeys();
  }

  private seedDefaultKeys() {
    const defaultKeys: Partial<LicenseRecord>[] = [
      { key: 'CSAI-DEMO-7DAY-TEST', duration_days: 7, status: 'unused', note: '7-Day Demo Key' },
      { key: 'CSAI-VIP1-30DY-TEST', duration_days: 30, status: 'unused', note: '30-Day VIP Key' },
      { key: 'CSAI-LIFE-PASS-TEST', duration_days: -1, status: 'unused', note: 'Lifetime Master Key' },
      { key: 'AAAA-BBBB-CCCC-DDDD', duration_days: 30, status: 'unused', note: 'Standard Test Key' },
    ];

    defaultKeys.forEach(k => {
      const now = new Date().toISOString();
      const id = `mem-${Math.random().toString(36).substring(2, 9)}`;
      this.licenses.set(k.key!, {
        id,
        key: k.key!,
        status: k.status || 'unused',
        duration_days: k.duration_days || 30,
        expires_at: null,
        device_id: null,
        device_fingerprint: null,
        last_ip: null,
        last_used_at: null,
        note: k.note || null,
        created_at: now,
        updated_at: now,
      });
    });
  }

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
    return Array.from(this.licenses.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
  private static getSupabase(): SupabaseClient | null {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key && url.startsWith('http') && !url.includes('your-project')) {
      try {
        return createClient(url, key, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      } catch (e) {
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
      try {
        const { data, error } = await supabase
          .from('licenses')
          .select('*')
          .eq('key', key)
          .single();

        if (error || !data) return null;
        return data as LicenseRecord;
      } catch (err) {
        console.error('Supabase query error (getByKey):', err);
        return memoryDB.getByKey(key);
      }
    }

    return memoryDB.getByKey(key);
  }

  public static async getById(id: string): Promise<LicenseRecord | null> {
    const supabase = this.getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('licenses')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) return null;
        return data as LicenseRecord;
      } catch (err) {
        console.error('Supabase query error (getById):', err);
        return memoryDB.getById(id);
      }
    }

    return memoryDB.getById(id);
  }

  public static async getAll(): Promise<LicenseRecord[]> {
    const supabase = this.getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('licenses')
          .select('*')
          .order('created_at', { ascending: false });

        if (error || !data) return [];
        return data as LicenseRecord[];
      } catch (err) {
        console.error('Supabase query error (getAll):', err);
        return memoryDB.getAll();
      }
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
      try {
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
      } catch (err) {
        console.error('Supabase create error:', err);
        return memoryDB.create(record);
      }
    }

    return memoryDB.create(record);
  }

  public static async update(key: string, updates: Partial<LicenseRecord>): Promise<LicenseRecord | null> {
    const formattedKey = key.trim().toUpperCase();
    const supabase = this.getSupabase();

    if (supabase) {
      try {
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
      } catch (err) {
        console.error('Supabase update error:', err);
        return memoryDB.update(formattedKey, updates);
      }
    }

    return memoryDB.update(formattedKey, updates);
  }

  public static async delete(key: string): Promise<boolean> {
    const formattedKey = key.trim().toUpperCase();
    const supabase = this.getSupabase();

    if (supabase) {
      try {
        const { error } = await supabase
          .from('licenses')
          .delete()
          .eq('key', formattedKey);

        return !error;
      } catch (err) {
        console.error('Supabase delete error:', err);
        return memoryDB.delete(formattedKey);
      }
    }

    return memoryDB.delete(formattedKey);
  }
}
