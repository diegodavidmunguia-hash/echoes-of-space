import { validId } from './submission.js';

export async function explorerProgress(request, env, url, json, error) {
  const owner = request.headers.get('oai-authenticated-user-id');
  if (!owner) return error('login_required', 401);
  if (!env.DB) return error('store_unavailable', 503);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(owner));
  const scope = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT story_id AS id, is_read AS read FROM explorer_progress WHERE owner = ?'
    ).bind(owner).all();
    return json({ scope, progress: results });
  }

  if (request.method !== 'POST') return error('invalid_fields', 405);
  if (request.headers.get('origin') !== url.origin) return error('invalid_fields', 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return error('invalid_fields', 415);
  const reader = request.body?.getReader();
  if (!reader) return error('invalid_fields');
  const decoder = new TextDecoder();
  let body = '';
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 12288) {
      await reader.cancel();
      return error('invalid_fields', 413);
    }
    body += decoder.decode(value, { stream: true });
  }

  let update;
  try { update = JSON.parse(body + decoder.decode()); } catch { return error('invalid_fields'); }
  if (update?.scope !== scope) return error('account_changed', 409);
  const { changes } = update;
  if (!Array.isArray(changes) || !changes.length || changes.length > 40 ||
      changes.some(item => !validId(item?.id) || !['open', 'read', 'unread', 'import-read'].includes(item.status))) {
    return error('invalid_fields');
  }

  const insert = `INSERT INTO explorer_progress (owner, story_id, is_read)
    SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM stories WHERE id = ? AND deleted_at IS NULL)
    ON CONFLICT (owner, story_id)`;
  await env.DB.batch(changes.map(({ id, status }) => {
    const replace = 'DO UPDATE SET is_read = excluded.is_read';
    let conflict = 'DO NOTHING';
    if (status === 'read' || status === 'unread') conflict = replace;
    if (status === 'import-read') conflict = `${replace} WHERE explorer_progress.is_read IS NULL`;
    const isRead = status === 'open' ? null : Number(status !== 'unread');
    return env.DB.prepare(`${insert} ${conflict}`).bind(owner, id, isRead, id);
  }));
  return json({ saved: true });
}
