/**
 * chronicles/mansa-musa.js — the full chronicle behind the Mansa Musa card.
 *
 * Written in our own words from the sources listed at the bottom. Where the
 * sources are uncertain or disagree (caravan size, the Atlantic voyage), the
 * text says so instead of presenting legend as fact.
 *
 * `focus` on each chapter names the route points highlighted on the mini-map
 * while that chapter is being read.
 */

import { commons, commonsPage } from "../stories.js";

export const MANSA_MUSA = {
  id: "mansa-musa",
  storyId: "mansa-musa",
  kicker: "A chronicle of Mali · 1312–1337",
  title: "The King Who Crashed the Price of Gold",
  standfirst:
    "In 1324 a West African king crossed the Sahara with a caravan of gold. By the time he returned home, Cairo's markets had been shaken, Timbuktu was on its way to becoming a city of scholars, and Europe had started drawing him on its maps.",
  readMinutes: 6,

  hero: {
    src: commons("Catalan Atlas BNF Sheet 6 Mansa Musa (cropped).jpg", 1400),
    page: commonsPage("Catalan Atlas BNF Sheet 6 Mansa Musa (cropped).jpg"),
    alt: "Mansa Musa seated on a throne, holding a gold nugget, on the Catalan Atlas",
    caption: "Mansa Musa on the Catalan Atlas (1375), holding a gold nugget.",
    credit: "Bibliothèque nationale de France. Public domain.",
  },

  // Approximate route. Historians reconstruct it from later accounts; the
  // exact location of Mali's capital, Niani, is still debated.
  route: {
    points: {
      niani:    { name: "Niani",    lat: 11.39, lon: -8.39, note: "Mali's capital (location debated)" },
      walata:   { name: "Walata",   lat: 17.29, lon: -7.04 },
      tuat:     { name: "Tuat",     lat: 27.87, lon: -0.29 },
      cairo:    { name: "Cairo",    lat: 30.04, lon: 31.24 },
      mecca:    { name: "Mecca",    lat: 21.42, lon: 39.83 },
      gao:      { name: "Gao",      lat: 16.27, lon: -0.04 },
      timbuktu: { name: "Timbuktu", lat: 16.77, lon: -3.01 },
    },
    outbound: ["niani", "walata", "tuat", "cairo", "mecca"],
    homebound: ["mecca", "cairo", "gao", "timbuktu"],
  },

  chapters: [
    {
      id: "empire",
      numeral: "I",
      title: "An empire of gold and salt",
      focus: ["niani", "walata", "timbuktu", "gao"],
      paragraphs: [
        "In the early 1300s, the Mali Empire stretched from the Atlantic coast deep into the Sahel, across lands that today belong to Mali, Senegal, the Gambia, Guinea and Mauritania. Its rulers carried the title mansa, meaning king.",
        "Mali's power rested on a simple exchange. South of the empire lay gold fields such as Bambuk and Bure. North of it, across the Sahara, lay mines of salt, which people in the hot Sahel needed to survive. Whoever controlled the trade between the two grew rich, and for most of the 1300s that was Mali.",
        "Around 1312, a new mansa came to the throne. His name was Musa.",
      ],
    },
    {
      id: "voyage",
      numeral: "II",
      title: "The king who stayed behind",
      focus: ["niani"],
      paragraphs: [
        "Years later, in Cairo, Musa told an Egyptian official a remarkable story about how he became king. The ruler before him, he said, wanted to know whether the Atlantic Ocean had a far shore. He sent 200 ships to find out. Only one came back, reporting that the others had been swept away by a current in the open sea.",
        "The king then set out himself with 2,000 ships, leaving Musa in charge, and was never seen again.",
        "No other evidence of this voyage has been found, and historians still argue about what, if anything, lies behind it. What we do know is that the story comes from Musa himself, and that it was written down within a few years of his visit.",
      ],
      pull: "The story of the lost fleet comes from Musa himself. Whether it happened, nobody knows.",
    },
    {
      id: "sahara",
      numeral: "III",
      title: "Across the sand",
      focus: ["niani", "walata", "tuat", "cairo"],
      paragraphs: [
        "In 1324, Musa set out on the hajj, the pilgrimage to Mecca that every Muslim who is able should make once in their life.",
        "He did not travel lightly. Later writers describe a caravan of thousands of people, with some accounts reaching 60,000, and many camels carrying gold. Those numbers were written down after the event and cannot be checked, but every source agrees that the caravan was enormous.",
        "The route probably ran north-east through desert towns and oases such as Walata and Tuat, a journey of months across the Sahara, before reaching Egypt.",
      ],
    },
    {
      id: "cairo",
      numeral: "IV",
      title: "Cairo, 1324",
      focus: ["cairo"],
      paragraphs: [
        "Cairo was then one of the largest cities in the world, ruled by the Mamluk sultan al-Nasir Muhammad. Musa stayed for about three months.",
        "Court protocol required visitors to kiss the ground before the sultan. At first Musa refused. In the end he agreed to bow, saying that he was bowing to God, who had created him.",
        "Then came the spending. Musa and his followers gave gold to officials, bought goods in the markets and handed out gifts. So much gold entered the city that its value fell. The historian al-Umari, who arrived in Cairo about twelve years later and spoke to people who had met Musa, reported that the price of gold there still had not recovered.",
        "There was an irony at the end. By the time Musa headed home, he had spent so much that he had to borrow money from Cairo's merchants, at high interest.",
      ],
      pull: "Few visitors have ever been generous enough to change the price of money itself.",
    },
    {
      id: "home",
      numeral: "V",
      title: "Bringing Mecca home",
      focus: ["mecca", "cairo", "gao", "timbuktu"],
      paragraphs: [
        "After completing the pilgrimage, Musa returned with scholars, books and an architect and poet from al-Andalus named Abu Ishaq al-Sahili.",
        "In Timbuktu, a great mosque was built of mud brick and wood: the Djinguereber, traditionally dated to 1327. Around the same time, Mali brought the trading city of Gao under its control.",
        "Over the following two centuries Timbuktu grew into one of the great centres of Islamic learning in Africa, where families copied, traded and collected manuscripts on law, astronomy, medicine and poetry.",
      ],
      figure: {
        src: commons("Fortier 372 Timbuktu Djingereber Mosque.jpg", 1200),
        page: commonsPage("Fortier 372 Timbuktu Djingereber Mosque.jpg"),
        alt: "Old black and white photograph of the Djinguereber mosque in Timbuktu",
        caption: "The Djinguereber mosque, photographed by Edmond Fortier around 1905.",
        credit: "Public domain.",
      },
    },
    {
      id: "map",
      numeral: "VI",
      title: "On the map of Europe",
      focus: ["timbuktu"],
      paragraphs: [
        "News of the golden king spread north. In 1375, mapmakers in Majorca produced the Catalan Atlas, one of the finest maps of its time. In the middle of West Africa it shows a crowned African ruler on a throne, holding up a large gold nugget. The label beside him names him as the richest and noblest king in all the land, because of the gold found there.",
        "For European traders, that image became a promise. Within about a century, Portuguese ships were sailing down the West African coast to find the source of the gold for themselves.",
      ],
    },
  ],

  mythFact: [
    {
      claim: "Mansa Musa was the richest person who ever lived.",
      verdict: "Can't be measured",
      note: "A popular modern claim. There are no records of his wealth that could be compared fairly with modern fortunes.",
    },
    {
      claim: "His caravan had 60,000 people.",
      verdict: "Uncertain",
      note: "This figure comes from sources written after the journey. All agree it was huge, but the exact size is unknown.",
    },
    {
      claim: "He made gold lose value in Cairo.",
      verdict: "Reported",
      note: "Recorded by al-Umari, who spoke to people in Cairo who had met Musa.",
    },
  ],

  thenNow: {
    then: "Timbuktu's scholars copied and collected manuscripts for centuries after Musa's return, building one of Africa's great libraries of written knowledge.",
    now: "Timbuktu is a UNESCO World Heritage Site and the Djinguereber still stands, its mud walls re-plastered by the community. When armed groups occupied the city in 2012–13, local families smuggled hundreds of thousands of manuscripts south to Bamako to keep them safe.",
  },

  sources: [
    "Ibn Fadl Allah al-Umari, \"Masalik al-absar fi mamalik al-amsar\" (c. 1340): the main account of Musa's visit to Cairo.",
    "Ibn Khaldun, \"Kitab al-ʿIbar\" (late 14th century).",
    "Ibn Battuta, \"Rihla\": he visited Mali in 1352–53.",
    "N. Levtzion and J. F. P. Hopkins (eds.), \"Corpus of Early Arabic Sources for West African History\", Cambridge University Press (1981).",
    "N. Levtzion, \"Ancient Ghana and Mali\" (1973).",
    "Michael A. Gomez, \"African Dominion: A New History of Empire in Early and Medieval West Africa\", Princeton University Press (2018).",
    "Bibliothèque nationale de France, \"Atlas catalan\" (1375).",
    "UNESCO World Heritage Centre, \"Timbuktu\".",
  ],
};

export const CHRONICLES = { "mansa-musa": MANSA_MUSA };
