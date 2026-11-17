const official = "https://microscape.cc/";
const patches = "https://microscape.cc/patch-notes/";
const wiki = "https://microscape.miraheze.org/wiki/";
const twitchPoints = "https://help.twitch.tv/s/article/viewer-channel-point-guide?language=en_US";

const findStreams = "Open Streams in Microscape to see live Twitch communities. Choose a channel with Microscape enabled and open it on Twitch. Sending a chat message or redeeming a Microscape Channel Points reward counts as participation for Energy. Check Journal → History → Energy for the award after the next check.";
const streamEnergyRates = "The badge shows how much in-game playtime you earn per hour of eligible viewing. 1.2× is 72 minutes of Energy per hour; 1.3× is 78 minutes per hour. Regular Microscape streams show 1.2×, and Member streams normally show 1.3×. Long-running streams have lower rates and skip the daily Energy bonus. Select the badge for details. These rates apply to in-game Energy; Twitch Channel Points and Audience Favor are separate.";

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
    summary: "Find a live Twitch community, understand the Energy rate beside its name, and check your earnings.",
    sections: [
      ["Find a Twitch community in Streams", findStreams],
      ["What 1.2× and 1.3× Energy mean", streamEnergyRates],
      ["If an activity stops", "Check for an Energy runout event in the Journal. Then review the activity for exhausted materials, ammunition, runes or food. For a dungeon run, also examine its entry or chamber requirements."],
      ["Redeem Channel Points for Energy", "Open the Channel Points menu below Twitch chat. Look for Microscape rewards such as I’m lurkin’ n scapin’, +6hr for Me, or +1hr for All. The first counts as participation; the other two grant bonus Energy to you or the community, respectively. A streamer can rename or disable rewards, so read the description and point cost before redeeming."]
    ],
    related: ["getting-started", "activity-queue", "audience-favor"],
    sources: [["Microscape game: Streams and Journal", official + "play/"], ["Twitch Channel Points viewer guide", twitchPoints], ["Energy reference on Miraheze", wiki + "Energy"]]
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
    summary: "Find live Drop Festivals in Streams, redeem Claim Drop on Twitch, and earn Favor without Channel Points through achievements.",
    sections: [
      ["Find an active Drop Festival in Streams", "Open Streams in Microscape and look for a live channel marked at Drop Festival or with a combined Drop & Dungeon badge. Depending on your Streams view, festivals may appear under Events. A Drop Festival runs for five hours. Select the channel to open Twitch or select the event timer for more details."],
      ["How many Channel Points does Claim Drop cost?", "In the festival channel, open the Channel Points menu below Twitch chat and look for the temporary Claim Drop reward. Read the point cost on its tile before you redeem; the in-game manual does not list a numeric price. If the reward was renamed, look for Audience Favor in the description. You need enough points in that specific channel, because Twitch Channel Points don’t transfer between channels. Redeem before the festival ends."],
      ["Check that your Favor arrived", "In Microscape, open Journal → History and select Audience Favors. Look for a Drop festival entry with the channel name and the amount awarded. If you don’t see it, check whether Twitch accepted the redemption and whether you used the Twitch account connected to your character."],
      ["Earn Favor without Twitch Channel Points", "Open the Tome of Knowledge → Achievements to see which goals award Favor. The Journey Begins gives 3 Favor for reaching level 10 in any skill; Awakening Power gives 6 for your first ability limit break. You can also visit Brother Pela at Falcrest Reach Temple. His Time for a Favor exchange requires Piety 1 and trades 1 Time Crystal for 1 Favor."],
      ["Find Energy rewards in Streams", findStreams + " Rewards like +6hr for Me and +1hr for All add Energy. Claim Drop grants Favor, and Claim Dungeon Key grants a key."],
      ["What 1.2× and 1.3× Energy mean", streamEnergyRates],
      ["Spend Favor", "Mork sells pet maps for 10 Favor in Fellroot Swamp Hut. Otis’s maps cost 15 Favor and require Adventurer’s Guild membership. At Falcrest Reach Temple, Brother Alep exchanges 3 Favor for a Time Crystal or 15 for a Bazaar Permit."]
    ],
    related: ["item-audience-favor", "energy", "pets", "fellroot-swamp-hut", "falcrest-reach-temple"],
    sources: [["Microscape game: Streams, Channel Points manual and Achievements", official + "play/"], ["October 6 patch notes", patches], ["Twitch Channel Points viewer guide", twitchPoints]]
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
