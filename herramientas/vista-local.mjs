import { readdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { DatabaseSync } from 'node:sqlite';
import worker from '../dist/server/index.js';

const migrations = new URL('../drizzle/', import.meta.url);
const sqlite = new DatabaseSync(':memory:');
for (const file of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) {
  sqlite.exec(await readFile(new URL(file, migrations), 'utf8'));
}
const DB = {
  prepare(query) {
    const statement = sqlite.prepare(query);
    return {
      bind(...values) {
        return {
          first: () => statement.get(...values) ?? null,
          all: () => ({ results: statement.all(...values) }),
          run: () => statement.run(...values)
        };
      }
    };
  },
  async batch(statements) {
    sqlite.exec('BEGIN');
    try {
      const results = statements.map(statement => statement.run());
      sqlite.exec('COMMIT');
      return results;
    } catch (error) {
      sqlite.exec('ROLLBACK');
      throw error;
    }
  }
};
const files = new Map();
const BUCKET = {
  async put(key, value) { files.set(key, value); },
  async get(key) { return files.has(key) ? { body: files.get(key) } : null; },
  async delete(keys) { for (const key of [].concat(keys)) files.delete(key); }
};
const profiles = [
  [4173, '', 'Visitante'],
  [4174, 'author', 'Autor'],
  [4175, 'reader', 'Segundo usuario'],
  [4176, 'admin', 'Administrador']
];
for (const [port, account, label] of profiles) {
  const origin = 'http://127.0.0.1:' + port;
  createServer(async (incoming, outgoing) => {
    try {
      const path = new URL(incoming.url, origin);
      const headers = new Headers(incoming.headers);
      headers.delete('oai-authenticated-user-id');
      headers.delete('oai-authenticated-user-email');
      if (account) {
        headers.set('oai-authenticated-user-id', account);
        headers.set('oai-authenticated-user-email', account + '@example.test');
      }
      const init = { method: incoming.method, headers };
      if (!['GET', 'HEAD'].includes(incoming.method)) {
        init.body = Readable.toWeb(incoming);
        init.duplex = 'half';
      }
      const response = await worker.fetch(new Request(path, init), {
        DB, BUCKET, ATLAS_MODERATOR_EMAIL: 'admin@example.test'
      });
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) Readable.fromWeb(response.body).pipe(outgoing);
      else outgoing.end();
    } catch (error) {
      console.error(error.message);
      outgoing.writeHead(500).end('Error en la vista local');
    }
  }).listen(port, '127.0.0.1', () => console.log(label + '  ' + origin));
}
