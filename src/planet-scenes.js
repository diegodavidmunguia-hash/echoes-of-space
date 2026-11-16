export const planetScenes = {
  mercury: {
    en: ['The innermost planet', 'In a landscape ruled by sunlight, MESSENGER looked for clues inside craters that never see it.'],
    es: ['El planeta más próximo al Sol', 'En un paisaje dominado por el Sol, MESSENGER buscó pistas en cráteres a los que nunca llega la luz.']
  },
  venus: {
    en: ['The hidden surface', 'Beneath the clouds is a world Magellan could map through radar. Follow the spacecraft that turned echoes into terrain.'],
    es: ['La superficie oculta', 'Bajo las nubes hay un mundo que Magallanes cartografió con radar. Sigue a la nave que convirtió ecos en terreno.']
  },
  earth: {
    en: ['The blue planet', 'Begin at home. Follow a rover across the Moon or look outward through a telescope in Earth orbit.'],
    es: ['El planeta azul', 'Empieza en casa. Sigue a un rover por la Luna o mira hacia el espacio a través de un telescopio en órbita terrestre.']
  },
  moon: {
    en: ['The neighbour that keeps footprints', 'Apollo descent stages and the Surveyor 3 lander are still where they touched down: hardware that stayed behind.'],
    es: ['La vecina que guarda huellas', 'Las etapas de descenso del Apolo y la sonda Surveyor 3 siguen donde aterrizaron: equipo que se quedó allá.']
  },
  mars: {
    en: ['The red planet', 'Across a landscape written in rock, Opportunity looked for evidence that water once changed Mars.'],
    es: ['El planeta rojo', 'En un paisaje escrito en piedra, Opportunity buscó pruebas de que el agua alguna vez cambió Marte.']
  },
  jupiter: {
    en: ['The giant', 'Follow Galileo to Jupiter, where a probe descended below the clouds and an orbiter watched from above.'],
    es: ['El gigante', 'Sigue a Galileo hasta Júpiter. Una sonda descendió más allá de las nubes mientras un orbitador observaba desde arriba.']
  },
  saturn: {
    en: ['The ringed planet', 'Cassini spent years among Saturn’s rings and moons. Follow the mission through the gaps in the rings.'],
    es: ['El planeta de los anillos', 'Cassini pasó años entre los anillos y las lunas de Saturno. Sigue la misión por los espacios entre los anillos.']
  },
  uranus: {
    en: ['The tilted world', 'Voyager 2 had a brief encounter with Uranus. Its story continues at Neptune.'],
    es: ['El mundo inclinado', 'Voyager 2 tuvo un breve encuentro con Urano. Su historia continúa en Neptuno.']
  },
  neptune: {
    en: ['The outermost planet', 'The second chapter of Voyager 2’s journey takes you to its final planetary encounter.'],
    es: ['El último planeta', 'El segundo capítulo de Voyager 2 te lleva a su último encuentro con un planeta.']
  },
  deep: {
    en: ['Beyond the planets', 'Follow the departing signal of Pioneer 10, or open a tale imagined beyond the reaches of the planetary tour.'],
    es: ['Más allá de los planetas', 'Sigue la señal de Pioneer 10 en su partida o abre un relato imaginado más allá del recorrido planetario.']
  }
};

export const plotOrbits = {
  mercury: [7, -58], venus: [12, 142], earth: [17, -23], mars: [22, 68],
  jupiter: [28, 217], saturn: [34, 20], uranus: [40, 142], neptune: [46, 311]
};

export const marsRovers = [
  {
    name: 'Opportunity', years: '2004–2018', status: 'silent', where: { es: 'En silencio en Meridiani Planum desde junio de 2018.', en: 'Silent at Meridiani Planum since June 2018.' },
    source: 'https://science.nasa.gov/mission/mer-opportunity/',
    question: { en: 'Was there liquid water?', es: '¿Hubo agua líquida?' },
    context: { en: 'Searched the rocks of Meridiani Planum for evidence of past water.', es: 'Buscó en las rocas de Meridiani Planum pruebas de agua en el pasado.' }
  },
  {
    name: 'Curiosity', years: '2012–', status: 'active', where: { es: 'Activo en el cráter Gale.', en: 'Active in Gale Crater.' },
    source: 'https://science.nasa.gov/mission/msl-curiosity/',
    question: { en: 'Could Mars once support microbes?', es: '¿Pudo Marte albergar microbios?' },
    context: { en: 'Studies whether past environments in Gale Crater could have supported microbial life.', es: 'Estudia si los ambientes del pasado en el cráter Gale pudieron albergar vida microbiana.' }
  },
  {
    name: 'Perseverance', years: '2021–', status: 'active', where: { es: 'Activo en el cráter Jezero.', en: 'Active in Jezero Crater.' },
    source: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
    question: { en: 'Are there traces of ancient life?', es: '¿Quedaron huellas de vida antigua?' },
    context: { en: 'Searches for signs of ancient microbial life and collects rock samples in Jezero Crater.', es: 'Busca indicios de vida microbiana antigua y recoge muestras de roca en el cráter Jezero.' }
  }
];

export const missions = [
  {
    name: 'MESSENGER', status: 'final', where: { es: 'Se estrelló contra Mercurio en abril de 2015.', en: 'Crashed into Mercury in April 2015.' }, destination: 'mercury', type: 'spacecraft', years: '2011–2015',
    source: 'https://science.nasa.gov/mission/messenger/',
    question: { en: 'Can there be ice next to the Sun?', es: '¿Puede haber hielo junto al Sol?' },
    context: { en: 'Orbited Mercury for over four years and confirmed that its polar deposits are mostly water ice.', es: 'Orbitó Mercurio más de cuatro años y confirmó que sus depósitos polares son principalmente hielo de agua.' }
  },
  {
    name: 'Magellan', status: 'final', where: { es: 'Fue enviada a la atmósfera de Venus en 1994.', en: 'Sent into the atmosphere of Venus in 1994.' }, destination: 'venus', type: 'spacecraft', years: '1990–1994',
    source: 'https://science.nasa.gov/mission/magellan/',
    question: { en: 'What do the clouds of Venus hide?', es: '¿Qué esconden las nubes de Venus?' },
    context: { en: 'Used radar to map about 98% of the surface of Venus, the first spacecraft to image the whole planet.', es: 'Cartografió con radar cerca del 98 % de la superficie de Venus; fue la primera nave en fotografiar todo el planeta.' }
  },
  {
    name: 'Hubble', status: 'active', where: { es: 'Sigue en órbita terrestre.', en: 'Still in Earth orbit.' }, destination: 'earth', type: 'telescope', years: '1990–',
    source: 'https://science.nasa.gov/mission/hubble/',
    question: { en: 'What can we see from Earth orbit?', es: '¿Qué se alcanza a ver desde la órbita terrestre?' },
    context: { en: 'A space telescope in low Earth orbit since 1990, looking out at the universe from above the atmosphere.', es: 'Telescopio espacial en órbita baja terrestre desde 1990, que observa el universo por encima de la atmósfera.' }
  },
  {
    name: 'Galileo', status: 'final', where: { es: 'Se sumergió en Júpiter en 2003 para no contaminar Europa.', en: 'Plunged into Jupiter in 2003 to protect Europa.' }, destination: 'jupiter', type: 'spacecraft', years: '1995–2003',
    source: 'https://science.nasa.gov/mission/galileo/',
    question: { en: 'Is there an ocean under Europa’s ice?', es: '¿Hay un océano bajo el hielo de Europa?' },
    context: { en: 'Orbited Jupiter for almost eight years. Its probe made the first direct measurements of Jupiter’s atmosphere, and its data support a liquid ocean beneath Europa’s crust.', es: 'Orbitó Júpiter casi ocho años. Su sonda midió por primera vez directamente la atmósfera de Júpiter y sus datos apoyan un océano líquido bajo la corteza de Europa.' }
  },
  {
    name: 'Cassini', status: 'final', where: { es: 'Se sumergió en Saturno en 2017.', en: 'Plunged into Saturn in 2017.' }, destination: 'saturn', type: 'spacecraft', years: '2004–2017',
    source: 'https://science.nasa.gov/mission/cassini/',
    question: { en: 'Can an icy moon hide an ocean?', es: '¿Puede una luna helada esconder un océano?' },
    context: { en: 'The first spacecraft to orbit Saturn: 13 years among its rings and moons, including the jets of ice and vapor at Enceladus, before its Grand Finale.', es: 'La primera nave en orbitar Saturno: 13 años entre sus anillos y lunas, incluidos los chorros de hielo y vapor de Encélado, hasta su Gran Final.' }
  },
  {
    name: 'Pioneer 10', status: 'silent', where: { es: 'Sigue viajando en silencio; su última señal llegó en 2003.', en: 'Still drifting in silence; last signal in 2003.' }, destination: 'deep', type: 'probe', years: '1972–2003',
    source: 'https://science.nasa.gov/mission/pioneer-10/',
    question: { en: 'Can a spacecraft cross the asteroid belt?', es: '¿Se puede cruzar el cinturón de asteroides?' },
    context: { en: 'The first spacecraft to fly through the main asteroid belt and past Jupiter (1973). Its last signal reached Earth in 2003.', es: 'La primera nave en atravesar el cinturón de asteroides y en sobrevolar Júpiter (1973). Su última señal llegó a la Tierra en 2003.' }
  },
  {
    name: 'Surveyor 3', destination: 'moon', type: 'lander', years: '1967', status: 'silent',
    where: { es: 'Sigue en el Océano de las Tormentas.', en: 'Still in the Ocean of Storms.' },
    source: 'https://science.nasa.gov/mission/surveyor-3/',
    question: { en: 'What happens to hardware left on the Moon?', es: '¿Qué le pasa a una nave que se queda en la Luna?' },
    context: { en: 'Landed in Oceanus Procellarum in April 1967. Two and a half years later, Apollo 12 astronauts walked to it and brought parts back to Earth to study.', es: 'Aterrizó en el Océano de las Tormentas en abril de 1967. Dos años y medio después, los astronautas del Apolo 12 caminaron hasta ella y trajeron piezas a la Tierra para estudiarlas.' }
  },
  {
    name: 'Apollo 11 · Eagle', destination: 'moon', type: 'lander', years: '1969', status: 'silent',
    where: { es: 'Su etapa de descenso sigue en el Mar de la Tranquilidad.', en: 'Its descent stage remains in the Sea of Tranquility.' },
    source: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C',
    question: { en: 'What did the first crewed landing leave behind?', es: '¿Qué dejó atrás el primer alunizaje tripulado?' },
    context: { en: 'Landed on 20 July 1969 in Mare Tranquillitatis. The descent stage, early science instruments and a laser retroreflector stayed on the Moon.', es: 'Aterrizó el 20 de julio de 1969 en el Mar de la Tranquilidad. La etapa de descenso, los primeros instrumentos científicos y un retrorreflector láser se quedaron en la Luna.' }
  },
  {
    name: 'Apollo 12 · Intrepid', destination: 'moon', type: 'lander', years: '1969', status: 'silent',
    where: { es: 'Su etapa de descenso sigue en el Océano de las Tormentas.', en: 'Its descent stage remains in the Ocean of Storms.' },
    source: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C',
    question: { en: 'Can two missions meet on the Moon?', es: '¿Pueden encontrarse dos misiones en la Luna?' },
    context: { en: 'Landed on 19 November 1969 in Oceanus Procellarum, near Surveyor 3. Its descent stage and science station stayed behind; the station was switched off in 1977.', es: 'Aterrizó el 19 de noviembre de 1969 en el Océano de las Tormentas, cerca de Surveyor 3. Su etapa de descenso y su estación científica se quedaron; la estación se apagó en 1977.' }
  },
  {
    name: 'Apollo 15 · Falcon', destination: 'moon', type: 'lander', years: '1971', status: 'silent',
    where: { es: 'Su etapa de descenso sigue cerca de los montes Apeninos.', en: 'Its descent stage remains near the Apennine Mountains.' },
    source: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C',
    question: { en: 'How far could astronauts drive on the Moon?', es: '¿Qué tan lejos podían manejar los astronautas en la Luna?' },
    context: { en: 'Landed on 30 July 1971 in Mare Imbrium and carried the first Lunar Roving Vehicle, used on three traverses within 5 km of the site.', es: 'Aterrizó el 30 de julio de 1971 en el Mar de las Lluvias y llevó el primer vehículo lunar, usado en tres recorridos a menos de 5 km del sitio.' }
  },
  {
    name: 'Mars Pathfinder · Sojourner', destination: 'mars', type: 'lander', years: '1997', status: 'silent',
    where: { es: 'En silencio en Ares Vallis desde septiembre de 1997.', en: 'Silent at Ares Vallis since September 1997.' },
    source: 'https://science.nasa.gov/mission/mars-pathfinder/',
    question: { en: 'Could a small rover drive on Mars?', es: '¿Podía un rover pequeño moverse por Marte?' },
    context: { en: 'Landed on 4 July 1997 in Ares Vallis and released Sojourner, the first rover on Mars. Its last transmission came on 27 September 1997.', es: 'Aterrizó el 4 de julio de 1997 en Ares Vallis y liberó a Sojourner, el primer rover en Marte. Su última transmisión llegó el 27 de septiembre de 1997.' }
  },
  {
    name: 'Spirit', destination: 'mars', type: 'rover', years: '2004–2010', status: 'silent',
    where: { es: 'En silencio en el cráter Gusev.', en: 'Silent in Gusev Crater.' },
    source: 'https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/',
    question: { en: 'What did Opportunity’s twin find?', es: '¿Qué encontró la gemela de Opportunity?' },
    context: { en: 'Landed on 3 January 2004 in Gusev Crater, three weeks before its twin Opportunity. Its mission concluded in 2010.', es: 'Aterrizó el 3 de enero de 2004 en el cráter Gusev, tres semanas antes que su gemela Opportunity. Su misión concluyó en 2010.' }
  },
  {
    name: 'InSight', destination: 'mars', type: 'lander', years: '2018–2022', status: 'silent',
    where: { es: 'En silencio en Elysium Planitia.', en: 'Silent on Elysium Planitia.' },
    source: 'https://science.nasa.gov/mission/insight/',
    question: { en: 'What is Mars like on the inside?', es: '¿Cómo es Marte por dentro?' },
    context: { en: 'Landed on 26 November 2018 on Elysium Planitia to study the planet’s inner layers, from crust to core. The mission ended on 15 December 2022.', es: 'Aterrizó el 26 de noviembre de 2018 en Elysium Planitia para estudiar las capas internas del planeta, de la corteza al núcleo. La misión terminó el 15 de diciembre de 2022.' }
  },
  {
    name: 'Pioneer 11', destination: 'deep', type: 'probe', years: '1973–1995', status: 'silent',
    where: { es: 'Sigue viajando en silencio; último contacto en 1995.', en: 'Still drifting in silence; last contact in 1995.' },
    source: 'https://science.nasa.gov/mission/pioneer-11/',
    question: { en: 'Who reached Saturn first?', es: '¿Quién llegó primero a Saturno?' },
    context: { en: 'Launched in 1973, it became the first spacecraft to fly by Saturn in 1979. Its last contact came on 30 September 1995.', es: 'Lanzada en 1973, fue la primera nave en sobrevolar Saturno, en 1979. Su último contacto fue el 30 de septiembre de 1995.' }
  }
];
