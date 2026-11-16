export const words = {
  en: {
    skip:'Skip to the sky map', atlas:'Sky Atlas', archive:'Story Archive', submit:'Submit a story', challenge:'NASA SPACE APPS CHALLENGE', challengeFooter:'Space Apps challenge ↗',
    hero1:'Look up.', hero2:'Find a story.', intro:'Behind every spacecraft, rover and satellite is a story waiting to be told. Pick a world and follow the hardware that went there.',
    mapHint:'Move to look around · Select a destination', touchHint:'Tap a destination to explore', mapLabel:'Interactive sky map', navLabel:'Main', destNav:'Destinations', selected:'SELECTED DESTINATION', read:'Read the story', prev:'Previous destination', next:'Next destination', storyAt:'More at this destination', prevStory:'Previous story', nextStory:'Next story', draft:'No story yet', startStory:'Write a story here', noStory:'This destination is waiting for its first story.', zone:'DESTINATION',
    nasa:'NASA-sourced', fiction:'Original fiction', satellite:'Satellite', rover:'Rover', telescope:'Telescope', spacecraft:'Spacecraft', all:'All stories', filterLabel:'Story categories', archiveIntro:'Travel through real missions and original fiction.', empty:'There are no stories in this category yet.', history:'Mission science', state:'Hardware status', fictionTitle:'About this tale', fictionNote:'This is a work of imagination.', sourceTitle:'NASA references', community:'Community contribution', other:'Read in its original language', close:'Close',
    writeIntro:'Choose where your story lives and the hardware at its center.', title:'Title', object:'Hardware name', dest:'Destination', equipment:'Hardware type', category:'Story category', storyLanguage:'Story language', story:'Your story', sources:'Mission sources', addSource:'+ Add link', sourceHelp:'Add at least one official nasa.gov link that supports the hardware or science in your story.', sourceInput:'NASA source link', remove:'Remove link', fictionHelp:'Original fiction is shown with its own label. This category accepts stories without NASA source links.', privacy:'Your title, story and source links will appear in the archive. Leave out personal details.', publish:'Publish story', choose:'Choose an option', english:'English', spanish:'Spanish',
    invalid_fields:'Fill in the title, hardware name, destination, hardware type, story category, language and story.', invalid_sources:'NASA-sourced stories need at least one valid https:// link on nasa.gov or an official subdomain.', too_many:'Use up to five source links.', rate_limit:'You have submitted several stories recently. Try again later.', login_required:'Sign in to publish your story.', signIn:'Sign in', store_unavailable:'The shared archive is temporarily unavailable. Your form is still here. Try again later.', error:'Your story could not be published. Try again.', publishing:'Publishing…', published:'Your story is now in the archive.', loadIssue:'Starter stories are available. Community stories could not be loaded right now.'
  },
  es: {
    skip:'Ir al mapa celeste', atlas:'Atlas celeste', archive:'Archivo de relatos', submit:'Enviar un relato', challenge:'NASA SPACE APPS CHALLENGE', challengeFooter:'Reto Space Apps ↗',
    hero1:'Mira al cielo.', hero2:'Encuentra un relato.', intro:'Detrás de cada nave, rover y satélite hay una historia por contar. Elige un mundo y descubre el equipo que llegó hasta allí.',
    mapHint:'Mueve el cursor para mirar alrededor · Elige un destino', touchHint:'Toca un destino para explorarlo', mapLabel:'Mapa celeste interactivo', navLabel:'Principal', destNav:'Destinos', selected:'DESTINO SELECCIONADO', read:'Leer el relato', prev:'Destino anterior', next:'Destino siguiente', storyAt:'Más relatos en este destino', prevStory:'Relato anterior', nextStory:'Relato siguiente', draft:'Todavía no hay relatos', startStory:'Escribe un relato aquí', noStory:'Este destino espera su primer relato.', zone:'DESTINO',
    nasa:'Con fuentes de la NASA', fiction:'Ficción original', satellite:'Satélite', rover:'Rover', telescope:'Telescopio', spacecraft:'Nave', all:'Todos los relatos', filterLabel:'Categorías de relatos', archiveIntro:'Explora misiones reales y relatos de ficción.', empty:'Aún no hay relatos en esta categoría.', history:'La ciencia de la misión', state:'Estado del equipo', fictionTitle:'Sobre este relato', fictionNote:'Este relato es una obra de imaginación.', sourceTitle:'Fuentes de la NASA', community:'Aporte de la comunidad', other:'Leer en su idioma original', close:'Cerrar',
    writeIntro:'Elige el destino de tu relato y el equipo que lo protagoniza.', title:'Título', object:'Nombre del equipo', dest:'Destino', equipment:'Tipo de equipo', category:'Categoría del relato', storyLanguage:'Idioma del relato', story:'Tu relato', sources:'Fuentes de la misión', addSource:'+ Añadir enlace', sourceHelp:'Añade al menos un enlace oficial de nasa.gov que respalde el equipo o la ciencia de tu relato.', sourceInput:'Enlace a una fuente de la NASA', remove:'Quitar enlace', fictionHelp:'La ficción original tiene su propia etiqueta. Esta categoría admite relatos sin enlaces a fuentes de la NASA.', privacy:'Tu título, relato y fuentes aparecerán en el archivo. Evita incluir datos personales.', publish:'Publicar relato', choose:'Elige una opción', english:'Inglés', spanish:'Español',
    invalid_fields:'Completa el título, el nombre del equipo, el destino, el tipo de equipo, la categoría, el idioma y el relato.', invalid_sources:'Los relatos con fuentes necesitan al menos un enlace https:// válido a nasa.gov o a un subdominio oficial.', too_many:'Usa hasta cinco enlaces.', rate_limit:'Has enviado varios relatos recientemente. Inténtalo más tarde.', login_required:'Inicia sesión para publicar tu relato.', signIn:'Iniciar sesión', store_unavailable:'El archivo compartido no está disponible temporalmente. Tu formulario sigue aquí. Inténtalo más tarde.', error:'No se pudo publicar tu relato. Inténtalo otra vez.', publishing:'Publicando…', published:'Tu relato ya aparece en el archivo.', loadIssue:'Puedes leer los relatos iniciales. Los aportes de la comunidad no se pudieron cargar ahora.'
  }
};

export const worlds = [
 ['mercury','Mercury','Mercurio',10,60,35,'#a69389'],
 ['venus','Venus','Venus',23,74,51,'#db9f55'],
 ['earth','Earth','Tierra',34,52,62,'#4f9dc7'],
 ['moon','Moon','Luna',40,40,44,'#b9b6ad'],
 ['mars','Mars','Marte',46,75,51,'#bc6039'],
 ['jupiter','Jupiter','Júpiter',57,53,104,'#cb936e'],
 ['saturn','Saturn','Saturno',74,63,114,'#cfad73'],
 ['uranus','Uranus','Urano',81,35,62,'#79c7cf'],
 ['neptune','Neptune','Neptuno',93,50,62,'#5d7ee4'],
 ['deep','Deep Space','Espacio profundo',93,20,66,'#a184ec']
].map(([id,en,es,x,y,size,color])=>({id,en,es,x,y,size,color}));

export const types = ['satellite','rover','telescope','spacecraft','probe','lander'];
export const categories = ['nasa','fiction','character'];

export const starter = [];
