const SUPABASE_URL = 'https://smykzircekzievsewjhf.supabase.co';
const KEY = 'sb_publishable_t_w90kg_J9fawC9RHtIpsQ_DjXwDhKm';
const H: Record<string, string> = {
  'Content-Type': 'application/json',
  'apikey': KEY,
  'Authorization': `Bearer ${KEY}`,
};

// ─── TYPES ────────────────────────────────────────────────────────────────────

export type User = {
  id: string; username: string; lang: string;
  reputation: number; trades_count: number;
  created_at: string; avatar_url?: string;
};

export type Resource = {
  id: string; user_id: string; username: string;
  have: string; need: string; urgency: string;
  active: boolean; cancelled?: boolean; cancel_reason?: string;
  created_at: string; lat?: number; lng?: number; address?: string;
  buyer_id?: string; buyer_username?: string;
  description?: string; photo_url?: string; amount?: number;
};

export type TradeHistory = {
  id: string; user_id: string; partner_username: string;
  gave: string; received: string; created_at: string;
};

export type Message = {
  id: string; resource_id: string;
  sender_id: string; sender_username: string;
  text: string; created_at: string;
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function hashPassword(pw: string): string {
  let h = 0;
  const s = pw + 'mercatus_salt_2026';
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h = h & h; }
  return Math.abs(h).toString(16).padStart(8, '0') + s.length.toString(16) +
    pw.split('').reverse().join('').slice(0, 4).split('').map(c => c.charCodeAt(0).toString(16)).join('');
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export async function registerUser(username: string, password: string, lang = 'en'): Promise<{ ok: boolean; error?: string; user?: User }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST', headers: { ...H, 'Prefer': 'return=representation' },
      body: JSON.stringify({ username, password_hash: hashPassword(password), lang }),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: text.includes('23505') ? 'Username already taken' : 'Registration failed' };
    return { ok: true, user: JSON.parse(text)[0] };
  } catch { return { ok: false, error: 'Network error' }; }
}

export async function loginUser(username: string, password: string): Promise<{ ok: boolean; error?: string; user?: User }> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/users?username=eq.${encodeURIComponent(username)}&password_hash=eq.${hashPassword(password)}&select=id,username,lang,reputation,trades_count,created_at,avatar_url`,
      { headers: H }
    );
    const data = await res.json();
    if (!data?.length) return { ok: false, error: 'Wrong username or password' };
    return { ok: true, user: data[0] };
  } catch { return { ok: false, error: 'Network error' }; }
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function getUserById(userId: string): Promise<User | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=id,username,lang,reputation,trades_count,created_at,avatar_url`, { headers: H });
    const d = await res.json(); return d?.[0] ?? null;
  } catch { return null; }
}

export async function updateUser(userId: string, updates: { username?: string; avatar_url?: string }): Promise<{ ok: boolean; error?: string; user?: User }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`, {
      method: 'PATCH', headers: { ...H, 'Prefer': 'return=representation' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) { const t = JSON.stringify(data); return { ok: false, error: t.includes('23505') ? 'Username already taken' : (data?.message ?? 'Update failed') }; }
    return { ok: true, user: data[0] };
  } catch { return { ok: false, error: 'Network error' }; }
}

// ─── RESOURCES ────────────────────────────────────────────────────────────────

export async function addResource(
  userId: string, username: string, have: string, need: string, urgency: string,
  lat?: number, lng?: number, address?: string, description?: string, photoUrl?: string
): Promise<Resource | null> {
  try {
    const body: Record<string, unknown> = { user_id: userId, username, have, need, urgency, lat, lng, address };
    if (description) body.description = description;
    if (photoUrl) body.photo_url = photoUrl;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/resources`, {
      method: 'POST', headers: { ...H, 'Prefer': 'return=representation' }, body: JSON.stringify(body),
    });
    const d = await res.json(); return res.ok ? d[0] : null;
  } catch { return null; }
}

export async function getAllResources(): Promise<Resource[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/resources?active=eq.true&order=created_at.desc&select=*`, { headers: H });
    return await res.json();
  } catch { return []; }
}

export async function getUserResources(userId: string): Promise<Resource[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/resources?user_id=eq.${userId}&active=eq.true&order=created_at.desc&select=*`, { headers: H });
    return await res.json();
  } catch { return []; }
}

export async function deleteResource(resourceId: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/resources?id=eq.${resourceId}`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ active: false, cancelled: true, cancel_reason: 'deleted_by_owner' }),
    });
    return res.ok;
  } catch { return false; }
}

export async function completeTrade(resource: Resource, buyerId: string, buyerUsername: string): Promise<boolean> {
  try {
    const check = await fetch(`${SUPABASE_URL}/rest/v1/resources?id=eq.${resource.id}&active=eq.false&select=id`, { headers: H });
    const ex = await check.json();
    if (ex?.length) return true;
    await fetch(`${SUPABASE_URL}/rest/v1/resources?id=eq.${resource.id}`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ active: false, buyer_id: buyerId, buyer_username: buyerUsername }),
    });
    await fetch(`${SUPABASE_URL}/rest/v1/trade_history`, {
      method: 'POST', headers: { ...H, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ user_id: buyerId, partner_username: resource.username, gave: resource.need, received: resource.have }),
    });
    await fetch(`${SUPABASE_URL}/rest/v1/trade_history`, {
      method: 'POST', headers: { ...H, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ user_id: resource.user_id, partner_username: buyerUsername, gave: resource.have, received: resource.need }),
    });
    return true;
  } catch { return false; }
}

export async function cancelTrade(resource: Resource, reason: string, otherUserId: string): Promise<boolean> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/resources?id=eq.${resource.id}`, {
      method: 'PATCH', headers: H,
      body: JSON.stringify({ active: false, cancelled: true, cancel_reason: reason }),
    });
    if (otherUserId) {
      const ur = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${otherUserId}&select=reputation`, { headers: H });
      const ud = await ur.json();
      const rep = ud?.[0]?.reputation ?? 50;
      await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${otherUserId}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ reputation: Math.max(0, rep - 15) }),
      });
    }
    return true;
  } catch { return false; }
}

export async function getTradeHistory(userId: string): Promise<TradeHistory[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/trade_history?user_id=eq.${userId}&order=created_at.desc&select=*`, { headers: H });
    return await res.json();
  } catch { return []; }
}

// ─── MESSAGES ─────────────────────────────────────────────────────────────────

export async function sendMessage(resourceId: string, senderId: string, senderUsername: string, text: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages`, {
      method: 'POST', headers: { ...H, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ resource_id: resourceId, sender_id: senderId, sender_username: senderUsername, text }),
    });
    if (!res.ok) { const e = await res.text(); return { ok: false, error: e }; }
    return { ok: true };
  } catch (e: unknown) { return { ok: false, error: e instanceof Error ? e.message : 'Network error' }; }
}

export async function getMessages(resourceId: string): Promise<Message[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?resource_id=eq.${resourceId}&order=created_at.asc&select=*`, { headers: H });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

export function subscribeToMessages(resourceId: string, callback: (msgs: Message[]) => void) {
  const iv = setInterval(async () => { callback(await getMessages(resourceId)); }, 1500);
  return { unsubscribe: () => clearInterval(iv) };
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────

export async function reportUser(reporterId: string, reportedUserId: string, reportedUsername: string, resourceId: string | undefined, reason: string): Promise<boolean> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/reports`, {
      method: 'POST', headers: { ...H, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ reporter_id: reporterId, reported_user_id: reportedUserId, reported_username: reportedUsername, resource_id: resourceId, reason }),
    });
    const ur = await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${reportedUserId}&select=reputation`, { headers: H });
    const ud = await ur.json();
    const rep = ud?.[0]?.reputation ?? 50;
    await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${reportedUserId}`, {
      method: 'PATCH', headers: H, body: JSON.stringify({ reputation: Math.max(0, rep - 20) }),
    });
    return true;
  } catch { return false; }
}

// ─── CHATS ────────────────────────────────────────────────────────────────────

export async function getUserChats(userId: string): Promise<(Resource & { last_message: Message })[]> {
  try {
    const [sr, br, mr] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/resources?user_id=eq.${userId}&select=*`, { headers: H }),
      fetch(`${SUPABASE_URL}/rest/v1/resources?buyer_id=eq.${userId}&select=*`, { headers: H }),
      fetch(`${SUPABASE_URL}/rest/v1/messages?sender_id=eq.${userId}&select=resource_id`, { headers: H }),
    ]);
    const sellerData: Resource[] = sr.ok ? await sr.json() : [];
    const buyerData: Resource[]  = br.ok ? await br.json() : [];
    const msgData: { resource_id: string }[] = mr.ok ? await mr.json() : [];

    const msgIds = [...new Set(msgData.map(m => m.resource_id))];
    const msgResources: Resource[] = [];
    for (const rid of msgIds) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/resources?id=eq.${rid}&select=*`, { headers: H });
      if (r.ok) { const d = await r.json(); if (d[0]) msgResources.push(d[0]); }
    }

    const all = [...sellerData, ...buyerData, ...msgResources]
      .filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i);

    if (!all.length) return [];

    const withMsgs = await Promise.all(all.map(async r => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/messages?resource_id=eq.${r.id}&order=created_at.desc&limit=1&select=*`, { headers: H });
      const msgs: Message[] = res.ok ? await res.json() : [];
      if (!msgs.length) return null;
      return { ...r, last_message: msgs[0] };
    }));

    return (withMsgs.filter(Boolean) as (Resource & { last_message: Message })[])
      .sort((a, b) => new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime());
  } catch { return []; }
}

// ─── POLLING ──────────────────────────────────────────────────────────────────

export function subscribeToResources(callback: (r: Resource[]) => void) {
  const iv = setInterval(async () => { callback(await getAllResources()); }, 5000);
  return { unsubscribe: () => clearInterval(iv) };
}

export function subscribeToResource(resourceId: string, callback: (r: Resource | null) => void) {
  const iv = setInterval(async () => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/resources?id=eq.${resourceId}&select=*`, { headers: H });
      const d = await res.json(); callback(d[0] ?? null);
    } catch { callback(null); }
  }, 3000);
  return { unsubscribe: () => clearInterval(iv) };
}

// ─── UTILS ────────────────────────────────────────────────────────────────────

export function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return d < 1 ? `${Math.round(d * 1000)} м` : `${d.toFixed(1)} км`;
}

export async function uploadPhoto(imageUri: string, fileName: string): Promise<string | null> {
  try {
    const blob = await (await fetch(imageUri)).blob();
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/resources/${fileName}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
      body: blob,
    });
    if (!res.ok) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/resources/${fileName}`;
  } catch { return null; }
}