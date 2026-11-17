const iconFiles = {
  Beatrix: "8/89",
  Biscuit: "a/a2",
  Bog: "4/48",
  Cinder: "3/39",
  Clement: "7/79",
  Fibs: "7/74",
  "Golem Core": "c/cd",
  Hilda: "f/fb",
  Hubble: "f/f2",
  Merlin: "b/b0",
  Otter: "5/5f",
  "Peace Moth": "d/d9",
  Pebble: "7/77",
  Pickles: "2/24",
  Quill: "1/18",
  Riddle: "d/d5",
  Sage: "0/05",
  Scales: "d/d8",
  Scoop: "c/c4",
  Smudge: "b/b9",
  Stitch: "5/5d",
  Stump: "2/21",
  Tinderling: "8/84",
  Winkle: "a/ad",
  "Blue Lobster": "b/bc"
};

const activityLocations = {
  Cooking: ["Cook food at a fire, such as the one at Fencewell Bridge. The Manor Kitchen also has cooking tables for preparation.", ["fencewell-bridge", "manor-kitchen"]],
  Crafting: ["Mine clay or use one of the crafting stations at Viking Village. Solace Glasshouse has a kiln and glassblowing pipes.", ["viking-village", "solace-glasshouse"]],
  Firemaking: ["Burn logs at a fire, such as the one at Fencewell Bridge.", ["fencewell-bridge"]],
  Fishing: ["Catch shrimp at the Small Net Spot in Fencewell Bridge or fish for lobster at the Crab Cage Spot in Solace Shoals.", ["fencewell-bridge", "solace-shoals"]],
  Fletching: ["Use a Chillin’ Spot for eligible bow and arrow recipes.", []],
  "Good Magic": ["Use a Chillin’ Spot for eligible spells such as Bones to Bread and amulet enchantments.", []],
  Herblaw: ["Brew standard and super skill potions at a Druidic Altar.", []],
  Mining: ["Mine the eligible ores at their rock nodes. Al-Sahra Mine has iron and silver rocks.", ["al-sahra-mine"]],
  Piety: ["Train Piety using bones, big bones, or dragon bones.", []],
  Smithing: ["Make bronze bars at the Fencewell Bridge smelter, or use an anvil such as the one in Al-Sahra to forge eligible equipment.", ["fencewell-bridge", "al-sahra"]],
  Woodcutting: ["Cut ordinary or oak trees at Fencewell Bridge, or use a higher-level tree listed in the odds table.", ["fencewell-bridge"]]
};

const number = new Intl.NumberFormat("en");
const slug = text => text.toLowerCase().replaceAll(" ", "-");

function portrait(name) {
  const file = (name === "Blue Lobster" ? "RawBlueLobster" : name.replaceAll(" ", "")) + "Icon.png";
  return {
    src: "https://static.wikitide.net/microscapewiki/" + iconFiles[name] + "/" + file,
    source: "https://microscape.miraheze.org/wiki/File:" + file
  };
}

function boostedOdds(base, boost) {
  const denominator = Number(base.match(/\d[\d,]*$/)?.[0].replaceAll(",", ""));
  return Number.isFinite(denominator) ? "≈ 1 in " + number.format(Math.round(denominator / boost)) : "—";
}

export function buildPetEntries(reference) {
  const byId = new Map(reference.map(entry => [entry.id, entry]));
  const overview = byId.get("pets");
  if (!overview) return [];

  const combatTable = overview.tables.find(table => table.columns[0] === "Encounter");
  const catchTable = overview.tables.find(table => table.columns[0] === "Catch");
  const skillingTables = overview.tables.filter(table => table.collapsed);
  const vendors = overview.tables.filter(table => table.petVendor);
  const profiles = vendors.flatMap(({petVendor: vendor, rows}) => rows.map(([companion, name, map, skill]) => {
    const isCombat = skill === "Combat";
    const skillEntry = byId.get(slug(skill));
    const art = portrait(name);
    const profile = {
      id: "pet-" + slug(name),
      category: "pets",
      group: isCombat ? "Combat pets" : "Skilling pets",
      title: name,
      summary: companion + " · " + skill,
      portrait: art,
      facts: [["Skill", skill], ["Pet Map", map], ["Vendor", vendor.name], ["Cost", vendor.cost + " Audience Favor"]],
      sections: [
        ["How to get " + name, "Trade with " + vendor.name + " at Fellroot Swamp Hut for the " + map + ". " +
          (vendor.membership ? "Adventurer’s Guild membership is required to buy the map. " : "") +
          "Carry the map while completing an eligible " + (isCombat ? "encounter" : "task") + ". It is consumed when you find " + name + "."]
      ],
      related: ["fellroot-swamp-hut", "pets"],
      sources: [
        ["In-game icon on Miraheze", art.source],
        ["Miraheze pet map reference", overview.sourceUrl]
      ]
    };

    if (isCombat) {
      const rows = combatTable.rows.filter(([, pet]) => pet === name);
      const foes = rows.map(([encounter]) => byId.get(slug(encounter)));
      profile.tables = [{
        title: "Combat drop odds",
        columns: ["Encounter", "Location", "Odds per eligible kill"],
        rows: rows.map(([encounter, , , odds], i) => [
          encounter,
          encounter === "Dragon Whelp" ? "The Antechamber and The Lair" : foes[i]?.facts?.find(([label]) => label === "Locations")?.[1] || "See encounter",
          odds
        ])
      }];
      profile.related.unshift(...foes.filter(Boolean).map(foe => foe.id));
      const boss = name === "Scales" ? "King Onyx Dragon" : "Morvane";
      profile.sections.push(["Dungeon encounter", "Bring a Dungeon Key to fight " + boss + "."]);
      profile.sources.push(
        ["Community combat pet drop tables", "https://microwiki.mhmm.pl/pets"],
        ["Dungeon locations and entry requirements", "https://microwiki.mhmm.pl/guides/dungeons"]
      );
      if (name === "Scales") {
        profile.facts.push(["Beta ability", "Clumsy Flame"]);
        profile.sections.push(["Clumsy Flame", "Scales can occasionally singe its owner in the beta."]);
        profile.related.push("clumsy-flame");
      }
    } else {
      const skillTable = skillingTables.find(table => table.columns.includes(name));
      const column = skillTable.columns.indexOf(name);
      const [locations, locationIds] = activityLocations[skill];
      profile.sections.push(
        ["Where to train", locations],
        ["Drop odds", "These are community estimates per eligible action. The game’s patch notes describe a 2× chance at skill level 70 and a 3× chance at level 85."]
      );
      profile.tables = [{
        title: "Estimated drop odds by task",
        columns: ["Eligible task", "Base odds", "Level 70–84", "Level 85+"],
        rows: skillTable.rows.map(row => [row[0], row[column], boostedOdds(row[column], 2), boostedOdds(row[column], 3)])
      }];
      profile.related.unshift(skillEntry.id, ...locationIds);
      profile.sources.push(
        [skill + " activities on Miraheze", skillEntry.sourceUrl],
        ["The Microscape Scribe skill activity database", "https://thescribe.tips/database"],
        ["May 15 pet chance bonuses", "https://microscape.cc/patch-notes/"]
      );
    }
    return profile;
  }));

  const [catchName, task, location, odds] = catchTable.rows[0];
  const catchPortrait = portrait(catchName);
  profiles.push({
    id: "pet-blue-lobster",
    category: "pets",
    group: "Rare catches",
    title: catchName,
    summary: "Rare catch · Fishing",
    portrait: catchPortrait,
    facts: [["Fishing level", "40"], ["Map", "None required"]],
    sections: [
      ["How to find Blue Lobster", "Fish for lobster at the Crab Cage Spot in Solace Shoals. The November beta reference records the Blue Lobster as a rare catch and describes a planned pet conversion after the reset."]
    ],
    tables: [{title: "Catch odds", columns: ["Task", "Location", "Odds per action"], rows: [[task, location, odds]]}],
    related: ["solace-shoals", "fishing", "blue-lobster", "pets"],
    sources: [
      ["In-game catch icon on Miraheze", catchPortrait.source],
      ["Blue Lobster item reference", byId.get("blue-lobster").sourceUrl],
      ["Miraheze pet reference", overview.sourceUrl]
    ]
  });
  return profiles.sort((a, b) => a.title.localeCompare(b.title));
}
