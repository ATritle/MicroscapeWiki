const gameClient = "https://microscape.cc/play/assets/index-Bjzb2vNm.js";
const patchNotes = "https://microscape.cc/patch-notes/";

export const tutorials = [
  {
    id: "gurgle-split-tutorial",
    title: "Gurgle’s splits",
    summary: "Use Rubber Boots to reduce fall damage and watch the split counter in The Sump.",
    sections: [
      ["Equip Rubber Boots", "If you have a pair, equip Rubber Boots before fighting Gurgle. They grant Soft Landing, which reduces fall damage by 75%. Keep them on through the split phases to cushion any falls."],
      ["Watch the split counter", "Use each split window to deal damage before the slimes reunite. The fight shows which split you are on and warns you on the third, when Gurgle can flee."],
      ["Where to get them", "Rubber Boots are a 1-in-16 drop from Gurgle. The item page lists the drop source and equipment details."]
    ],
    related: ["gurgle", "rubber-boots", "soft-landing", "the-sump"],
    sources: [["Microscape game client · Soft Landing and loot", gameClient], ["September 30 patch notes · Gurgle’s splits", patchNotes]]
  },
  {
    id: "dragon-breath-tutorial",
    title: "Protect against dragon breath",
    summary: "Equip the Pyreshell Shield for Pyreshell Ward against fire breath, such as King Onyx Dragon’s.",
    sections: [
      ["Equip the Pyreshell Shield", "At Defense 40, equip the Pyreshell Shield to use Pyreshell Ward. It reduces damage from a dragon’s fire breath. The reduction scales from 1% to 80% with the ability’s level."],
      ["Where to use it", "Bring the shield to Dread Mount Onyx for King Onyx Dragon’s fire breath. Keep food equipped for the rest of the fight."],
      ["Where to get it", "The shield is a rare catch at Pyreshell Spots in Havendell Dungeon. Fishing for Pyreshell requires Fishing 60 and Raw Frog bait."]
    ],
    related: ["pyreshell-shield", "pyreshell-ward", "king-onyx-dragon", "dread-mount-onyx-lair", "havendell-dungeon"],
    sources: [["Microscape game client · Pyreshell Ward, King Onyx Dragon and Fishing", gameClient]]
  }
].map(tutorial => ({ category: "tutorials", ...tutorial }));
