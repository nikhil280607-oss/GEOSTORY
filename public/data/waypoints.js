/**
 * waypoints.js — the timeline.
 *
 * The timeline follows the 8 "thresholds" of Big History (David Christian,
 * "Maps of Time", 2004; bighistoryproject.com): Big Bang, stars, new elements,
 * Earth, life, humans, farming, and the modern revolution.
 *
 * Stops are spaced by meaning, not by years: giant jumps through deep time,
 * then shorter steps once there are people and places to talk about.
 *
 * kind: "cosmos" -> no geography yet, shown as a sky scene
 *       "map"    -> world map; `borders` names the historical border snapshot
 *                   in public/data/geo/borders-<borders>.json (null = land only)
 */

export const CHAPTERS = [
  { id: "bang",     n: 1, name: "The Big Bang",          short: "Big Bang" },
  { id: "stars",    n: 2, name: "The first stars",       short: "Stars" },
  { id: "elements", n: 3, name: "New chemical elements", short: "Elements" },
  { id: "earth",    n: 4, name: "Earth and the Sun",     short: "Earth" },
  { id: "life",     n: 5, name: "Life",                  short: "Life" },
  { id: "humans",   n: 6, name: "Humans",                short: "Humans" },
  { id: "farming",  n: 7, name: "Farming and cities",    short: "Farming and cities" },
  { id: "modern",   n: 8, name: "The modern revolution", short: "Modern" },
];

export const WAYPOINTS = [
  {
    id: "big-bang", chapter: "bang", kind: "cosmos", scene: "bang",
    tick: "13.8 bn", label: "13.8 billion years ago", title: "The Big Bang",
    text: "Space, time and energy begin in an event far hotter and denser than anything since. For about 380,000 years the universe is a glowing fog. Then it cools enough to turn transparent, and that first light still reaches us today as a faint microwave glow.",
  },
  {
    id: "first-stars", chapter: "stars", kind: "cosmos", scene: "stars",
    tick: "13.6 bn", label: "About 13.6 billion years ago", title: "The first stars ignite",
    text: "Gravity pulls clouds of hydrogen and helium together until their cores grow hot enough to fuse. The first stars were probably huge and short-lived, lighting up a universe that had been dark for around a hundred million years.",
  },
  {
    id: "elements", chapter: "elements", kind: "cosmos", scene: "elements",
    tick: "13 bn →", label: "From about 13 billion years ago", title: "Stars forge the elements",
    text: "Inside stars, light elements fuse into heavier ones. When the biggest stars die in supernova explosions, they scatter carbon, oxygen, calcium and iron into space. The calcium in your bones and the iron in your blood were made this way.",
  },
  {
    id: "earth", chapter: "earth", kind: "cosmos", scene: "earth",
    tick: "4.5 bn", label: "4.5 billion years ago", title: "The Sun and Earth form",
    text: "A cloud of gas and dust, enriched by generations of dead stars, collapses into the Sun. Leftover debris clumps into planets. The young Earth is a molten ball, battered by impacts, and one giant collision is thought to have created the Moon.",
  },
  {
    id: "first-life", chapter: "life", kind: "cosmos", scene: "life",
    tick: "3.8 bn", label: "About 3.8 billion years ago", title: "Life begins",
    text: "Once Earth has cooled and gathered oceans, the first single-celled life appears, possibly around hot vents on the sea floor. The oldest evidence is still debated. For roughly the next three billion years, almost all life stays microscopic.",
  },
  {
    id: "66mya", chapter: "life", kind: "map", borders: null,
    tick: "66 m", label: "66 million years ago", title: "The dinosaurs' last day",
    intro: "An asteroid ends the age of dinosaurs and clears the way for mammals.",
    mapNote: "Modern coastlines shown. The continents sat in slightly different places then.",
  },
  {
    id: "300kya", chapter: "humans", kind: "map", borders: null,
    tick: "300 k", label: "300,000 years ago", title: "Our species appears",
    intro: "The oldest known Homo sapiens are living in Africa.",
    mapNote: "Modern coastlines shown. Sea levels changed many times since.",
  },
  {
    id: "9500bce", chapter: "farming", kind: "map", borders: "bc10000",
    tick: "9500 BCE", label: "Around 9500 BCE", title: "The first farmers",
    intro: "After the last Ice Age, people in a few regions begin to plant, herd and settle.",
    mapNote: "Borders show cultures and ways of life, not countries.",
  },
  {
    id: "3000bce", chapter: "farming", kind: "map", borders: "bc3000",
    tick: "3000 BCE", label: "3000 BCE", title: "Cities and writing",
    intro: "Along great rivers, the first cities rise and writing is invented to run them.",
  },
  {
    id: "500bce", chapter: "farming", kind: "map", borders: "bc500",
    tick: "500 BCE", label: "500 BCE", title: "Empires and ideas",
    intro: "Vast empires build roads while thinkers argue about how people should live.",
  },
  {
    id: "1ce", chapter: "farming", kind: "map", borders: "bc1",
    tick: "1 CE", label: "Around 1 CE", title: "Rome and Han",
    intro: "Two giant empires sit at opposite ends of Eurasia, linked by long trade routes.",
  },
  {
    id: "800ce", chapter: "farming", kind: "map", borders: "800",
    tick: "800", label: "800 CE", title: "Crossroads of the world",
    intro: "Baghdad, Chang'an and West Africa's gold kingdoms tie the old world together.",
  },
  {
    id: "1300ce", chapter: "farming", kind: "map", borders: "1300",
    tick: "1300", label: "1300 CE", title: "The age of great journeys",
    intro: "Mongol rule opens Asia, and Mali's gold becomes famous across three continents.",
  },
  {
    id: "1500ce", chapter: "farming", kind: "map", borders: "1500",
    tick: "1500", label: "1500 CE", title: "The oceans open",
    intro: "Printed books spread ideas, and ships begin to link every coast on Earth.",
  },
  {
    id: "1800ce", chapter: "modern", kind: "map", borders: "1800",
    tick: "1800", label: "1800 CE", title: "Machines arrive",
    intro: "Steam and factories begin the biggest change in how humans live since farming.",
  },
  {
    id: "1900ce", chapter: "modern", kind: "map", borders: "1900",
    tick: "1900", label: "1900 CE", title: "An industrial world",
    intro: "Railways, steamships and mass production reach almost everywhere.",
  },
  {
    id: "today", chapter: "modern", kind: "map", borders: "2010",
    tick: "Today", label: "Today", title: "A connected planet",
    intro: "Eight billion people, linked by a single global network.",
  },
];

/** Big-number "years ago" for the era card (display only). */
export const YEARS_AGO = {
  "66mya": "66,000,000 years ago",
  "300kya": "300,000 years ago",
  "9500bce": "about 11,500 years ago",
  "3000bce": "about 5,000 years ago",
  "500bce": "about 2,500 years ago",
  "1ce": "about 2,000 years ago",
  "800ce": "about 1,200 years ago",
  "1300ce": "about 700 years ago",
  "1500ce": "about 500 years ago",
  "1800ce": "about 225 years ago",
  "1900ce": "about 125 years ago",
  "today": "now",
};
