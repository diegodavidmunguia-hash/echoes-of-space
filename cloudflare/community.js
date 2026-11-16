// Echoes of Space · legal documents, user reports, account registry and the moderation panel.
// Server-rendered pages shared by cloudflare/entry.js.

export const security = {
  'Content-Security-Policy': "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; base-uri 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store'
};
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const langOf = request => /^es\b/i.test(new URL(request.url).searchParams.get('lang') || request.headers.get('accept-language') || '') ? 'es' : 'en';
const UPDATED = { es: '15 de noviembre de 2026', en: 'November 15, 2026' };

const style = `@font-face{font-family:Jost;src:url(/fonts/jost-300.woff2) format('woff2');font-weight:300}
@font-face{font-family:Jost;src:url(/fonts/jost-400.woff2) format('woff2');font-weight:400}
@font-face{font-family:Jost;src:url(/fonts/jost-500.woff2) format('woff2');font-weight:500}
body{margin:0;min-height:100svh;background:radial-gradient(ellipse at 70% 0%,#1c2a33 0,transparent 55%),#0a0b0d;color:#ece9e2;font:300 16px/1.7 Jost,'Segoe UI',system-ui,sans-serif}
main{width:min(var(--w,760px),calc(100% - 40px));margin:0 auto;padding:clamp(40px,8vw,90px) 0 70px}a{color:#9fe3df}
.top{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:clamp(30px,6vw,60px);font:400 .72rem Jost,sans-serif;letter-spacing:.24em;text-transform:uppercase}
.top a{color:#ece9e2;text-decoration:none}.top nav{display:flex;gap:18px;flex-wrap:wrap}.top nav a{color:#a9a69e}
.index{font:400 .72rem Jost,sans-serif;letter-spacing:.26em;text-transform:uppercase;color:#62d3cf;margin:0 0 18px}
h1{font:300 clamp(2.4rem,7vw,4.6rem)/1 Jost,sans-serif;letter-spacing:.04em;text-transform:uppercase;margin:0 0 22px}
h2{font:400 1rem Jost,sans-serif;letter-spacing:.18em;text-transform:uppercase;margin:42px 0 10px;color:#fff}
h3{font:500 1rem Jost,sans-serif;margin:24px 0 6px}
p,li,td,th{color:#bdb9b0;font-size:.95rem}strong{color:#f4f1ea;font-weight:500}ul,ol{padding-left:20px}li{margin:4px 0}
.rule{display:block;width:46px;height:1px;background:#62d3cf;margin:0 0 26px}.meta{font-size:.8rem;color:#8d8a83}
.btn{display:inline-flex;align-items:center;justify-content:center;padding:10px 22px;border-radius:999px;border:1px solid #62d3cf88;background:transparent;color:#e8f8f7;font:400 .85rem Jost,sans-serif;text-decoration:none;cursor:pointer}
.btn.solid{background:#e9e4d8;border-color:#e9e4d8;color:#111}.btn.danger{border-color:#ff8a7a88;color:#ffc4ba}.btn.small{padding:5px 12px;font-size:.75rem}
form.report{display:grid;gap:12px;margin-top:20px}label.choice{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border:1px solid #ffffff1c;border-radius:10px;cursor:pointer}
label.choice:has(input:checked){border-color:#62d3cf;background:#62d3cf12}label.choice span{display:grid}label.choice small{color:#8d8a83;font-size:.8rem}
textarea{font:inherit;min-height:90px;padding:10px 12px;border-radius:8px;border:1px solid #ffffff2a;background:#111316;color:#ece9e2}
.notice{padding:12px 16px;border-radius:8px;border:1px solid #7ad0a055;background:#12301f;color:#c9f1d8}.error{padding:12px 16px;border-radius:8px;border:1px solid #ff8a7a55;background:#3a1612;color:#ffc4ba}
table{width:100%;border-collapse:collapse;margin-top:8px}th{text-align:left;font:400 .66rem Jost,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#8d8a83;padding:8px 10px;border-bottom:1px solid #ffffff22}
td{padding:10px;border-bottom:1px solid #ffffff12;vertical-align:top;font-size:.85rem}td form{display:inline}.tag{display:inline-block;padding:2px 8px;border-radius:999px;font-size:.7rem;border:1px solid #ffffff33}
.tag.bad{border-color:#ff8a7a88;color:#ffc4ba}.tag.ok{border-color:#7ad0a088;color:#c9f1d8}.stats{display:flex;flex-wrap:wrap;gap:10px 34px;margin:10px 0 0}.stats strong{display:block;font:300 2.2rem Jost,sans-serif}
.tabs{display:flex;gap:6px;flex-wrap:wrap;margin:26px 0 0}.tabs a{padding:7px 14px;border-radius:999px;border:1px solid #ffffff22;color:#ece9e2;text-decoration:none;font-size:.8rem}.tabs a[aria-current]{background:#e9e4d8;color:#111}
.scroll{overflow-x:auto}footer{margin-top:60px;padding-top:20px;border-top:1px solid #ffffff1c;font-size:.8rem}footer a{color:#a9a69e;margin-right:16px}`;

export function shell(lang, title, body, { status = 200, width = 760, cache = false } = {}) {
  const es = lang === 'es';
  const nav = es
    ? [['/relatos', 'Relatos'], ['/expediciones', 'Expediciones'], ['/mapa', 'Mapa']]
    : [['/relatos', 'Stories'], ['/expediciones', 'Expeditions'], ['/mapa', 'Map']];
  const legal = legalLinks(lang).map(([href, label]) => `<a href="${href}">${label}</a>`).join('');
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)} · Echoes of Space</title><link rel="icon" href="/mark.svg"><style>${style}</style></head>
<body><main style="--w:${width}px"><div class="top"><a href="/">Echoes of Space</a><nav>${nav.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</nav></div>${body}<footer>${legal}</footer></main></body></html>`;
  return new Response(html, { status, headers: { ...security, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': cache ? 'public, max-age=300' : 'no-store' } });
}

export const legalLinks = lang => lang === 'es'
  ? [['/terminos', 'Términos de uso'], ['/normas', 'Normas de la comunidad'], ['/privacidad', 'Aviso de privacidad'], ['/derechos-de-autor', 'Derechos de autor']]
  : [['/terminos', 'Terms of use'], ['/normas', 'Community guidelines'], ['/privacidad', 'Privacy notice'], ['/derechos-de-autor', 'Copyright']];

const owner = (env, lang) => env.LEGAL_OWNER || (lang === 'es' ? 'el equipo de Echoes of Space' : 'the Echoes of Space team');
const contact = (env, lang) => env.LEGAL_CONTACT
  ? `<a href="mailto:${escapeHtml(env.LEGAL_CONTACT)}">${escapeHtml(env.LEGAL_CONTACT)}</a>`
  : (lang === 'es' ? 'la opción <strong>Reportar</strong> dentro del sitio' : 'the <strong>Report</strong> option on the site');

/* ---------------- Legal documents ---------------- */
const docs = {
  terminos: {
    es: env => ['Términos de uso', `
<p>Estos términos regulan el uso de <strong>Echoes of Space</strong> (echoesofspace.xyz), un proyecto educativo y sin fines de lucro creado para el NASA Space Apps Challenge y operado por ${escapeHtml(owner(env, 'es'))}. Al usar el sitio o crear una cuenta aceptas estos términos, las <a href="/normas">Normas de la comunidad</a> y el <a href="/privacidad">Aviso de privacidad</a>.</p>
<h2>1. Quién puede usarlo</h2><p>Cualquier persona puede leer sin cuenta. Para crear una cuenta y publicar debes tener <strong>13 años o más</strong>. Si eres menor de 18 años, necesitas el permiso de tu madre, padre o tutor.</p>
<h2>2. Tu cuenta</h2><p>Eres responsable de lo que se publique desde tu cuenta y de mantener tu contraseña en secreto. Una cuenta corresponde a una persona. No suplantes a nadie ni uses nombres que confundan con otra persona, con la NASA o con este proyecto.</p>
<h2>3. Lo que publicas</h2><ul><li><strong>Sigues siendo dueño de tu relato.</strong> No adquirimos tus derechos de autor.</li><li>Nos das una licencia gratuita, no exclusiva y mundial para alojar, mostrar y distribuir tu relato y su portada <strong>dentro de Echoes of Space</strong>. La licencia termina cuando borras el relato o tu cuenta.</li><li>Garantizas que el texto y la portada son tuyos o que tienes permiso para publicarlos, y que no violan derechos de terceros.</li><li>Tu seudónimo, relato, portada, sinopsis y etiquetas son públicos. También tus comentarios, con el nombre que elijas para ellos.</li><li><strong>Tus comentarios</strong> también son tuyos; nos das la misma licencia para mostrarlos y puedes borrarlos cuando quieras.</li><li>Las categorías <strong>Fuentes de la NASA</strong>, <strong>Ficción original</strong> y <strong>Personaje</strong> describen tu relato; en la de Fuentes de la NASA debes enlazar al menos una fuente oficial.</li></ul>
<h2>4. Moderación</h2><p>Podemos ocultar o borrar contenido y suspender cuentas que incumplan estos términos o las Normas de la comunidad, con o sin aviso previo. Puedes reportar relatos, comentarios y usuarios desde el sitio.</p>
<h2>5. Contenido de terceros y NASA</h2><p>Los datos de misiones enlazan a fuentes oficiales de la NASA. Las texturas planetarias provienen de Solar System Scope (CC BY 4.0). <strong>Echoes of Space no está afiliado, patrocinado ni respaldado por la NASA</strong>; el nombre de la NASA y de sus misiones se usa solo como referencia informativa. Las tipografías Jost y Newsreader se usan con la licencia SIL Open Font License 1.1. El sonido ambiente lo genera el propio sitio en tu navegador: no usa grabaciones ni música de terceros.</p>
<h2>6. Sin garantías</h2><p>El sitio se ofrece "tal cual", como proyecto educativo. Los relatos de la comunidad pueden ser ficción y no representan la opinión del equipo. No garantizamos que el sitio esté siempre disponible ni libre de errores.</p>
<h2>7. Responsabilidad</h2><p>En la medida que lo permita la ley, el equipo no es responsable por daños derivados del uso del sitio ni del contenido publicado por usuarios.</p>
<h2>8. Cambios</h2><p>Podemos actualizar estos términos. Publicaremos la nueva versión con su fecha; si sigues usando el sitio, aceptas los cambios.</p>
<h2>9. Ley aplicable</h2><p>Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia se someterá a los tribunales competentes de la Ciudad de México.</p>
<h2>10. Contacto</h2><p>Para dudas sobre estos términos usa ${contact(env, 'es')}.</p>`],
    en: env => ['Terms of use', `
<p>These terms govern the use of <strong>Echoes of Space</strong> (echoesofspace.xyz), a non-profit educational project created for the NASA Space Apps Challenge and operated by ${escapeHtml(owner(env, 'en'))}. By using the site or creating an account you accept these terms, the <a href="/normas">Community guidelines</a> and the <a href="/privacidad">Privacy notice</a>.</p>
<h2>1. Who can use it</h2><p>Anyone can read without an account. To create an account and publish you must be <strong>13 or older</strong>. If you are under 18, you need permission from a parent or guardian.</p>
<h2>2. Your account</h2><p>You are responsible for what is published from your account and for keeping your password secret. One account per person. Do not impersonate anyone or use names that could be confused with another person, NASA or this project.</p>
<h2>3. What you publish</h2><ul><li><strong>You keep ownership of your story.</strong> We do not acquire your copyright.</li><li>You give us a free, non-exclusive, worldwide licence to host, display and distribute your story and cover <strong>within Echoes of Space</strong>. The licence ends when you delete the story or your account.</li><li>You confirm the text and cover are yours or that you have permission to publish them, and that they do not infringe anyone's rights.</li><li>Your pen name, story, cover, synopsis and tags are public. So are your comments, with the name you choose for them.</li><li><strong>Your comments</strong> are yours too; you give us the same licence to show them and you can delete them at any time.</li><li>The kinds <strong>NASA sources</strong>, <strong>Original fiction</strong> and <strong>Character</strong> describe your story; NASA sources stories must link at least one official source.</li></ul>
<h2>4. Moderation</h2><p>We may hide or delete content and suspend accounts that break these terms or the Community guidelines, with or without notice. You can report stories, comments and users from the site.</p>
<h2>5. Third-party content and NASA</h2><p>Mission data links to official NASA sources. Planet textures come from Solar System Scope (CC BY 4.0). <strong>Echoes of Space is not affiliated with, sponsored or endorsed by NASA</strong>; NASA and mission names are used for reference only. The Jost and Newsreader typefaces are used under the SIL Open Font License 1.1. The ambient sound is generated by the site itself in your browser: it uses no third-party recordings or music.</p>
<h2>6. No warranties</h2><p>The site is provided "as is" as an educational project. Community stories may be fiction and do not represent the team's views. We do not guarantee the site will always be available or error-free.</p>
<h2>7. Liability</h2><p>To the extent permitted by law, the team is not liable for damages arising from use of the site or from user content.</p>
<h2>8. Changes</h2><p>We may update these terms. We will publish the new version with its date; continuing to use the site means you accept the changes.</p>
<h2>9. Governing law</h2><p>These terms are governed by the laws of Mexico. Any dispute will be submitted to the competent courts of Mexico City.</p>
<h2>10. Contact</h2><p>For questions about these terms use ${contact(env, 'en')}.</p>`]
  },
  normas: {
    es: () => ['Normas de la comunidad', `
<p>Echoes of Space es un archivo de relatos sobre las naves que la humanidad envió al espacio. Queremos que sea un lugar seguro para lectores desde los 13 años.</p>
<h2>Sí, por favor</h2><ul><li>Ficción original y relatos inspirados en misiones reales.</li><li>Datos verificables: si citas ciencia, enlaza la fuente oficial.</li><li>Críticas respetuosas a las ideas, nunca a las personas.</li><li>Comentarios que ayuden a quien escribe. Si vas a revelar el final, avisa antes.</li></ul>
<h2>No se permite</h2><ul><li><strong>Acoso o bullying</strong> contra cualquier persona.</li><li><strong>Discurso de odio</strong> por origen, género, orientación sexual, religión, discapacidad u otra condición.</li><li><strong>Contenido sexual</strong> explícito o sugerente, y cualquier contenido que sexualice a menores.</li><li><strong>Violencia gráfica</strong>, amenazas o apología de la violencia o la autolesión.</li><li><strong>Datos personales</strong> de otras personas (direcciones, teléfonos, fotos privadas) o de ti mismo si eres menor de edad.</li><li><strong>Plagio</strong> o contenido que infrinja derechos de autor.</li><li><strong>Suplantación</strong> de personas, de la NASA o del equipo del sitio.</li><li><strong>Spam</strong>, publicidad, enlaces engañosos o software malicioso.</li><li><strong>Personajes reales:</strong> si tu personaje es una persona real (por ejemplo, alguien de una misión), no le atribuyas hechos falsos que dañen su reputación ni publiques sus datos personales.</li></ul>
<h2>Qué pasa si se incumplen</h2><p>Según la gravedad, el contenido se oculta o se borra y la cuenta puede suspenderse. Los casos que involucren a menores o riesgos para alguien se atienden primero.</p>
<h2>Cómo reportar</h2><p>En cada relato encontrarás <strong>Reportar relato</strong> y <strong>Reportar autor</strong>, y cada comentario tiene <strong>Reportar</strong>. Los reportes son confidenciales: la persona reportada no sabe quién la reportó.</p>`],
    en: () => ['Community guidelines', `
<p>Echoes of Space is an archive of stories about the spacecraft humanity sent into space. We want it to be a safe place for readers aged 13 and up.</p>
<h2>Please do</h2><ul><li>Original fiction and stories inspired by real missions.</li><li>Verifiable facts: if you cite science, link the official source.</li><li>Respectful criticism of ideas, never of people.</li><li>Comments that help the writer. If you are going to reveal the ending, warn first.</li></ul>
<h2>Not allowed</h2><ul><li><strong>Harassment or bullying</strong> of anyone.</li><li><strong>Hate speech</strong> based on origin, gender, sexual orientation, religion, disability or any other condition.</li><li><strong>Sexual content</strong>, explicit or suggestive, and anything that sexualises minors.</li><li><strong>Graphic violence</strong>, threats or glorifying violence or self-harm.</li><li><strong>Personal data</strong> of other people (addresses, phone numbers, private photos), or your own if you are a minor.</li><li><strong>Plagiarism</strong> or copyright infringement.</li><li><strong>Impersonation</strong> of people, NASA or the site team.</li><li><strong>Spam</strong>, advertising, misleading links or malware.</li><li><strong>Real people as characters:</strong> if your character is a real person (for example, someone from a mission), do not attribute false facts that harm their reputation or publish their personal data.</li></ul>
<h2>What happens</h2><p>Depending on severity, content is hidden or deleted and the account may be suspended. Cases involving minors or risk to someone are handled first.</p>
<h2>How to report</h2><p>Each story has <strong>Report story</strong> and <strong>Report author</strong>, and every comment has <strong>Report</strong>. Reports are confidential: the reported person does not learn who reported them.</p>`]
  },
  privacidad: {
    es: env => ['Aviso de privacidad', `
<p>En cumplimiento de la Ley Federal de Protección de Datos Personales en Posesión de los Particulares, este aviso explica cómo tratamos tus datos en Echoes of Space.</p>
<h2>1. Responsable</h2><p>El responsable del tratamiento es ${escapeHtml(owner(env, 'es'))}${env.LEGAL_ADDRESS ? `, con domicilio en ${escapeHtml(env.LEGAL_ADDRESS)}` : ''}. Contacto: ${contact(env, 'es')}.</p>
<h2>2. Datos que recabamos</h2><ul><li><strong>Cuenta con usuario y contraseña:</strong> nombre de usuario y contraseña cifrada (PBKDF2-SHA256 con sal). No pedimos correo, nombre real ni teléfono.</li><li><strong>Cuenta con GitHub:</strong> identificador numérico y nombre de usuario de GitHub. El correo de GitHub solo se usa dentro de la cookie de sesión para reconocer a la cuenta moderadora y no se guarda en la base de datos.</li><li><strong>Contenido que publicas:</strong> archivo del relato, portada, seudónimo, sinopsis, etiquetas y destino. Antes de guardar la portada borramos sus datos de ubicación y del dispositivo (EXIF); en los PDF se borran el autor y otras propiedades del archivo antes de subirlo, cuando el archivo lo permite.</li><li><strong>Interacción:</strong> los ecos que das, los relatos que guardas en tu biblioteca, los autores que sigues y tus comentarios con el nombre que elijas. Son públicos los comentarios y los totales de ecos y seguidores; no mostramos quién dio un eco, qué guardas ni a quién sigues.</li><li><strong>Uso del sitio:</strong> relatos abiertos o leídos (pasaporte), fecha de alta, última visita, aceptación de términos.</li><li><strong>Reportes:</strong> motivo y detalles de los reportes que envías o que recibes.</li><li><strong>Reportes:</strong> qué se reporta, el motivo y la cuenta que reporta, para evitar reportes repetidos. La persona reportada no ve quién la reportó.</li><li><strong>Datos técnicos:</strong> Cloudflare procesa tu dirección IP y datos del navegador para entregar y proteger el sitio. Usamos tu IP solo para limitar intentos de inicio de sesión y de registro, y se borra en 24 horas.</li></ul><p>No recabamos datos sensibles.</p>
<h2>3. Finalidades</h2><p>Primarias (necesarias): crear y proteger tu cuenta, publicar y mostrar relatos, guardar tu pasaporte, moderar contenido y prevenir abusos. No usamos tus datos para publicidad, perfiles comerciales ni las vendemos. No hay finalidades secundarias.</p>
<h2>4. Transferencias y encargados</h2><p>El sitio se aloja en <strong>Cloudflare</strong> (base de datos D1 y almacenamiento KV), que actúa como encargado. GitHub solo interviene si eliges iniciar sesión con GitHub. No transferimos tus datos a terceros para otros fines, salvo requerimiento de autoridad competente.</p>
<h2>5. Derechos ARCO y revocación</h2><p>Puedes acceder, rectificar, cancelar u oponerte al uso de tus datos, y revocar tu consentimiento. Para <strong>cancelar</strong> de inmediato: <strong>Mi cuenta → Ajustes de cuenta → Borrar mi cuenta</strong> (borra tu cuenta, relatos, archivos, portadas, pasaporte, comentarios, ecos, biblioteca y autores seguidos). Para otras solicitudes usa ${contact(env, 'es')}; responderemos en un máximo de 20 días hábiles.</p>
<h2>6. Cookies</h2><p>Usamos una cookie de sesión firmada (<strong>eos_session</strong>, 30 días) y una temporal (<strong>eos_oauth</strong>) durante el inicio de sesión con GitHub. Tu navegador guarda tu idioma, tu pasaporte de invitado, en qué parte de cada relato te quedaste, si quieres el sonido ambiente y el nombre que usas en los comentarios. No usamos cookies de publicidad ni de rastreo de terceros.</p>
<h2>Conservación</h2><p>Guardamos tus datos mientras tu cuenta exista. Al borrarla, se eliminan de inmediato de la base de datos. Las copias de seguridad que guarda el equipo son privadas y solo sirven para recuperar el sitio ante una falla.</p>
<h2>7. Menores de edad</h2><p>Para crear una cuenta se requieren 13 años o más. Si detectamos una cuenta de un menor de 13 años, la borraremos.</p>
<h2>8. Cambios</h2><p>Publicaremos cualquier cambio en esta página con su fecha de actualización.</p>`],
    en: env => ['Privacy notice', `
<p>In compliance with Mexico's Federal Law on the Protection of Personal Data Held by Private Parties, this notice explains how we handle your data on Echoes of Space.</p>
<h2>1. Controller</h2><p>The data controller is ${escapeHtml(owner(env, 'en'))}${env.LEGAL_ADDRESS ? `, located at ${escapeHtml(env.LEGAL_ADDRESS)}` : ''}. Contact: ${contact(env, 'en')}.</p>
<h2>2. Data we collect</h2><ul><li><strong>Username and password account:</strong> username and hashed password (PBKDF2-SHA256 with salt). No email, real name or phone.</li><li><strong>GitHub account:</strong> numeric ID and GitHub username. Your GitHub email is only used inside the session cookie to recognise the moderator account and is not stored in the database.</li><li><strong>Content you publish:</strong> story file, cover, pen name, synopsis, tags and destination. Before storing a cover we remove its location and device data (EXIF); for PDFs the author and other file properties are removed before upload when the file allows it.</li><li><strong>Interaction:</strong> the echoes you give, the stories you save to your library, the authors you follow and your comments with the name you choose. Comments and the totals of echoes and followers are public; we never show who echoed a story, what you saved or whom you follow.</li><li><strong>Site use:</strong> stories opened or read (passport), sign-up date, last visit, acceptance of terms.</li><li><strong>Reports:</strong> reason and details of reports you send or receive.</li><li><strong>Reports:</strong> what is reported, the reason and the reporting account, to prevent repeated reports. The reported person never sees who reported them.</li><li><strong>Technical data:</strong> Cloudflare processes your IP address and browser data to deliver and protect the site. We use your IP only to limit sign-in and sign-up attempts, and it is deleted within 24 hours.</li></ul><p>We do not collect sensitive data.</p>
<h2>3. Purposes</h2><p>Primary (required): creating and protecting your account, publishing and showing stories, saving your passport, moderating content and preventing abuse. We do not use your data for advertising or commercial profiling and we never sell it. There are no secondary purposes.</p>
<h2>4. Processors and transfers</h2><p>The site is hosted on <strong>Cloudflare</strong> (D1 database and KV storage), acting as processor. GitHub is only involved if you choose to sign in with GitHub. We do not transfer your data to third parties for other purposes, except when required by a competent authority.</p>
<h2>5. Your rights</h2><p>You can access, rectify, cancel or object to the use of your data, and withdraw consent. To <strong>delete</strong> immediately: <strong>My account → Account settings → Delete my account</strong> (removes your account, stories, files, covers, passport, comments, echoes, library and followed authors). For other requests use ${contact(env, 'en')}; we answer within 20 business days.</p>
<h2>6. Cookies</h2><p>We use one signed session cookie (<strong>eos_session</strong>, 30 days) and a temporary one (<strong>eos_oauth</strong>) during GitHub sign-in. Your browser stores your language, your guest passport, where you stopped in each story, whether you want the ambient sound and the name you use in comments. No advertising or third-party tracking cookies.</p>
<h2>Retention</h2><p>We keep your data while your account exists. When you delete it, it is removed from the database right away. Backups kept by the team are private and only used to restore the site after a failure.</p>
<h2>7. Minors</h2><p>Accounts require age 13 or older. If we find an account belonging to someone under 13, we will delete it.</p>
<h2>8. Changes</h2><p>Any change will be published on this page with its update date.</p>`]
  },
  'derechos-de-autor': {
    es: env => ['Derechos de autor', `
<p>Respetamos los derechos de autor y pedimos a la comunidad hacer lo mismo. Solo publica textos e imágenes que sean tuyos o que tengas permiso de usar.</p>
<h2>Si crees que un relato infringe tus derechos</h2><ol><li>Abre el relato y usa <strong>Reportar relato → Derechos de autor</strong>, o escribe a ${contact(env, 'es')}.</li><li>Indica qué obra es tuya, dónde se publicó originalmente y por qué el relato la infringe.</li><li>Confirma que eres el titular de los derechos o que actúas en su nombre.</li></ol>
<h2>Qué hacemos</h2><p>Revisamos el reporte, ocultamos el contenido mientras se resuelve y lo borramos si la reclamación procede. Las cuentas que infrinjan derechos de forma repetida se suspenden.</p>
<h2>Contenido del sitio</h2><p>El diseño y los textos del sitio pertenecen al equipo de Echoes of Space. Las texturas planetarias son de Solar System Scope (CC BY 4.0). El visor de PDF usa pdf.js de Mozilla (Apache 2.0). Los datos de misiones enlazan a NASA, que no respalda este proyecto. Las tipografías Jost y Newsreader se usan con la licencia SIL Open Font License 1.1. El sonido ambiente es original del sitio y se genera en tu navegador.</p>`],
    en: env => ['Copyright', `
<p>We respect copyright and ask the community to do the same. Only publish text and images that are yours or that you have permission to use.</p>
<h2>If you believe a story infringes your rights</h2><ol><li>Open the story and use <strong>Report story → Copyright</strong>, or write to ${contact(env, 'en')}.</li><li>Say which work is yours, where it was originally published and why the story infringes it.</li><li>Confirm you own the rights or act on behalf of the owner.</li></ol>
<h2>What we do</h2><p>We review the report, hide the content while it is resolved and delete it if the claim is valid. Accounts that repeatedly infringe are suspended.</p>
<h2>Site content</h2><p>The site design and texts belong to the Echoes of Space team. Planet textures are from Solar System Scope (CC BY 4.0). The PDF viewer uses Mozilla pdf.js (Apache 2.0). Mission data links to NASA, which does not endorse this project. The Jost and Newsreader typefaces are used under the SIL Open Font License 1.1. The ambient sound is original to the site and generated in your browser.</p>`]
  }
};
export const legalSlugs = { '/terminos': 'terminos', '/terms': 'terminos', '/normas': 'normas', '/guidelines': 'normas', '/privacidad': 'privacidad', '/privacy': 'privacidad', '/derechos-de-autor': 'derechos-de-autor', '/copyright': 'derechos-de-autor' };

export function legalPage(request, env, slug) {
  const lang = langOf(request);
  const [title, body] = docs[slug][lang](env);
  const other = lang === 'es' ? 'en' : 'es';
  return shell(lang, title, `<p class="index">Echoes of Space · ${lang === 'es' ? 'Documentos legales' : 'Legal'}</p><h1>${title}</h1><span class="rule"></span>
<p class="meta">${lang === 'es' ? 'Última actualización' : 'Last updated'}: ${UPDATED[lang]} · <a href="?lang=${other}">${other === 'es' ? 'Español' : 'English'}</a></p>${body}
<p style="margin-top:40px"><a class="btn solid" href="/">${lang === 'es' ? 'Volver al atlas' : 'Back to the atlas'}</a></p>`, { cache: true });
}

export function notFoundPage(request) {
  const es = langOf(request) === 'es';
  return shell(es ? 'es' : 'en', es ? 'Fuera del mapa' : 'Off the map', `<p class="index">404</p><h1>${es ? 'Fuera del mapa' : 'Off the map'}</h1><span class="rule"></span>
<p>${es ? 'Esta dirección se perdió en algún punto más allá de la heliopausa. La señal no llega hasta aquí.' : 'This address drifted somewhere past the heliopause. The signal does not reach this far.'}</p>
<p><a class="btn solid" href="/">${es ? 'Volver al atlas' : 'Back to the atlas'}</a></p>`, { status: 404 });
}

/* ---------------- Account registry ---------------- */
export async function touchAccount(env, identity, { acceptedTerms = false } = {}) {
  if (!env.DB || !identity?.id) return null;
  const now = Date.now();
  try {
    await env.DB.prepare(`INSERT INTO accounts (id, provider, name, created_at, last_seen, accepted_terms_at) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name, last_seen = excluded.last_seen,
      accepted_terms_at = COALESCE(accounts.accepted_terms_at, excluded.accepted_terms_at)`)
      .bind(identity.id, identity.provider || 'unknown', identity.name || null, now, now, acceptedTerms ? now : null).run();
    return await env.DB.prepare('SELECT suspended_at FROM accounts WHERE id = ?').bind(identity.id).first();
  } catch { return null; }
}
export async function isSuspended(env, id) {
  if (!env.DB || !id) return false;
  try { return Boolean((await env.DB.prepare('SELECT suspended_at FROM accounts WHERE id = ?').bind(id).first())?.suspended_at); }
  catch { return false; }
}

/* ---------------- Reporting users ---------------- */
export const userReasons = {
  spam: { es: ['Spam o publicidad', 'Publica anuncios, enlaces engañosos o contenido repetido.'], en: ['Spam or advertising', 'Posts ads, misleading links or repeated content.'] },
  harassment: { es: ['Acoso o bullying', 'Ataca, humilla o persigue a otra persona.'], en: ['Harassment or bullying', 'Attacks, humiliates or targets another person.'] },
  hate: { es: ['Discurso de odio', 'Ataca a personas por su origen, género, religión, orientación u otra condición.'], en: ['Hate speech', 'Attacks people for their origin, gender, religion, orientation or other condition.'] },
  sexual: { es: ['Contenido sexual o inapropiado', 'Contenido sexual, sugerente o no apto para menores.'], en: ['Sexual or inappropriate content', 'Sexual, suggestive or not suitable for minors.'] },
  violence: { es: ['Violencia o amenazas', 'Amenaza, incita a la violencia o a la autolesión.'], en: ['Violence or threats', 'Threatens or encourages violence or self-harm.'] },
  impersonation: { es: ['Suplantación de identidad', 'Se hace pasar por otra persona, por la NASA o por el equipo del sitio.'], en: ['Impersonation', 'Pretends to be someone else, NASA or the site team.'] },
  privacy: { es: ['Comparte datos personales', 'Publica direcciones, teléfonos o información privada de alguien.'], en: ['Shares personal data', 'Posts someone’s address, phone or private information.'] },
  copyright: { es: ['Plagio o derechos de autor', 'Publica obras que no son suyas.'], en: ['Plagiarism or copyright', 'Publishes work that is not theirs.'] },
  underage: { es: ['Menor de 13 años', 'Parece tener menos de 13 años.'], en: ['Under 13', 'Appears to be under 13.'] },
  other: { es: ['Otro', 'Explícalo en los detalles.'], en: ['Other', 'Explain in the details.'] }
};

async function storyAuthor(env, storyId) {
  if (!env.DB || !/^[a-z0-9-]{8,64}$/i.test(storyId || '')) return null;
  return env.DB.prepare('SELECT id, title, byline, author FROM stories WHERE id = ? AND hidden = 0 AND deleted_at IS NULL').bind(storyId).first();
}

export async function reportUserPage(request, env, session, url, { error = '', sent = false, status = 200 } = {}) {
  const lang = langOf(request); const es = lang === 'es';
  const story = await storyAuthor(env, url.searchParams.get('relato'));
  if (!story) return notFoundPage(request);
  const back = `/relatos#story=${encodeURIComponent(story.id)}`;
  if (!session?.id) return Response.redirect(`${url.origin}/signin?return_to=${encodeURIComponent(url.pathname + url.search)}`, 302);
  const heading = `<p class="index">${es ? 'Reportar autor' : 'Report author'}</p><h1>${escapeHtml(story.byline || (es ? 'Autor' : 'Author'))}</h1><span class="rule"></span>
<p class="meta">${es ? 'Autor del relato' : 'Author of the story'} “${escapeHtml(story.title)}”</p>`;
  if (sent) return shell(lang, es ? 'Reporte enviado' : 'Report sent', `${heading}<p class="notice">${es ? 'Gracias. Tu reporte es confidencial y el equipo de moderación lo revisará.' : 'Thank you. Your report is confidential and the moderation team will review it.'}</p><p><a class="btn solid" href="${back}">${es ? 'Volver al relato' : 'Back to the story'}</a></p>`);
  if (story.author === session.id) return shell(lang, es ? 'Reportar autor' : 'Report author', `${heading}<p class="error">${es ? 'No puedes reportarte a ti mismo.' : 'You cannot report yourself.'}</p><p><a class="btn" href="${back}">${es ? 'Volver' : 'Back'}</a></p>`);
  const errors = { reason: es ? 'Elige un motivo.' : 'Choose a reason.', details: es ? 'Para “Otro”, explica el motivo en los detalles.' : 'For “Other”, explain in the details.', too_many: es ? 'Enviaste muchos reportes. Inténtalo más tarde.' : 'Too many reports. Try again later.', duplicate: es ? 'Ya reportaste a este autor por este relato.' : 'You already reported this author for this story.' };
  const choices = Object.entries(userReasons).map(([key, text]) => `<label class="choice"><input type="radio" name="reason" value="${key}" required><span><strong>${text[lang][0]}</strong><small>${text[lang][1]}</small></span></label>`).join('');
  return shell(lang, es ? 'Reportar autor' : 'Report author', `${heading}
<p>${es ? '¿Por qué reportas a este usuario? El reporte es confidencial.' : 'Why are you reporting this user? Reports are confidential.'}</p>
${error ? `<p class="error">${errors[error] || errors.reason}</p>` : ''}
<form class="report" method="post" action="/reportar?relato=${encodeURIComponent(story.id)}">${choices}
<label style="display:grid;gap:6px">${es ? 'Detalles (opcional, máx. 500 caracteres)' : 'Details (optional, max 500 characters)'}<textarea name="details" maxlength="500"></textarea></label>
<div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn solid" type="submit">${es ? 'Enviar reporte' : 'Send report'}</button><a class="btn" href="${back}">${es ? 'Cancelar' : 'Cancel'}</a></div></form>`, { status });
}

export async function submitUserReport(request, env, session, url, throttled) {
  const story = await storyAuthor(env, url.searchParams.get('relato'));
  if (!story) return notFoundPage(request);
  if (!session?.id) return Response.redirect(`${url.origin}/signin`, 302);
  if (story.author === session.id) return reportUserPage(request, env, session, url);
  const form = await request.formData().catch(() => null);
  const reason = String(form?.get('reason') || '');
  const details = String(form?.get('details') || '').trim().slice(0, 500);
  if (!Object.hasOwn(userReasons, reason)) return reportUserPage(request, env, session, url, { error: 'reason', status: 400 });
  if (reason === 'other' && !details) return reportUserPage(request, env, session, url, { error: 'details', status: 400 });
  if (await throttled(`user-report:${session.id}`, 10, 24 * 3600 * 1000)) return reportUserPage(request, env, session, url, { error: 'too_many', status: 429 });
  const exists = await env.DB.prepare('SELECT 1 FROM user_reports WHERE target = ? AND story_id = ? AND reporter = ?').bind(story.author, story.id, session.id).first();
  if (exists) return reportUserPage(request, env, session, url, { error: 'duplicate', status: 409 });
  await env.DB.prepare('INSERT INTO user_reports (id, target, story_id, reporter, reason, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), story.author, story.id, session.id, reason, details, Date.now()).run();
  return reportUserPage(request, env, session, url, { sent: true });
}

/* ---------------- Moderation panel ---------------- */
const fmt = (lang, ms) => ms ? new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(ms)) : '—';
const storyReasons = { copyright: ['Derechos de autor', 'Copyright'], abuse: ['Abuso u odio', 'Abuse or hate'], privacy: ['Privacidad', 'Privacy'], spam: ['Spam', 'Spam'], other: ['Otro', 'Other'] };

const commentReasonLabels = { spam: ['Spam', 'Spam'], harassment: ['Acoso', 'Harassment'], hate: ['Odio o discriminación', 'Hate or discrimination'],
  sexual: ['Contenido sexual', 'Sexual content'], spoiler: ['Spoiler sin aviso', 'Unmarked spoiler'], other: ['Otro', 'Other'] };

export async function moderationPage(request, env, url, notice = '') {
  const lang = langOf(request); const es = lang === 'es';
  const tab = ['usuarios', 'reportes-usuarios', 'reportes-relatos', 'comentarios'].includes(url.searchParams.get('vista')) ? url.searchParams.get('vista') : 'reportes-usuarios';
  const one = sql => env.DB.prepare(sql).first();
  const [users, pendingUsers, pendingStories, suspended, pendingComments, comments, echoes] = await Promise.all([
    one('SELECT COUNT(*) AS n FROM accounts'), one('SELECT COUNT(*) AS n FROM user_reports WHERE reviewed_at IS NULL'),
    one('SELECT COUNT(*) AS n FROM story_reports WHERE reviewed_at IS NULL'), one('SELECT COUNT(*) AS n FROM accounts WHERE suspended_at IS NOT NULL'),
    one('SELECT COUNT(DISTINCT comment_id) AS n FROM comment_reports WHERE reviewed_at IS NULL'), one('SELECT COUNT(*) AS n FROM story_comments'),
    one('SELECT COUNT(*) AS n FROM story_echoes')]);
  const tabs = [['usuarios', es ? 'Usuarios' : 'Users'], ['reportes-usuarios', `${es ? 'Usuarios reportados' : 'Reported users'} (${pendingUsers.n})`], ['reportes-relatos', `${es ? 'Relatos reportados' : 'Reported stories'} (${pendingStories.n})`], ['comentarios', `${es ? 'Comentarios reportados' : 'Reported comments'} (${pendingComments.n})`]]
    .map(([key, label]) => `<a href="?vista=${key}"${key === tab ? ' aria-current="page"' : ''}>${label}</a>`).join('');
  const via = { local: es ? 'Usuario y contraseña' : 'Username', github: 'GitHub', google: 'Google', dev: 'Dev' };
  const suspendForm = (id, isSuspended) => `<form method="post" action="/moderacion/usuario"><input type="hidden" name="id" value="${escapeHtml(id)}"><input type="hidden" name="action" value="${isSuspended ? 'restore' : 'suspend'}"><input type="hidden" name="back" value="${tab}"><button class="btn small ${isSuspended ? '' : 'danger'}" type="submit">${isSuspended ? (es ? 'Reactivar' : 'Restore') : (es ? 'Suspender' : 'Suspend')}</button></form>`;
  let section = '';
  if (tab === 'usuarios') {
    const { results } = await env.DB.prepare(`SELECT a.*, (SELECT COUNT(*) FROM stories s WHERE s.author = a.id AND s.deleted_at IS NULL) AS stories,
      (SELECT COUNT(*) FROM user_reports r WHERE r.target = a.id) AS reports, (SELECT COUNT(*) FROM user_reports r WHERE r.target = a.id AND r.reviewed_at IS NULL) AS open_reports
      FROM accounts a ORDER BY a.created_at DESC LIMIT 300`).all();
    section = `<div class="scroll"><table><thead><tr><th>${es ? 'Usuario' : 'User'}</th><th>${es ? 'Acceso' : 'Sign-in'}</th><th>${es ? 'Alta' : 'Joined'}</th><th>${es ? 'Última visita' : 'Last seen'}</th><th>${es ? 'Relatos' : 'Stories'}</th><th>${es ? 'Reportes' : 'Reports'}</th><th>${es ? 'Estado' : 'Status'}</th><th></th></tr></thead><tbody>
${results.map(u => `<tr><td><strong>${escapeHtml(u.name || '—')}</strong></td><td>${via[u.provider] || escapeHtml(u.provider)}</td><td>${fmt(lang, u.created_at)}</td><td>${fmt(lang, u.last_seen)}</td><td>${u.stories}</td><td>${u.reports}${u.open_reports ? ` <span class="tag bad">${u.open_reports} ${es ? 'pendientes' : 'open'}</span>` : ''}</td><td>${u.suspended_at ? `<span class="tag bad">${es ? 'Suspendido' : 'Suspended'}</span>` : `<span class="tag ok">${es ? 'Activo' : 'Active'}</span>`}</td><td>${suspendForm(u.id, u.suspended_at)}</td></tr>`).join('') || `<tr><td colspan="8">${es ? 'Aún no hay usuarios.' : 'No users yet.'}</td></tr>`}
</tbody></table></div>`;
  } else if (tab === 'reportes-usuarios') {
    const { results } = await env.DB.prepare(`SELECT r.*, t.name AS target_name, t.suspended_at, p.name AS reporter_name, s.title AS story_title
      FROM user_reports r LEFT JOIN accounts t ON t.id = r.target LEFT JOIN accounts p ON p.id = r.reporter LEFT JOIN stories s ON s.id = r.story_id
      ORDER BY (r.reviewed_at IS NOT NULL), r.created_at DESC LIMIT 300`).all();
    section = `<div class="scroll"><table><thead><tr><th>${es ? 'Fecha' : 'Date'}</th><th>${es ? 'Usuario reportado' : 'Reported user'}</th><th>${es ? 'Motivo' : 'Reason'}</th><th>${es ? 'Detalles' : 'Details'}</th><th>${es ? 'Relato' : 'Story'}</th><th>${es ? 'Reportó' : 'Reported by'}</th><th></th></tr></thead><tbody>
${results.map(r => `<tr><td>${fmt(lang, r.created_at)}${r.reviewed_at ? `<br><span class="tag ok">${es ? 'Revisado' : 'Reviewed'}</span>` : ''}</td><td><strong>${escapeHtml(r.target_name || '—')}</strong>${r.suspended_at ? ` <span class="tag bad">${es ? 'Suspendido' : 'Suspended'}</span>` : ''}</td><td>${userReasons[r.reason]?.[lang][0] || escapeHtml(r.reason)}</td><td>${escapeHtml(r.details || '—')}</td><td>${r.story_id ? `<a href="/relatos#story=${encodeURIComponent(r.story_id)}">${escapeHtml(r.story_title || r.story_id)}</a>` : '—'}</td><td>${escapeHtml(r.reporter_name || '—')}</td>
<td style="white-space:nowrap">${r.reviewed_at ? '' : `<form method="post" action="/moderacion/reporte"><input type="hidden" name="id" value="${escapeHtml(r.id)}"><button class="btn small" type="submit">${es ? 'Marcar revisado' : 'Mark reviewed'}</button></form> `}${suspendForm(r.target, r.suspended_at)}</td></tr>`).join('') || `<tr><td colspan="7">${es ? 'No hay reportes de usuarios.' : 'No user reports.'}</td></tr>`}
</tbody></table></div>`;
  } else if (tab === 'comentarios') {
    const { results } = await env.DB.prepare(`SELECT c.id, c.story_id, c.author_name, c.body, c.created_at, c.hidden_at, s.title AS story_title,
      a.name AS account_name, a.id AS author_id, a.suspended_at, COUNT(r.id) AS total, SUM(CASE WHEN r.reviewed_at IS NULL THEN 1 ELSE 0 END) AS open_reports,
      GROUP_CONCAT(DISTINCT r.reason) AS reasons, MAX(r.created_at) AS last_report
      FROM comment_reports r JOIN story_comments c ON c.id = r.comment_id LEFT JOIN stories s ON s.id = c.story_id LEFT JOIN accounts a ON a.id = c.author
      GROUP BY c.id ORDER BY open_reports DESC, last_report DESC LIMIT 300`).all();
    const action = (id, value, label, extra = '') => `<form method="post" action="/moderacion/comentario"><input type="hidden" name="id" value="${escapeHtml(id)}"><input type="hidden" name="action" value="${value}"><button class="btn small ${extra}" type="submit">${label}</button></form>`;
    section = `<div class="scroll"><table><thead><tr><th>${es ? 'Comentario' : 'Comment'}</th><th>${es ? 'Escrito por' : 'Written by'}</th><th>${es ? 'Relato' : 'Story'}</th><th>${es ? 'Reportes' : 'Reports'}</th><th>${es ? 'Motivos' : 'Reasons'}</th><th>${es ? 'Estado' : 'Status'}</th><th></th></tr></thead><tbody>
${results.map(c => `<tr><td style="max-width:360px;white-space:pre-wrap">${escapeHtml(c.body)}<br><span class="meta">${fmt(lang, c.created_at)}</span></td><td><strong>${escapeHtml(c.author_name)}</strong><br><span class="meta">${escapeHtml(c.account_name || '—')}</span></td><td><a href="/relatos#story=${encodeURIComponent(c.story_id)}">${escapeHtml(c.story_title || c.story_id)}</a></td><td>${c.total}${c.open_reports ? ` <span class="tag bad">${c.open_reports} ${es ? 'pendientes' : 'open'}</span>` : ''}</td><td>${(c.reasons || '').split(',').map(r => commentReasonLabels[r]?.[es ? 0 : 1] || escapeHtml(r)).join(', ')}</td><td>${c.hidden_at ? `<span class="tag bad">${es ? 'Oculto' : 'Hidden'}</span>` : `<span class="tag ok">Visible</span>`}</td>
<td style="white-space:nowrap">${c.open_reports ? action(c.id, 'reviewed', es ? 'Marcar revisado' : 'Mark reviewed') : ''} ${action(c.id, c.hidden_at ? 'show' : 'hide', c.hidden_at ? (es ? 'Mostrar' : 'Show') : (es ? 'Ocultar' : 'Hide'))} ${action(c.id, 'delete', es ? 'Borrar' : 'Delete', 'danger')} ${c.author_id ? suspendForm(c.author_id, c.suspended_at) : ''}</td></tr>`).join('') || `<tr><td colspan="7">${es ? 'No hay comentarios reportados.' : 'No reported comments.'}</td></tr>`}
</tbody></table></div>`;
  } else {
    const { results } = await env.DB.prepare(`SELECT s.id, s.title, s.byline, s.hidden, s.deleted_at, a.name AS author_name, a.id AS author_id, a.suspended_at,
      COUNT(r.id) AS total, SUM(CASE WHEN r.reviewed_at IS NULL THEN 1 ELSE 0 END) AS open_reports, GROUP_CONCAT(DISTINCT r.reason) AS reasons, MAX(r.created_at) AS last_report
      FROM story_reports r JOIN stories s ON s.id = r.story_id LEFT JOIN accounts a ON a.id = s.author
      GROUP BY s.id ORDER BY open_reports DESC, last_report DESC LIMIT 300`).all();
    section = `<p class="meta">${es ? 'Para ocultar, restaurar o borrar un relato, ábrelo o usa Mi cuenta → Moderación en el sitio.' : 'To hide, restore or delete a story, open it or use My account → Moderation on the site.'}</p>
<div class="scroll"><table><thead><tr><th>${es ? 'Relato' : 'Story'}</th><th>${es ? 'Autor' : 'Author'}</th><th>${es ? 'Reportes' : 'Reports'}</th><th>${es ? 'Motivos' : 'Reasons'}</th><th>${es ? 'Último reporte' : 'Last report'}</th><th>${es ? 'Estado' : 'Status'}</th><th></th></tr></thead><tbody>
${results.map(s => `<tr><td><a href="/relatos#story=${encodeURIComponent(s.id)}"><strong>${escapeHtml(s.title)}</strong></a></td><td>${escapeHtml(s.byline || '')}<br><span class="meta">${escapeHtml(s.author_name || '—')}</span></td><td>${s.total}${s.open_reports ? ` <span class="tag bad">${s.open_reports} ${es ? 'pendientes' : 'open'}</span>` : ''}</td><td>${(s.reasons || '').split(',').map(r => storyReasons[r]?.[es ? 0 : 1] || r).join(', ')}</td><td>${fmt(lang, s.last_report)}</td><td>${s.deleted_at ? `<span class="tag bad">${es ? 'Borrado' : 'Deleted'}</span>` : s.hidden ? `<span class="tag bad">${es ? 'Oculto' : 'Hidden'}</span>` : `<span class="tag ok">${es ? 'Visible' : 'Visible'}</span>`}</td><td>${s.author_id ? suspendForm(s.author_id, s.suspended_at) : ''}</td></tr>`).join('') || `<tr><td colspan="7">${es ? 'No hay relatos reportados.' : 'No reported stories.'}</td></tr>`}
</tbody></table></div>`;
  }
  const notices = { suspended: es ? 'Usuario suspendido: ya no puede iniciar sesión ni publicar.' : 'User suspended: they can no longer sign in or publish.', restored: es ? 'Usuario reactivado.' : 'User restored.', reviewed: es ? 'Reporte marcado como revisado.' : 'Report marked as reviewed.',
    comment: es ? 'Comentario actualizado.' : 'Comment updated.' };
  return shell(lang, es ? 'Moderación' : 'Moderation', `<p class="index">${es ? 'Panel privado' : 'Private panel'}</p><h1>${es ? 'Moderación' : 'Moderation'}</h1><span class="rule"></span>
<div class="stats"><span><strong>${users.n}</strong>${es ? 'usuarios' : 'users'}</span><span><strong>${suspended.n}</strong>${es ? 'suspendidos' : 'suspended'}</span><span><strong>${pendingUsers.n}</strong>${es ? 'reportes de usuarios pendientes' : 'open user reports'}</span><span><strong>${pendingStories.n}</strong>${es ? 'reportes de relatos pendientes' : 'open story reports'}</span><span><strong>${comments.n}</strong>${es ? 'comentarios' : 'comments'}</span><span><strong>${echoes.n}</strong>${es ? 'ecos' : 'echoes'}</span></div>
${notice && notices[notice] ? `<p class="notice" style="margin-top:20px">${notices[notice]}</p>` : ''}<nav class="tabs">${tabs}</nav>${section}`, { width: 1180 });
}

export async function moderationAction(request, env, url) {
  const form = await request.formData().catch(() => null);
  const back = ['usuarios', 'reportes-usuarios', 'reportes-relatos', 'comentarios'].includes(String(form?.get('back'))) ? String(form.get('back')) : 'reportes-usuarios';
  if (url.pathname === '/moderacion/comentario') {
    const id = String(form?.get('id') || '');
    const action = String(form?.get('action') || '');
    const now = Date.now();
    if (/^[a-f0-9-]{36}$/.test(id)) {
      if (action === 'hide') await env.DB.batch([env.DB.prepare('UPDATE story_comments SET hidden_at = ? WHERE id = ?').bind(now, id),
        env.DB.prepare('UPDATE comment_reports SET reviewed_at = ? WHERE comment_id = ? AND reviewed_at IS NULL').bind(now, id)]);
      if (action === 'show') await env.DB.prepare('UPDATE story_comments SET hidden_at = NULL WHERE id = ?').bind(id).run();
      if (action === 'reviewed') await env.DB.prepare('UPDATE comment_reports SET reviewed_at = ? WHERE comment_id = ? AND reviewed_at IS NULL').bind(now, id).run();
      if (action === 'delete') await env.DB.batch([env.DB.prepare('DELETE FROM story_comments WHERE id = ?').bind(id),
        env.DB.prepare('DELETE FROM comment_reports WHERE comment_id = ?').bind(id)]);
    }
    return Response.redirect(`${url.origin}/moderacion?vista=comentarios&aviso=comment`, 303);
  }
  if (url.pathname === '/moderacion/usuario') {
    const id = String(form?.get('id') || '');
    const action = String(form?.get('action') || '');
    if (!id) return Response.redirect(`${url.origin}/moderacion`, 303);
    if (action === 'suspend') await env.DB.prepare('UPDATE accounts SET suspended_at = ? WHERE id = ?').bind(Date.now(), id).run();
    else await env.DB.prepare('UPDATE accounts SET suspended_at = NULL WHERE id = ?').bind(id).run();
    return Response.redirect(`${url.origin}/moderacion?vista=${back}&aviso=${action === 'suspend' ? 'suspended' : 'restored'}`, 303);
  }
  const id = String(form?.get('id') || '');
  if (id) await env.DB.prepare('UPDATE user_reports SET reviewed_at = ? WHERE id = ? AND reviewed_at IS NULL').bind(Date.now(), id).run();
  return Response.redirect(`${url.origin}/moderacion?vista=reportes-usuarios&aviso=reviewed`, 303);
}
