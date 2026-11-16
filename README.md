# Echoes of Space

**A bilingual community atlas of stories about the hardware NASA left across the Solar System.**
Project for the **NASA Space Apps Challenge 2026** · Challenge: *Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars*.

Live site: **https://echoesofspace.xyz**

---

## What it does

- **Journey:** a scroll-driven trip from Mercury to deep space (10 destinations), showing the NASA hardware still on or around each world: active, silent or mission ended.
- **Stories:** the community writes and uploads stories (PDF, TXT or Markdown, with an optional cover) in three kinds: *NASA sources*, *Original fiction* and *Character*. Stories are read inside the page, with no download.
- **Interaction:** echoes (votes), comments, a personal library with “continue reading”, author profiles and following authors.
- **Expeditions & solar map:** Voyager 2's Grand Tour, the Mars rovers, and a live solar map with moving orbits and moons.
- **Passport:** a stamp for every destination you read about, plus badges.
- **Search:** by title, author or `#tag` (press `/`).
- **Moderation:** reports on stories, authors and comments, and a private moderation panel.
- **Privacy by design:** cover EXIF data, PDF properties and original file names are removed before publishing.
- **Ambient sound:** generated live in the browser with Web Audio (no recordings, no third-party music).
- Every screen is available in **Spanish and English** and adapts to phones.

The flow and structure diagram is in [`docs/`](docs/) (Spanish and English, PNG and PDF).

## Stack

| Layer | Technology |
|---|---|
| Front end | HTML, CSS and JavaScript modules (no frameworks), pdf.js, Web Audio |
| Server | Cloudflare Workers (`cloudflare/entry.js` wraps `src/atlas-worker.js`) |
| Data | Cloudflare D1 (SQL, migrations in `drizzle/`) and Workers KV (story files and covers) |
| Sign-in | GitHub OAuth or username and password (PBKDF2), signed HttpOnly session cookie |

## Project structure

```
src/            Front end (atlas.html, atlas.css, atlas.js…), fonts, textures, pdf.js, worker logic
cloudflare/     Worker entry, community pages (legal, reports, moderation), social API, deploy and backup scripts
drizzle/        D1 database migrations
herramientas/   Local test scripts (permissions test, local preview)
docs/           Flow diagram and references
logo/           Logo files
build.mjs       Bundles src/ into dist/server/ for the Worker
```

## Run and deploy

Requirements: Node.js 18+ and a Cloudflare account.

```bash
node build.mjs                                   # bundle the site
npx wrangler d1 migrations apply DB --local      # local database
npx wrangler dev --local                         # local server at http://localhost:8787
```

To deploy, fill in your own D1 and KV IDs and the moderator email in `wrangler.toml`, then:

```bash
npx wrangler d1 migrations apply DB --remote
npx wrangler secret put SESSION_SECRET
npx wrangler secret put GITHUB_CLIENT_ID
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler deploy
```

On Windows, `PUBLICAR.bat` does all of this, `ACTIVAR-GITHUB.bat` stores the GitHub keys, and `RESPALDAR.bat` backs up the database and files.

## Credits

- Mission information links to official NASA sources. Echoes of Space is not affiliated with or endorsed by NASA.
- Planet textures: Solar System Scope (CC BY 4.0).
- Typefaces: Jost and Newsreader (SIL Open Font License 1.1).
- PDF viewer: Mozilla pdf.js (Apache 2.0).

---

## En español

**Echoes of Space** es un atlas bilingüe donde la comunidad escribe relatos inspirados en el equipo que la NASA dejó en la Luna, Marte y más allá. Incluye un recorrido por 10 destinos, el archivo de relatos (Fuentes de la NASA, Ficción original y Personaje), ecos, comentarios, biblioteca, perfiles de autor, expediciones, mapa solar en movimiento, pasaporte, buscador, moderación y sonido ambiente generado en el navegador.

Sitio: **https://echoesofspace.xyz** · Diagrama de flujo en [`docs/`](docs/).
