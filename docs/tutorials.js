const gameClient = "https://microscape.cc/play/assets/index-Bjzb2vNm.js";
const patchNotes = "https://microscape.cc/patch-notes/";

export const tutorials = [
  {
    id: "gurgle-split-tutorial",
    title: "Gurgle Boss",
    summary: "Open the way to The Sump, then use Rubber Boots and watch the split counter during the Gurgle fight.",
    sections: [
      ["How to open the fight", "In Deep Sewers, defeat the Sewer Crocodile using ranged attacks. The dungeon door opens for 60 seconds after the crocodile is defeated. Select Descend before the door closes to enter The Sump and start the Gurgle fight."],
      ["Equip Rubber Boots", "If you have a pair, equip Rubber Boots before fighting Gurgle. They grant Soft Landing, which reduces fall damage by 75%. Keep them on through the split phases to cushion any falls."],
      ["Watch the split counter", "Use each split window to deal damage before the slimes reunite. The fight shows which split you are on and warns you on the third, when Gurgle can flee."],
      ["Where to get them", "Rubber Boots are a 1-in-16 drop from Gurgle. The item page lists the drop source and equipment details."]
    ],
    related: ["gurgle", "sewer-crocodile", "deep-sewers", "the-sump", "rubber-boots", "soft-landing"],
    sources: [["Microscape game client · Soft Landing and loot", gameClient], ["September 30 patch notes · Gurgle’s splits", patchNotes]]
  },
  {
    id: "dragon-breath-tutorial",
    title: "King Onyx Dragon Boss",
    summary: "Open the passage below Dread Mount Onyx and use Pyreshell Ward to reduce the dragon’s fire-breath damage.",
    sections: [
      ["How to open the fight", "Bring a Dungeon Key and reach combat level 60. Select Dread Mount Onyx on the World Map and travel to The Antechamber. Defeat Dragon Whelps and Magma Hounds to fill the passage meter. When the passage opens, use the dungeon Travel marker and choose Descend before the countdown ends. Select King Onyx Dragon in The Lair to start the fight."],
      ["Equip the Pyreshell Shield", "At Defense 40, equip the Pyreshell Shield to use Pyreshell Ward. It reduces damage from a dragon’s fire breath. The reduction scales from 1% to 80% with the ability’s level."],
      ["When the dragon takes flight", "Hit the airborne dragon with long-range attacks or defeat Dragon Whelps to force it back down. When the dragon lands and calls for more whelps, focus on finishing the boss before they swarm you. Keep food equipped throughout the fight."],
      ["Where to get the shield", "The shield is a rare catch at Pyreshell Spots in Havendell Dungeon. Fishing for Pyreshell requires Fishing 60 and Raw Frog bait."]
    ],
    related: ["king-onyx-dragon", "dread-mount-onyx-antechamber", "dread-mount-onyx-lair", "dungeon-key", "dragon-whelp", "magma-hound", "pyreshell-shield", "pyreshell-ward", "havendell-dungeon"],
    sources: [["Microscape game client · Dungeon access, dragon phases and Pyreshell Ward", gameClient]]
  },
  {
    id: "morvane-tutorial",
    title: "Morvane Boss",
    summary: "Break the seal in The Sanctum to face Morvane, Corrupted Keeper of the Heartwood, in Havendell Lair.",
    sections: [
      ["How to open the fight", "Bring a Dungeon Key and reach combat level 40. Travel to Havendell Dungeon from the World Map, then use the dungeon Travel marker and choose Descend to reach The Sanctum. Defeat both Iskarn and Pyrax. Once one falls, finish the other before it can reseal the gate. When the gate opens, choose Descend while it’s still open, then select Morvane in Havendell Lair to start the fight."],
      ["Get past the guardians", "Iskarn can chill you in place and Pyrax can burn you if you’re within eight paces. If you’re fighting in a group, coordinate your attacks so both guardians are low on health before finishing the first one."],
      ["Prepare for Morvane’s flurry", "Equip cooked food before engaging Morvane. If you use a one-handed weapon and have Defense 20, the Steel Sq Shield grants Shield Wall, which has a chance to cap an incoming hit at 30% of your maximum HP."],
      ["Watch for Mass Elemental Revive", "When Morvane summons Iskarn and Pyrax in the lair, check the dungeon display for each guardian’s remaining health. The display also shows the progress of Mass Elemental Revive when Morvane starts casting it. Watch the meter so you’re ready if the guardians return."]
    ],
    related: ["morvane", "havendell-dungeon", "the-sanctum", "havendell-lair", "dungeon-key", "iskarn", "pyrax", "steel-sq-shield", "shield-wall"],
    sources: [["Microscape game client · Havendell gate, Morvane fight and Shield Wall", gameClient]]
  }
].map(tutorial => ({ category: "tutorials", ...tutorial }));
