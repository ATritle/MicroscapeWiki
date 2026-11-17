const official = "https://microscape.cc/";
const patches = "https://microscape.cc/patch-notes/";
const wiki = "https://microscape.miraheze.org/wiki/";

export const guides = [
  {
    id: "getting-started",
    title: "Getting started",
    summary: "Earn Energy, find your first activity, and put together a starter kit in Fencewell.",
    sections: [
      ["Sign in and find a stream", "Open Microscape and sign in with Twitch. Find a channel that has enabled the game. Your character follows you between participating channels. Open the in-game Journal to see whether Energy is arriving before starting a long activity."],
      ["Build a food supply", "At Fencewell Bridge, catch shrimp at a Small Net Spot and cook them at the fire. Equip the cooked food in Equipment before trying combat. Stay nearby for the first few fights so you can see how quickly you use food."],
      ["Pick a useful second skill", "Fishing supplies Cooking. Woodcutting supplies Firemaking and Fletching. Mining supplies Smithing. Follow one pair at first so the resources from your gathering activity serve your next task."],
      ["Before leaving the game idle", "Check Energy, available loot space and the materials your activity spends. In combat, check food and the arrows or runes your loadout uses. Open Activity & Loot when you return to find out what your character collected."]
    ],
    related: ["energy", "fencewell-bridge", "fishing", "combat"],
    sources: [["Official Microscape website", official], ["Fencewell Bridge reference", wiki + "Locations/Fencewell_Bridge"], ["Combat guide on Miraheze", wiki + "Combat"]]
  },
  {
    id: "energy",
    title: "Energy and idle play",
    summary: "Find an enabled Twitch channel, check Energy in the Journal, and diagnose an activity that stopped.",
    sections: [
      ["Where playtime comes from", "Participation in Twitch communities that have enabled Microscape earns Energy. Look for the channel’s Microscape-specific rewards and use the game’s Journal under Energy to see when an award arrived. The current community reference describes periodic Twitch activity checks, so allow time for the next check after interacting."],
      ["If an activity stops", "Check for an Energy runout event in the Journal. Then review the activity for exhausted materials, ammunition, runes or food. For a dungeon run, also examine its entry or chamber requirements."],
      ["Channel rewards", "Participating channels may offer Energy through Twitch Channel Points. The channel controls its rewards and point costs. Read the reward on Twitch for its current amount and who receives it."]
    ],
    related: ["getting-started", "activity-queue", "audience-favor"],
    sources: [["Official Microscape website", official], ["September 30 patch notes", patches], ["Energy reference on Miraheze", wiki + "Energy"]]
  },
  {
    id: "combat",
    title: "Combat and food",
    summary: "Choose a combat style, bring consumables, and check a foe’s stats and loot before fighting.",
    sections: [
      ["Prepare your loadout", "Choose a foe and the combat skill to train. Bring arrows when using a bow and the runes required by your spells or prayers. Equip cooked food so it is available during the fight."],
      ["Start with a short session", "Watch a few fights before leaving the character idle. Check damage taken, food use and loot capacity. The foe directory includes stats and drop tables wherever the community wiki has recorded them."],
      ["Fighting bosses", "Bosses can have mechanics that interrupt a routine fight. For example, the patch notes describe Gurgle’s three splits and a warning on the final one. Check your current activity or the relevant dungeon guide as you progress."]
    ],
    related: ["food", "gurgle", "attack", "ranged", "evil-magic", "dungeons"],
    sources: [["Combat reference on Miraheze", wiki + "Combat"], ["Food reference on Miraheze", wiki + "Food"], ["September 30 and October 28 patch notes", patches]]
  },
  {
    id: "dungeons",
    title: "Dungeons and keys",
    summary: "Check key reset times, prepare to descend, and look up bosses before entering.",
    sections: [
      ["Check your Dungeon Keys", "In the Journal, select the Dungeon Key entry to open your upcoming reset times. Use the in-game timer when planning a run."],
      ["At the chamber entrance", "Banking and descending share a dialog. Before descending, check food, ammunition or runes, and room for drops. The September 21 notes confirm that fallback activities can run in a dungeon’s first chamber."],
      ["Start with the encounter", "The Sump is home to Gurgle. Its battle shows your progress through three splits. For encounters such as King Onyx Dragon, follow the in-game phase cues and review the foe record before committing supplies."]
    ],
    related: ["the-sump", "gurgle", "king-onyx-dragon", "combat", "activity-queue"],
    sources: [["September 21, September 30 and October 28 patch notes", patches], ["Gurgle reference on Miraheze", wiki + "Foe/Gurgle"]]
  },
  {
    id: "bazaar",
    title: "Bazaar and trading",
    summary: "Use buy orders and sell offers, then confirm prices and quantities before posting.",
    sections: [
      ["Look up an item", "Use the Bazaar’s search and category controls to locate a tradable item. The Bazaar remembers its own filter settings across Inventory, Shop and Alchemy."],
      ["Review your order", "Choose the buying or selling side. Confirm the quantity and price in the offer dialog. Open Buying or Selling to review the offers you’ve placed."],
      ["Decide what to keep", "Check whether your item is an input for a recipe, required by an activity, or an investment for an ability. The vendor value shown in an item reference is the price the vendor pays. The Bazaar reflects the offers players place."]
    ],
    related: ["getting-started", "limit-breaks", "vendor"],
    sources: [["September 21, September 30 and October 6 patch notes", patches], ["Vendor reference on Miraheze", wiki + "Vendor"]]
  },
  {
    id: "activity-queue",
    title: "Activity queue and fallback",
    summary: "Set a training target, arrange queue steps, and plan for interruptions.",
    sections: [
      ["Queue a target", "The Adventurer’s Guild activity queue can run steps toward a target such as reaching a specified level. Each step displays its skill. Move to Top and Move to Bottom help reorder a sequence when one step needs to finish first."],
      ["Check whether a queue is running", "Look for the running-queue indicator near the upper-right corner or review the queue summary in Activity & Loot. Start with a short queue so you can verify each step has the supplies and requirements it needs."],
      ["Set a fallback", "Select a fallback activity that can run with your available supplies. The September patch notes say one-off actions such as buying a map skip fallback and the first dungeon chamber supports it."]
    ],
    related: ["energy", "dungeons", "experience"],
    sources: [["September 2, September 21 and September 30 patch notes", patches], ["Official membership terms", official + "terms-of-service/"]]
  },
  {
    id: "audience-favor",
    title: "Audience Favor and festivals",
    summary: "Find Favor sources and see how the currency connects to pet maps.",
    sections: [
      ["Earn Favor", "The October 6 patch switched achievement rewards to Audience Favor. Participating Twitch channels can also run Drop Festivals with channel rewards. Read the reward in the channel you are watching to see its rules."],
      ["Spend Favor on maps", "Mork and Otis in Fellroot Swamp Hut sell pet maps. The community catalog associates each map with an activity or a skill. Check the current map price and any membership requirement at the vendor before buying."],
      ["If a redemption is missing", "Check the Twitch redemption and the game’s Journal or inventory. The September 21 update added processing for redemptions fulfilled manually by the streamer or a moderator."]
    ],
    related: ["pets", "fellroot-swamp-hut", "energy"],
    sources: [["Official Microscape website", official], ["September 21 and October 6 patch notes", patches], ["Pet map reference on Miraheze", wiki + "Pets"]]
  },
  {
    id: "limit-breaks",
    title: "Abilities and limit breaks",
    summary: "Find the associated item, track both breakpoints, and use the Ability Compendium to verify costs.",
    sections: [
      ["Read the ability in game", "Start with the Ability Compendium to confirm the item, skill requirement, and how the ability gains experience. Many abilities come from equipment or a consumable."],
      ["Budget for both investments", "The October rebalance moved many breakpoints to roughly a quarter and three-quarters of maximum power and equalized the two costs. Check the exact item count before investing. If the item grants the effect while equipped, plan to keep a copy to use during training."],
      ["Slot the ability", "After both investments, the community guide describes using the ability in a slot independently of the equipment that granted it. Confirm the slot requirements and any ongoing consumables in the Compendium."],
      ["Patch changes", "The October 21 patch removed Emberstrike. October 28 restricted Fanaticism to melee, made Salt Cure work on a cooking fire, and changed some investment quantities."]
    ],
    related: ["combat", "equipment-bonuses", "experience"],
    sources: [["October 6, October 21 and October 28 patch notes", patches], ["Ability reference on Miraheze", wiki + "Abilities"]]
  },
  {
    id: "experience",
    title: "XP calculator",
    summary: "Calculate XP between two levels and estimate actions from your in-game XP rate.",
    calculator: true,
    sections: [
      ["Experience curve", "The October 6 patch adopted the Old School RuneScape experience thresholds multiplied by ten. Enter a start level and a target level to see the total required. If you know the XP per action, enter it to estimate how many actions you need. Enter your exact current XP to account for progress through your current level."]
    ],
    related: ["getting-started", "level", "activity-queue"],
    sources: [["October 6 patch notes", patches], ["Experience table on Miraheze", wiki + "Experience"]]
  },
  {
    id: "release-notes",
    title: "Release and beta archive",
    summary: "Check the announced launch date and the beta updates behind this wiki’s first edition.",
    sections: [
      ["November 19, 2026", "The developer announced November 19 as the general release date. The October 6 update describes a reset ahead of release. In-game values may change at launch. Check the latest official updates and in-game tooltips when a beta reference differs."],
      ["November 12 • The King’s Jubilee", "The final listed beta update describes the King of O’Rock’s party and its goodie bags."],
      ["October 28 • Item and ability updates", "The hatchet became the logging axe and slag became dross. Equipment swaps and potions began taking effect immediately during combat. The patch revised several ability effects and investment counts."],
      ["October 21 and October 6 • Rebalance", "The patches changed recipes, XP rates, several spells, ability breakpoints and the experience curve. Use the original dates when comparing beta observations."]
    ],
    related: ["getting-started", "experience", "limit-breaks"],
    sources: [["Official patch notes", patches]]
  },
  {
    id: "about",
    title: "About and sources",
    summary: "About MzDunk’s community wiki, its references, and how to contribute.",
    sections: [
      ["MzDunk’s community wiki", "An independent reference for players of Microscape, the browser idle RPG by K3nt0456. The original village banner was generated for this site and is illustrative."],
      ["Reference data", "The catalog adapts the Miraheze Microscape Wiki’s indexes, tables and article facts. Each reference entry links to its source and revision history. The adapted reference data is available under Creative Commons Attribution-ShareAlike 4.0. The beta source snapshot was checked November 17, 2026. The guides also link to the official patch notes where they use them."],
      ["Contribute a correction", "Open an issue in the site repository. Include the article or item name, what you observed, and the patch date or an in-game tooltip so the change can be checked."]
    ],
    sources: [["Site repository and issue tracker", "https://github.com/ATritle/MicroscapeWiki"], ["Miraheze Microscape Wiki", wiki + "Main_Page"], ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"], ["Official game credits", official + "credits/"]]
  }
].map(guide => ({ category: "guides", ...guide }));
