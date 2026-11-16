// Reader interaction: echoes (votes), comments, a personal library and following authors.
// Every write needs a signed-in, non-suspended account and a same-origin request.
// Account IDs never leave the server: authors are addressed by a random public handle.
import { security, isSuspended } from './community.js';

const json = (data, status = 200) => Response.json(data, { status, headers: { ...security, 'Cache-Control': 'private, no-store' } });
const fail = (code, status = 400) => json({ error: code }, status);
const STORY_ID = /^[a-z0-9-]{8,64}$/i;
const HANDLE = /^[a-f0-9]{12}$/;
const COMMENT_MAX = 1000;
const NAME_MAX = 40;
export const commentReasons = ['spam', 'harassment', 'hate', 'sexual', 'spoiler', 'other'];

const clean = (value, max) => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').replace(/\r\n?/g, '\n').trim().slice(0, max);

async function visibleStory(env, id) {
  if (!STORY_ID.test(id || '')) return null;
  return env.DB.prepare('SELECT id, author FROM stories WHERE id = ? AND hidden = 0 AND deleted_at IS NULL').bind(id).first();
}

async function toggle(env, exists, insert, remove) {
  const found = await exists.first();
  await (found ? remove : insert).run();
  return !found;
}

function commentFrom(row, session, moderator) {
  const mine = Boolean(session?.id && session.id === row.author);
  return { id: row.id, name: row.author_name, body: row.body, createdAt: row.created_at, mine, canDelete: mine || moderator };
}

export async function handle(request, env, session, url, moderator) {
  if (!env.DB) return fail('store_unavailable', 503);
  const path = url.pathname.replace(/^\/api\/social\//, '').split('/');
  const write = request.method === 'POST';
  if (write) {
    if (request.headers.get('origin') !== url.origin) return fail('forbidden', 403);
    if (!session?.id) return fail('login_required', 401);
    if (await isSuspended(env, session.id)) return fail('suspended', 403);
  } else if (request.method !== 'GET') return fail('not_allowed', 405);

  try {
    // GET /api/social/me — what this reader has echoed, saved and followed.
    if (path[0] === 'me' && !write) {
      if (!session?.id) return json({ signedIn: false, echoed: [], saved: [], following: [] });
      const [echoed, saved, following, mine] = await env.DB.batch([
        env.DB.prepare('SELECT story_id FROM story_echoes WHERE account_id = ?').bind(session.id),
        env.DB.prepare('SELECT story_id FROM library WHERE account_id = ? ORDER BY created_at DESC').bind(session.id),
        env.DB.prepare('SELECT h.handle FROM follows f JOIN author_handles h ON h.account_id = f.author WHERE f.follower = ?').bind(session.id),
        env.DB.prepare('SELECT handle FROM author_handles WHERE account_id = ?').bind(session.id)
      ]);
      return json({ signedIn: true, echoed: echoed.results.map(row => row.story_id), saved: saved.results.map(row => row.story_id),
        following: following.results.map(row => row.handle), handle: mine.results[0]?.handle || null });
    }

    // POST /api/social/echo/:story — give or take back an echo.
    if (path[0] === 'echo' && write) {
      const story = await visibleStory(env, path[1]);
      if (!story) return fail('not_found', 404);
      if (story.author === session.id) return fail('own_story', 409);
      const echoed = await toggle(env,
        env.DB.prepare('SELECT 1 FROM story_echoes WHERE story_id = ? AND account_id = ?').bind(story.id, session.id),
        env.DB.prepare('INSERT OR IGNORE INTO story_echoes (story_id, account_id, created_at) VALUES (?, ?, ?)').bind(story.id, session.id, Date.now()),
        env.DB.prepare('DELETE FROM story_echoes WHERE story_id = ? AND account_id = ?').bind(story.id, session.id));
      const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM story_echoes WHERE story_id = ?').bind(story.id).first();
      return json({ echoed, echoes: n });
    }

    // POST /api/social/library/:story — save for later or remove from the library.
    if (path[0] === 'library' && write) {
      const story = await visibleStory(env, path[1]);
      if (!story) return fail('not_found', 404);
      const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM library WHERE account_id = ?').bind(session.id).first();
      const saved = await toggle(env,
        env.DB.prepare('SELECT 1 FROM library WHERE account_id = ? AND story_id = ?').bind(session.id, story.id),
        env.DB.prepare('INSERT OR IGNORE INTO library (account_id, story_id, created_at) SELECT ?, ?, ? WHERE ? < 500').bind(session.id, story.id, Date.now(), n),
        env.DB.prepare('DELETE FROM library WHERE account_id = ? AND story_id = ?').bind(session.id, story.id));
      return json({ saved });
    }

    // GET /api/social/author/:handle — public profile numbers. POST — follow or unfollow.
    if (path[0] === 'author') {
      if (!HANDLE.test(path[1] || '')) return fail('not_found', 404);
      const author = await env.DB.prepare('SELECT account_id FROM author_handles WHERE handle = ?').bind(path[1]).first();
      if (!author) return fail('not_found', 404);
      let following = false;
      if (write) {
        if (author.account_id === session.id) return fail('own_profile', 409);
        following = await toggle(env,
          env.DB.prepare('SELECT 1 FROM follows WHERE follower = ? AND author = ?').bind(session.id, author.account_id),
          env.DB.prepare('INSERT OR IGNORE INTO follows (follower, author, created_at) VALUES (?, ?, ?)').bind(session.id, author.account_id, Date.now()),
          env.DB.prepare('DELETE FROM follows WHERE follower = ? AND author = ?').bind(session.id, author.account_id));
      } else if (session?.id) {
        following = Boolean(await env.DB.prepare('SELECT 1 FROM follows WHERE follower = ? AND author = ?').bind(session.id, author.account_id).first());
      }
      const stats = await env.DB.prepare(`SELECT
        (SELECT COUNT(*) FROM stories WHERE author = ?1 AND hidden = 0 AND deleted_at IS NULL) AS stories,
        (SELECT COUNT(*) FROM story_echoes e JOIN stories s ON s.id = e.story_id WHERE s.author = ?1 AND s.hidden = 0 AND s.deleted_at IS NULL) AS echoes,
        (SELECT COUNT(*) FROM follows WHERE author = ?1) AS followers,
        (SELECT byline FROM stories WHERE author = ?1 AND hidden = 0 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1) AS name`).bind(author.account_id).first();
      if (!stats.stories) return fail('not_found', 404);
      return json({ handle: path[1], name: stats.name, stories: stats.stories, echoes: stats.echoes, followers: stats.followers, following,
        mine: author.account_id === session?.id });
    }

    if (path[0] === 'comments') {
      // GET /api/social/comments/:story?before=<time> — newest first, 20 at a time.
      if (!write && path.length === 2) {
        if (!(await visibleStory(env, path[1]))) return fail('not_found', 404);
        const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
        const { results } = await env.DB.prepare(`SELECT id, author, author_name, body, created_at FROM story_comments
          WHERE story_id = ? AND hidden_at IS NULL AND created_at < ? ORDER BY created_at DESC LIMIT 21`).bind(path[1], before).all();
        const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM story_comments WHERE story_id = ? AND hidden_at IS NULL').bind(path[1]).first();
        return json({ comments: results.slice(0, 20).map(row => commentFrom(row, session, moderator)), total: n,
          next: results.length > 20 ? results[19].created_at : null });
      }
      // POST /api/social/comments/:story — publish a comment.
      if (write && path.length === 2) {
        const story = await visibleStory(env, path[1]);
        if (!story) return fail('not_found', 404);
        const data = await request.json().catch(() => null);
        const name = clean(data?.name, NAME_MAX).replace(/\s+/g, ' ');
        const body = clean(data?.body, COMMENT_MAX + 1);
        if (!name || !body) return fail('comment_fields');
        if (body.length > COMMENT_MAX) return fail('comment_long');
        const now = Date.now();
        const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM story_comments WHERE author = ? AND created_at > ?').bind(session.id, now - 10 * 60 * 1000).first();
        if (n >= 6) return fail('comment_rate', 429);
        const row = { id: crypto.randomUUID(), author: session.id, author_name: name, body, created_at: now };
        await env.DB.prepare('INSERT INTO story_comments (id, story_id, author, author_name, body, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(row.id, story.id, row.author, row.author_name, row.body, row.created_at).run();
        return json({ comment: commentFrom(row, session, moderator) }, 201);
      }
      const comment = path[1] && /^[a-f0-9-]{36}$/.test(path[1])
        ? await env.DB.prepare('SELECT id, author FROM story_comments WHERE id = ?').bind(path[1]).first() : null;
      if (!comment) return fail('not_found', 404);
      // POST /api/social/comments/:comment/delete — the writer or a moderator.
      if (write && path[2] === 'delete') {
        if (comment.author !== session.id && !moderator) return fail('forbidden', 403);
        await env.DB.batch([
          env.DB.prepare('DELETE FROM story_comments WHERE id = ?').bind(comment.id),
          env.DB.prepare('DELETE FROM comment_reports WHERE comment_id = ?').bind(comment.id)
        ]);
        return json({ deleted: true });
      }
      // POST /api/social/comments/:comment/report — once per reader, 20 a day.
      if (write && path[2] === 'report') {
        if (comment.author === session.id) return fail('own_comment', 409);
        const data = await request.json().catch(() => null);
        if (!commentReasons.includes(data?.reason)) return fail('report_reason');
        const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM comment_reports WHERE reporter = ? AND created_at > ?').bind(session.id, Date.now() - 864e5).first();
        if (n >= 20) return fail('report_rate', 429);
        await env.DB.prepare('INSERT OR IGNORE INTO comment_reports (id, comment_id, reporter, reason, created_at) VALUES (?, ?, ?, ?, ?)')
          .bind(crypto.randomUUID(), comment.id, session.id, data.reason, Date.now()).run();
        return json({ reported: true });
      }
    }
  } catch (failure) {
    console.error('Social request failed', failure?.message);
    return fail('store_unavailable', 503);
  }
  return fail('not_found', 404);
}

// Remove everything an account wrote or saved when the account is deleted.
export function forgetAccount(env, id) {
  return [
    env.DB.prepare('DELETE FROM story_echoes WHERE account_id = ?').bind(id),
    env.DB.prepare('DELETE FROM library WHERE account_id = ?').bind(id),
    env.DB.prepare('DELETE FROM follows WHERE follower = ? OR author = ?').bind(id, id),
    env.DB.prepare('DELETE FROM comment_reports WHERE reporter = ? OR comment_id IN (SELECT id FROM story_comments WHERE author = ?)').bind(id, id),
    env.DB.prepare('DELETE FROM story_comments WHERE author = ?').bind(id),
    env.DB.prepare('DELETE FROM author_handles WHERE account_id = ?').bind(id)
  ];
}
