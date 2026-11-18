const gameClient = "https://microscape.cc/play/assets/index-Bjzb2vNm.js";
const patchNotes = "https://microscape.cc/patch-notes/";

export const tutorials = [
  {
    id: "gurgle-split-tutorial",
    title: "Gurgle Boss",
    spriteFoes: ["gurgle"],
    summary: "Open the way to The Sump, then use Rubber Boots and watch the split counter during the Gurgle fight.",
    sections: [
      ["1. Travel to O’Rock Sewers", "Open the World Map, select O’Rock Sewers southeast of Jester’s Room, then choose Travel Here.", {
        screenshot: {
          source:{src:"https://microscape.cc/play/assets/microscape-world-map-Cjd3Id0b.png", width:2000, height:1800},
          crop:[790, 750, 440, 330],
          marker:[1004, 909],
          alt:"A close-up of the Microscape World Map with a ring marking the O’Rock Sewers entrance.",
          caption:"The ring marks O’Rock Sewers on the World Map."
        }
      }],
      ["2. Descend to Deep Sewers", "In the first chamber, find the dungeon Travel marker and choose Descend to enter Deep Sewers.", {
        screenshot: {
          mapId:"orock-sewers",
          marker:[208, 72],
          alt:"The O’Rock Sewers map with a ring marking the passage to Deep Sewers.",
          caption:"Use the Travel marker at the ring to reach Deep Sewers."
        }
      }],
      ["3a. Defeat the Sewer Crocodile", "Defeat the Sewer Crocodile using ranged attacks. The dungeon door opens for 60 seconds after the kill.", {
        screenshot: {
          source:{src:"./assets/gurgle-crocodile.png", width:1001, height:674},
          alt:"A player using ranged attacks against the Sewer Crocodile in the green drain at the end of Deep Sewers.",
          caption:"Find the Sewer Crocodile in the green drain shown here. Defeat it with ranged attacks, then descend within 60 seconds."
        }
      }],
      ["3b. Click the open drain and descend", "After the Sewer Crocodile is defeated, click the gold-framed dungeon Travel marker in the drain, then choose Descend to enter The Sump. Do this before the 60-second opening ends.", {
        screenshot: {
          source:{src:"./assets/gurgle-open-drain-map.png", width:688, height:344},
          crop:[335, 65, 180, 130],
          tile:{
            position:[448, 144], size:12,
            src:"./assets/dungeon-travel-icon.png",
            frame:"./assets/dungeon-travel-frame.png"
          },
          alt:"Illustration of the cleared drain in Deep Sewers, with the original gold-framed dungeon Travel marker at the entrance to The Sump and no Crocodile.",
          caption:"After the Crocodile is defeated, click this dungeon marker and choose Descend. Illustrated using the original game map and marker."
        }
      }],
      ["4. Start the fight in The Sump", "Select Gurgle to start the fight. You need combat level 10 and a Dungeon Key. If you have Rubber Boots, equip them before engaging. They grant Soft Landing, which reduces fall damage by 75%.", {
        screenshot: {
          source:{src:"./assets/gurgle-first-form.png", width:788, height:606},
          alt:"Players surrounding Gurgle’s large, round first form in The Sump.",
          caption:"Gurgle’s normal first form. Equip Rubber Boots before starting the fight."
        }
      }],
      ["5. Attack the Slimelets during the splits", "When the counter shows the first or second split, attack the Slimelets while they’re separated. Watch the countdown for when they’ll reunite. On the third split, the countdown shows how long you have before Gurgle can flee.", {
        screenshot: {
          source:{src:"./assets/gurgle-slimelets.png", width:852, height:584},
          alt:"Players fighting three small green Slimelets spread around The Sump after Gurgle splits.",
          caption:"Gurgle splits into Slimelets. Attack them while they’re separated and watch the countdown."
        }
      }],
      ["6. Finish Gurgle’s final form", "When Gurgle collapses into his final form, switch your attacks back to him to finish the fight.", {
        screenshot: {
          source:{src:"./assets/gurgle-final-form.png", width:893, height:607},
          alt:"Players surrounding Gurgle’s collapsed, two-lobed final form in The Sump.",
          caption:"Gurgle’s final form. Switch back to Gurgle and finish the fight."
        }
      }],
      ["Where to get Rubber Boots", "Gurgle drops Rubber Boots at a 1-in-16 rate."]
    ],
    related: ["gurgle", "orock-sewers", "deep-sewers", "the-sump", "sewer-crocodile", "slimelet", "dungeon-key", "rubber-boots", "soft-landing"],
    sources: [
      ["Microscape game client · Dungeon maps, fight requirements and loot", gameClient],
      ["September 30 patch notes · Gurgle’s splits", patchNotes],
      ["Microscape game client · Descend marker and Deep Sewers tile position", "https://microscape.cc/play/assets/index-CUJKZV-W.js"],
      ["Community screenshot · Sewer Crocodile", "./assets/gurgle-crocodile.png"],
      ["Community screenshot · Gurgle’s first form", "./assets/gurgle-first-form.png"],
      ["Community screenshot · Slimelets", "./assets/gurgle-slimelets.png"],
      ["Community screenshot · Gurgle’s final form", "./assets/gurgle-final-form.png"]
    ]
  },
  {
    id: "dragon-breath-tutorial",
    title: "King Onyx Dragon Boss",
    spriteFoes: ["king-onyx-dragon"],
    screenshotSource: {src:"./assets/king-onyx-dragon-tutorial.png", width:3877, height:1039},
    summary: "Open the passage below Dread Mount Onyx and use Pyreshell Ward to reduce the dragon’s fire-breath damage.",
    sections: [
      ["1. Travel to Dread Mount Onyx", "Select Dread Mount Onyx on the World Map and choose Travel Here to enter The Antechamber.", {
        screenshot: {
          crop:[480, 276, 740, 585],
          alt:"The World Map with the Dread Mount Onyx pin selected and Travel Here visible.",
          caption:"Select the Dread Mount Onyx pin and choose Travel Here."
        }
      }],
      ["2. Open the passage and descend", "Defeat Dragon Whelps and Magma Hounds in The Antechamber to fill the passage meter. When the passage opens, select the dungeon Travel marker and choose Descend before the countdown ends.", {
        screenshot: {
          crop:[1530, 84, 1020, 814],
          marker:[2464, 714],
          alt:"A player fighting in the Antechamber. The passage meter is at the upper right, and a ring marks the Travel tile on the right side of the chamber.",
          caption:"Watch the meter at the top right. When the passage opens, use the Travel tile marked by the ring."
        }
      }],
      ["3. Attack King Onyx Dragon in The Lair", "Select King Onyx Dragon to start the fight. You need combat level 60 and a Dungeon Key. Keep cooked food equipped throughout the encounter.", {
        screenshot: {
          crop:[2820, 140, 1010, 725],
          alt:"A player in The Lair facing the grounded King Onyx Dragon, with green positions marking where players can stand to fight.",
          caption:"Select King Onyx Dragon in The Lair. The green squares mark available combat positions."
        }
      }],
      ["Reduce dragon breath damage with Pyreshell Ward", "At Defense 40, equip the Pyreshell Shield to use Pyreshell Ward. Once you permanently unlock Pyreshell Ward at ability level 60, you can equip the ability without the shield. Its reduction to dragon fire-breath damage scales from 1% to 80% with ability level."],
      ["When the dragon takes flight", "Use long-range attacks on the airborne dragon, such as Ranged with a bow or long-range Evil Magic spells. You can also defeat Dragon Whelps to force it back down. When it lands and calls for more whelps, focus on finishing the boss before the swarm builds up."],
      ["Where to get the shield", "The shield is a rare catch at Pyreshell Spots in Havendell Dungeon. Fishing for Pyreshell requires Fishing 60 and Raw Frog bait."]
    ],
    related: ["king-onyx-dragon", "dread-mount-onyx-antechamber", "dread-mount-onyx-lair", "dungeon-key", "dragon-whelp", "magma-hound", "pyreshell-shield", "pyreshell-ward", "havendell-dungeon"],
    sources: [["Microscape game client · Dungeon access, dragon phases and Pyreshell Ward", gameClient], ["Community walkthrough screenshots", "./assets/king-onyx-dragon-tutorial.png"]]
  },
  {
    id: "morvane-tutorial",
    title: "Morvane Boss",
    spriteFoes: ["morvane", "iskarn", "pyrax"],
    screenshotSource: {src:"./assets/morvane-quick-tutorial.png", width:5096, height:1048},
    summary: "Break the seal in The Sanctum to face Morvane, Corrupted Keeper of the Heartwood, in Havendell Lair.",
    sections: [
      ["1. Travel to Havendell Dungeon", "Open the World Map, select Havendell Dungeon and choose Travel Here.", {
        screenshot: {
          crop:[300, 90, 800, 610],
          alt:"The World Map with Havendell Dungeon selected and the Travel Here option visible.",
          caption:"Select the Havendell Dungeon pin to open its Travel Here menu."
        }
      }],
      ["2. Descend at the big tree", "In the first chamber, find the big tree on the island. Select the dungeon Travel marker at its roots and choose Descend to enter The Sanctum.", {
        screenshot: {
          crop:[1664, 295, 760, 545],
          alt:"The big tree on an island in Havendell Dungeon with a dungeon travel icon at the base of its trunk.",
          caption:"The dungeon icon at the tree’s roots leads down to The Sanctum."
        }
      }],
      ["3. Defeat both guardians to open the gate", "Bring Iskarn and Pyrax low, then finish them within a short window of each other. After the first falls, kill the survivor before it finishes resealing the gate. If the guardians despawn and the seal resets, you’ll need to fight them again. Once the gate opens, choose Descend to reach Havendell Lair.", {
        screenshot: {
          crop:[2825, 82, 1040, 810],
          alt:"The Sanctum with Iskarn on the icy left side, Pyrax on the lava side at the right, and a stone gate between them.",
          caption:"Iskarn is on the ice to the left. Pyrax is on the lava side to the right."
        }
      }],
      ["4. Split into two teams in the lair", "Have one team attack Morvane and the other handle Iskarn and Pyrax when they appear. The boss team needs combat level 40 and a Dungeon Key to attack him. Only players who fight him get the boss reward when he falls. You can enter the lair to watch or fight the side monsters without a key. If you already have a key, you keep it as long as you leave the boss to the other team.", {
        screenshot: {
          crop:[4120, 20, 974, 675],
          alt:"Players fighting in Havendell Lair, with Morvane near the center and the two elementals on either side.",
          caption:"The boss team attacks Morvane while the other team handles the elementals on either side."
        }
      }],
      ["5. Alternate kills to keep Morvane from healing", "Morvane can revive the elementals or heal himself. Time the kills so he keeps casting Mass Elemental Revive.", {
        steps: [
          "Kill one elemental. Watch the dungeon meter for the Mass Elemental Revive cast.",
          "While the first elemental is down, weaken the second and hold the finishing blow.",
          "Just before the first elemental revives, finish off the second. Repeat the cycle while the boss team keeps attacking Morvane."
        ],
        screenshot: {
          crop:[4270, 160, 740, 255],
          alt:"A close-up of the group fight with the ice elemental on the left and the fire elemental on the right.",
          caption:"Alternate between Iskarn and Pyrax. Leave one alive until the other is about to revive."
        }
      }],
      ["Prepare for Morvane’s flurry", "Equip cooked food before engaging Morvane. If you use a one-handed weapon and have Defense 20, the Steel Sq Shield grants Shield Wall, which has a chance to cap an incoming hit at 30% of your maximum HP."]
    ],
    related: ["morvane", "havendell-dungeon", "the-sanctum", "havendell-lair", "dungeon-key", "iskarn", "pyrax", "steel-sq-shield", "shield-wall"],
    sources: [["Microscape game client · Havendell gate, Morvane fight and Shield Wall", gameClient], ["Community walkthrough screenshots", "./assets/morvane-quick-tutorial.png"]]
  }
].map(tutorial => ({ category: "tutorials", ...tutorial }));
