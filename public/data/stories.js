/**
 * stories.js — the short story cards shown when a pin is tapped.
 *
 * Every story:
 *   - sits at one waypoint (era) and one place (lat/lon, checked to be on land
 *     by `npm run check`)
 *   - belongs to one thread, at position `order` in that thread
 *   - has a `bridge` line that leads into the next chapter of its thread
 *   - lists its sources, so the text stays true to the history
 *
 * `chronicle` points to a full-length chronicle in ./chronicles/ (only one is
 * written so far: Mansa Musa).
 */

export const commons = (file, width = 900) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
export const commonsPage = (file) =>
  `https://commons.wikimedia.org/wiki/File:${file.replace(/ /g, "_")}`;

export const STORIES = [
  /* ---------------- The human story ---------------- */
  {
    id: "chicxulub", waypoint: "66mya", thread: "human-story", order: 1,
    place: "Chicxulub, Yucatán", lat: 21.0, lon: -89.5,
    tag: "Extinction", title: "The day the sky fell",
    dek: "An asteroid about 10 km wide slams into the coast of what is now Mexico. Firestorms, tsunamis and years of darkened skies follow.",
    detail: "Around three-quarters of all species vanish, including every dinosaur except the ancestors of birds. The buried crater, about 180 km across, was only confirmed in 1991.",
    bridge: "With the dinosaurs gone, small mammals get their chance, and one line of them leads to us.",
    suggestions: ["How do we know an asteroid did it?", "What survived?"],
    sources: ["Schulte et al., \"The Chicxulub asteroid impact and mass extinction\", Science (2010)", "Hildebrand et al., Geology (1991)"],
  },
  {
    id: "jebel-irhoud", waypoint: "300kya", thread: "human-story", order: 2,
    place: "Jebel Irhoud, Morocco", lat: 31.86, lon: -8.87,
    tag: "Origins", title: "The oldest faces of our kind",
    dek: "In a cave in Morocco, people with faces much like ours hunt gazelle and use fire. Their bones are the oldest Homo sapiens fossils yet found.",
    detail: "Dated in 2017 to about 300,000 years ago, they pushed our species' origin back by 100,000 years and suggest we evolved across Africa, not in one single cradle.",
    bridge: "Humans spread to every continent but Antarctica. Then, in a few places, they start to stay put.",
    suggestions: ["Why is Morocco surprising?", "How were the bones dated?"],
    sources: ["Hublin et al., \"New fossils from Jebel Irhoud, Morocco\", Nature (2017)", "Richter et al., Nature (2017)"],
  },
  {
    id: "gobekli-tepe", waypoint: "9500bce", thread: "human-story", order: 3,
    place: "Göbekli Tepe, Türkiye", lat: 37.22, lon: 38.92,
    tag: "Monuments", title: "Temples before farms?",
    dek: "On a hilltop in south-east Türkiye, people raise huge carved stone pillars, some over 5 m tall, decorated with foxes, snakes and vultures.",
    detail: "It was long thought to be the work of hunter-gatherers, older than farming itself. In these same hills, wild wheat was being tamed into a crop at around the same time.",
    bridge: "Farming lets villages grow into towns, and in Mesopotamia, into the first true cities.",
    suggestions: ["Who built it?", "What is einkorn wheat?"],
    sources: ["Schmidt, \"Göbekli Tepe\" excavation reports, German Archaeological Institute", "Heun et al., \"Site of einkorn wheat domestication\", Science (1997)", "UNESCO World Heritage List, Göbekli Tepe (2018)"],
  },
  {
    id: "uruk", waypoint: "3000bce", thread: "human-story", order: 4,
    place: "Uruk, Iraq", lat: 31.32, lon: 45.64,
    tag: "First cities", title: "The first great city",
    dek: "Uruk may be the largest city on Earth: tens of thousands of people inside its walls, living off irrigated fields of barley.",
    detail: "Its officials press marks into clay to track grain, beer and workers. Those records become cuneiform, one of the world's first writing systems.",
    bridge: "This thread pauses here, but Uruk's invention, writing, starts another one.",
    related: "giza",
    suggestions: ["Why was writing invented?", "Who was Gilgamesh?"],
    sources: ["Algaze, \"Ancient Mesopotamia at the Dawn of Civilization\" (2008)", "British Museum, \"Writing in Mesopotamia\""],
  },

  /* ---------------- Ideas that travel ---------------- */
  {
    id: "giza", waypoint: "3000bce", thread: "ideas", order: 1,
    place: "Giza, Egypt", lat: 29.98, lon: 31.13,
    tag: "Writing", title: "Writing for gods and kings",
    dek: "By around 3200 BCE, Egyptians are writing in hieroglyphs, possibly invented separately from Mesopotamia's cuneiform.",
    detail: "Within a few centuries the state is organised enough to build Khufu's Great Pyramid (c. 2560 BCE), the tallest human-made structure for about 3,800 years.",
    bridge: "Two thousand years later, writing carries a new kind of idea around the Mediterranean: arguments.",
    img: {
      src: commons("Kheops-Pyramid.jpg", 900),
      page: commonsPage("Kheops-Pyramid.jpg"),
      alt: "The Great Pyramid of Khufu at Giza under a blue sky",
      credit: "Nina Aldin Thune, Wikimedia Commons (CC BY-SA)",
    },
    suggestions: ["How long did the pyramid take to build?", "Did Egypt copy writing from Mesopotamia?"],
    sources: ["Wilkinson, \"The Rise and Fall of Ancient Egypt\" (2010)", "Lehner, \"The Complete Pyramids\" (1997)"],
  },
  {
    id: "athens", waypoint: "500bce", thread: "ideas", order: 2,
    place: "Athens, Greece", lat: 37.98, lon: 23.73,
    tag: "Ideas", title: "Rule by the people",
    dek: "Around 508 BCE, Athens gives its male citizens a direct vote on the laws: the first democracy. Women, enslaved people and foreigners are left out.",
    detail: "In the same streets, Socrates (born c. 470 BCE) questions everything out loud. His student Plato writes the questions down.",
    bridge: "Much of this Greek learning is later saved and extended in Arabic, in Baghdad.",
    suggestions: ["Who could not vote?", "Why is Socrates famous?"],
    sources: ["Herodotus, \"Histories\"", "Ober, \"The Rise and Fall of Classical Greece\" (2015)"],
  },
  {
    id: "baghdad", waypoint: "800ce", thread: "ideas", order: 3,
    place: "Baghdad, Iraq", lat: 33.31, lon: 44.36,
    tag: "Knowledge", title: "The House of Wisdom",
    dek: "Baghdad, founded in 762 as a perfectly round city, becomes one of the largest cities in the world. Its caliphs pay scholars to translate Greek, Persian and Indian books into Arabic.",
    detail: "Around 820 the mathematician al-Khwarizmi works here. The word \"algebra\" comes from his book's title, and \"algorithm\" from his name.",
    bridge: "Six centuries later, a machine in Germany makes copying books fast and cheap.",
    suggestions: ["What did they translate?", "What did al-Khwarizmi do?"],
    sources: ["Gutas, \"Greek Thought, Arabic Culture\" (1998)", "Al-Khalili, \"The House of Wisdom\" (2011)"],
  },
  {
    id: "mainz", waypoint: "1500ce", thread: "ideas", order: 4,
    place: "Mainz, Germany", lat: 49.99, lon: 8.27,
    tag: "Printing", title: "Books for everyone",
    dek: "Around 1450 in Mainz, Johannes Gutenberg combines movable metal type, oil-based ink and a press. His Bible appears around 1455.",
    detail: "By 1500, printers in more than 250 European towns have produced millions of books, spreading ideas faster than any ruler can control.",
    bridge: "Five centuries later, a physics lab in Switzerland does the same for the whole planet.",
    suggestions: ["Was Gutenberg the first printer?", "How did printing change religion?"],
    sources: ["Eisenstein, \"The Printing Press as an Agent of Change\" (1979)", "British Library, Incunabula Short Title Catalogue"],
  },
  {
    id: "cern", waypoint: "today", thread: "ideas", order: 5,
    place: "CERN, near Geneva", lat: 46.23, lon: 6.05,
    tag: "Networks", title: "A web of all knowledge",
    dek: "In 1989, Tim Berners-Lee, a scientist at CERN, proposes a way to link documents across computers. It becomes the World Wide Web.",
    detail: "CERN made the web's software free for anyone in 1993. Today more than five billion people are online.",
    bridge: null,
    suggestions: ["Is the web the same as the internet?", "Why did CERN need it?"],
    sources: ["CERN, \"The birth of the Web\"", "ITU, \"Facts and Figures\" (2024)"],
  },

  /* ---------------- The Silk Roads ---------------- */
  {
    id: "persepolis", waypoint: "500bce", thread: "silk", order: 1,
    place: "Persepolis, Iran", lat: 29.93, lon: 52.89,
    tag: "Empire", title: "The king's road",
    dek: "The Persian Empire stretches from Egypt to the Indus. From around 518 BCE, King Darius I builds a palace city at Persepolis.",
    detail: "A Royal Road of about 2,500 km links Sardis to Susa. Relay riders carry messages along it in about a week, a trip that took about 90 days on foot.",
    bridge: "Roads like these become the western end of a far longer network: the Silk Roads.",
    suggestions: ["How did the relay riders work?", "Who built Persepolis?"],
    sources: ["Herodotus, \"Histories\", books 5 and 8", "Briant, \"From Cyrus to Alexander\" (2002)"],
  },
  {
    id: "changan", waypoint: "1ce", thread: "silk", order: 2,
    place: "Chang'an (Xi'an), China", lat: 34.26, lon: 108.94,
    tag: "Trade", title: "The emperor's envoy",
    dek: "In 138 BCE, the Han emperor sends an envoy, Zhang Qian, west to find allies. He is captured and held for about ten years, but comes home with news of rich lands beyond the deserts.",
    detail: "Trade routes soon link the capital, Chang'an, to Central Asia. The name \"Silk Road\" was only invented in 1877, by the German geographer Ferdinand von Richthofen.",
    bridge: "At the far end of the routes, Chinese silk becomes a scandalous luxury in Rome.",
    suggestions: ["Why did the emperor want allies?", "Was it really one road?"],
    sources: ["Sima Qian, \"Records of the Grand Historian\"", "Hansen, \"The Silk Road: A New History\" (2012)", "Frankopan, \"The Silk Roads\" (2015)"],
  },
  {
    id: "rome", waypoint: "1ce", thread: "silk", order: 3,
    place: "Rome, Italy", lat: 41.89, lon: 12.49,
    tag: "Luxury", title: "Silk in the Senate",
    dek: "Rome's rich are wearing silk so fine it is almost see-through. In 16 CE, the Senate bans men from wearing it.",
    detail: "Decades later, the writer Pliny the Elder complains that trade with India, China and Arabia drains 100 million sesterces a year from the empire.",
    bridge: "Centuries on, the busiest crossroads of the routes lies in Central Asia.",
    suggestions: ["Why did the Senate ban silk?", "What did Rome sell back?"],
    sources: ["Tacitus, \"Annals\" 2.33", "Pliny the Elder, \"Natural History\" 12.84"],
  },
  {
    id: "samarkand", waypoint: "800ce", thread: "silk", order: 4,
    place: "Samarkand, Uzbekistan", lat: 39.65, lon: 66.96,
    tag: "Crossroads", title: "Paper city",
    dek: "Samarkand's Sogdian merchants run caravans across Asia, trading silk, horses, spices and slaves.",
    detail: "A famous but debated story says Chinese prisoners taken at the Battle of Talas in 751 taught papermaking here. Samarkand paper soon spreads west to Baghdad.",
    bridge: "In the 1200s, the Mongols bring almost the whole route under one empire.",
    suggestions: ["Who were the Sogdians?", "Why is the paper story debated?"],
    sources: ["de la Vaissière, \"Sogdian Traders\" (2005)", "Bloom, \"Paper Before Print\" (2001)"],
  },
  {
    id: "khanbaliq", waypoint: "1300ce", thread: "silk", order: 5,
    place: "Khanbaliq (Beijing), China", lat: 39.90, lon: 116.40,
    tag: "Empire", title: "The Great Khan's capital",
    dek: "Kublai Khan, grandson of Genghis, rules China from his new capital Khanbaliq, today's Beijing. Mongol rule makes crossing Asia by land safer than ever before.",
    detail: "The Venetian Marco Polo claims to have served here from 1275 to 1292, and amazes Europe with tales of paper money and coal.",
    bridge: "Two centuries later, Europeans stop crossing Asia by land and sail around Africa instead.",
    suggestions: ["Did Marco Polo really go to China?", "Why did Mongol rule help trade?"],
    sources: ["Rossabi, \"Khubilai Khan: His Life and Times\" (1988)", "Marco Polo, \"The Travels\"", "Frankopan, \"The Silk Roads\" (2015)"],
  },
  {
    id: "calicut", waypoint: "1500ce", thread: "silk", order: 6,
    place: "Calicut (Kozhikode), India", lat: 11.25, lon: 75.78,
    tag: "Sea routes", title: "The sea road to India",
    dek: "In May 1498, Vasco da Gama's ships anchor off Calicut: the first direct voyage by sea from Europe to India.",
    detail: "Pepper, cloves and cinnamon could now reach Lisbon without the old overland routes, and the centre of world trade begins to shift to the oceans.",
    bridge: null,
    suggestions: ["Why was pepper so valuable?", "How did Calicut react?"],
    sources: ["Subrahmanyam, \"The Career and Legend of Vasco da Gama\" (1997)"],
  },

  /* ---------------- Gold and salt ---------------- */
  {
    id: "koumbi-saleh", waypoint: "800ce", thread: "gold", order: 1,
    place: "Koumbi Saleh, Mauritania", lat: 15.77, lon: -7.97,
    tag: "Trade", title: "The land of gold",
    dek: "Arab writers of this time call Ghana \"the land of gold\". Its kings control the trade between the gold fields to the south and the Saharan salt to the north.",
    detail: "Its probable capital, Koumbi Saleh, is described in 1068 as two towns side by side: one for Muslim merchants and one for the king.",
    bridge: "Ghana fades, and a new West African empire takes over the gold: Mali.",
    suggestions: ["Why was salt so valuable?", "Is this the same as modern Ghana?"],
    sources: ["al-Bakri (1068), in Levtzion and Hopkins, \"Corpus of Early Arabic Sources for West African History\" (1981)", "Levtzion, \"Ancient Ghana and Mali\" (1973)"],
  },
  {
    id: "mansa-musa", waypoint: "1300ce", thread: "gold", order: 2,
    place: "Timbuktu, Mali", lat: 16.77, lon: -3.01,
    tag: "Wealth", title: "The king who crashed the price of gold",
    dek: "In 1324, Mansa Musa of Mali crosses the Sahara on pilgrimage to Mecca with thousands of followers and camels laden with gold.",
    detail: "He spends and gives away so much gold in Cairo that, twelve years later, its value there still has not recovered.",
    bridge: "Europeans hear about Mali's gold, and within 150 years their ships reach the West African coast looking for it.",
    chronicle: "mansa-musa",
    img: {
      src: commons("Catalan Atlas BNF Sheet 6 Mansa Musa (cropped).jpg", 900),
      page: commonsPage("Catalan Atlas BNF Sheet 6 Mansa Musa (cropped).jpg"),
      alt: "Mansa Musa seated on a throne holding a gold nugget, from the Catalan Atlas of 1375",
      credit: "Catalan Atlas (1375), Bibliothèque nationale de France. Public domain.",
    },
    suggestions: ["Why did his gold crash prices?", "How big was his caravan?"],
    sources: ["al-Umari, \"Masalik al-absar\" (c. 1340)", "Levtzion and Hopkins (1981)", "Gomez, \"African Dominion\" (2018)"],
  },
  {
    id: "elmina", waypoint: "1500ce", thread: "gold", order: 3,
    place: "Elmina, Ghana", lat: 5.10, lon: -1.35,
    tag: "Forts", title: "The castle on the Gold Coast",
    dek: "In 1482 the Portuguese build São Jorge da Mina, the first European fort in sub-Saharan Africa, to buy gold directly on the coast.",
    detail: "Gold that once crossed the Sahara by camel now leaves by ship. In later centuries the castle becomes a centre of the Atlantic slave trade.",
    bridge: "Four centuries later, the world's richest gold field is found at the other end of Africa.",
    suggestions: ["Why build a fort here?", "What happened to the Saharan trade?"],
    sources: ["UNESCO World Heritage List, \"Forts and Castles, Ghana\"", "DeCorse, \"An Archaeology of Elmina\" (2001)"],
  },
  {
    id: "johannesburg", waypoint: "1900ce", thread: "gold", order: 4,
    place: "Johannesburg, South Africa", lat: -26.20, lon: 28.05,
    tag: "Gold rush", title: "A city built on gold",
    dek: "In 1886, gold is found on the Witwatersrand ridge. Within about ten years, a mining camp becomes Johannesburg, one of the biggest cities in Africa.",
    detail: "The Witwatersrand goes on to produce a huge share of all the gold ever mined, much of it dug by poorly paid Black migrant workers.",
    bridge: null,
    suggestions: ["Who worked in the mines?", "Why did the city grow so fast?"],
    sources: ["Van Onselen, \"New Babylon, New Nineveh\" (1982)"],
  },

  /* ---------------- Engines of change ---------------- */
  {
    id: "manchester", waypoint: "1800ce", thread: "engines", order: 1,
    place: "Manchester, England", lat: 53.48, lon: -2.24,
    tag: "Industry", title: "Cottonopolis",
    dek: "Manchester fills with water- and steam-powered cotton mills that spin thread faster than any hand. It becomes the world's first industrial city.",
    detail: "Much of the raw cotton is grown by enslaved people in the Americas, and the cheap cloth undercuts India's hand-weavers.",
    bridge: "A century later, factories learn to move the work instead of the worker, in Detroit.",
    suggestions: ["Why did it start in Britain?", "What was life like for mill workers?"],
    sources: ["Beckert, \"Empire of Cotton\" (2014)", "Allen, \"The British Industrial Revolution in Global Perspective\" (2009)"],
  },
  {
    id: "detroit", waypoint: "1900ce", thread: "engines", order: 2,
    place: "Detroit, USA", lat: 42.41, lon: -83.10,
    tag: "Mass production", title: "The moving line",
    dek: "In 1913, Henry Ford's Highland Park plant starts a moving assembly line. Building a Model T drops from about 12 hours to about 90 minutes.",
    detail: "Cars become cheap enough for the workers themselves to buy, and mass production spreads to almost everything.",
    bridge: "By the 2000s, the world's workshop has moved again, to southern China.",
    suggestions: ["How did the moving line work?", "Did workers like it?"],
    sources: ["Hounshell, \"From the American System to Mass Production\" (1984)"],
  },
  {
    id: "shenzhen", waypoint: "today", thread: "engines", order: 3,
    place: "Shenzhen, China", lat: 22.54, lon: 114.06,
    tag: "Workshop of the world", title: "From fishing villages to megacity",
    dek: "In 1980, China makes Shenzhen, then an area of farms and fishing villages, one of its first Special Economic Zones.",
    detail: "Today it is home to more than 17 million people, and a huge share of the world's electronics is designed or built here.",
    bridge: null,
    suggestions: ["What is a Special Economic Zone?", "Why did it grow so fast?"],
    sources: ["O'Donnell, Wong and Bach (eds.), \"Learning from Shenzhen\" (2017)", "China, 7th National Population Census (2020)"],
  },
];
