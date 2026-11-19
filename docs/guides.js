import {releaseGuide} from "./release-guide.js?v=release-20261119";
const official = "https://microscape.cc/";
const patches = "https://microscape.cc/patch-notes/";
const wiki = "https://microscape.miraheze.org/wiki/";
const twitchPoints = "https://help.twitch.tv/s/article/viewer-channel-point-guide?language=en_US";

const lurkPrice = "The lurk reward price varies by stream and usually costs 1–10 Channel Points.";
const findStreams = "Open Streams in Microscape to see live Twitch communities. Choose a channel with Microscape enabled and open it on Twitch. Sending a chat message or redeeming a Microscape Channel Points reward counts as participation for Energy. Check Journal → History → Energy for the award after the next check.";
const streamEnergyRates = "The badge shows how much in-game playtime you earn per hour of eligible viewing. 1.2× is 72 minutes of Energy per hour; 1.3× is 78 minutes per hour. Regular Microscape streams show 1.2×, and Member streams normally show 1.3×. Long-running streams have lower rates and skip the daily Energy bonus. Select the badge for details. These rates apply to in-game Energy; Twitch Channel Points and Audience Favor are separate.";

export const guides = [
  releaseGuide,
  {
    id: "getting-started",
    title: "Getting started",
    summary: "Begin on Tutabay Atoll, learn the first skills, and get a ticket to Progryn.",
    sections: [
      ["Sign in and find a stream", "Open Microscape and sign in with Twitch. Find a channel that has enabled the game. Your character follows you between participating channels. Open the in-game Journal to see whether Energy is arriving before starting a long activity."],
      ["Begin on Tutabay Atoll", "New characters start on Tutabay Atoll. Jaciens sells a Training Pickaxe for 7 coins and a Training Fishing Rod for 4 coins. Mine Copper Ore, trade one Copper Ore for one Tin Ore with Lucille, and use the furnace and anvil to try Smithing. Equip your first weapon or tool and claim its achievement for 3 Audience Favor."],
      ["Build a food supply", "Catch shrimp at a Small Net Spot on Tutabay Atoll and cook them at the fire. Equip the cooked food before trying combat. Watch the first few fights so you can check food use and damage taken."],
      ["Sail to Progryn", "Defeat Island Rodents for a Rodent Pelt (1 in 2 per kill). Thomas exchanges one Rodent Pelt or one Bronze Dagger for a Ticket to Progryn. Use the island boat to sail to Fencewell Bridge; the trip consumes one ticket. The boat at Fencewell Bridge can take you back to Tutabay Atoll."],
      ["Unlock the Bazaar", "Reach level 10 in any skill and claim The Journey Begins achievement for a Bazaar Invite. The invite unlocks trading; a Bazaar Permit is a separate item that adds an offer slot."],
      ["Pick a useful second skill", "Fishing supplies Cooking. Woodcutting supplies Firemaking and Fletching. Mining supplies Smithing. Follow one pair at first so the resources from your gathering activity serve your next task."],
      ["Before leaving the game idle", "Check Energy, available loot space and the materials your activity spends. In combat, check food and the arrows or runes your loadout uses. Open Activity & Loot when you return to find out what your character collected."]
    ],
    related: ["tutabay-atoll", "island-rodent", "ticket-to-progryn", "energy", "fencewell-bridge", "fishing", "combat", "release-changes"],
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
      ["Redeem Channel Points for Energy", "Open the Channel Points menu below Twitch chat. Look for Microscape rewards such as I’m lurkin’ n scapin’, +6hr for Me, or +1hr for All. The first counts as participation; the other two grant bonus Energy to you or the community, respectively. " + lurkPrice + " A streamer can rename or disable rewards, so read the description and point cost before redeeming."]
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
      ["Start with the encounter", "The Sump is home to Gurgle. Its battle shows your progress through three splits. King Onyx Dragon now has 2,790 HP in the release definition. Follow phase cues and review the current foe record before committing supplies."],
      ["Spend coins inside the boss lairs", "The Rusty Chest in The Sump exchanges 16 Rusty Coins for Rubber Boots, 128 for Fletcher’s Cloak or 256 for a Wedding Band. The Bloodied Chest in Havendell Lair and Scorched Chest in King Onyx Dragon’s lair offer their own fixed rewards. Each exchange requires Piety 1. See the location and coin pages for full costs. The beta Jester’s Pouch coin exchanges were removed."]
    ],
    related: ["the-sump", "gurgle", "king-onyx-dragon", "havendell-lair", "rusty-coin", "bloodied-coin", "scorched-coin", "combat", "activity-queue", "release-changes"],
    sources: [["September 21, September 30 and October 28 patch notes", patches], ["Gurgle reference on Miraheze", wiki + "Foe/Gurgle"]]
  },
  {
    id: "bazaar",
    title: "Bazaar and trading",
    summary: "Use buy orders and sell offers, then confirm prices and quantities before posting.",
    sections: [
      ["Get a Bazaar Invite", "Reach level 10 in any skill and claim The Journey Begins achievement to receive one Bazaar Invite. Holding the invite unlocks the Bazaar in the release client. Bazaar Permits increase offer slots and do not replace the invite."],
      ["Release trading rules", "The developer’s November 19 notes say the Bazaar restricts targeted trading while allowing players to choose prices and quantities. Other players get a fair opportunity to take listings. Review the live offer dialog for matching, fees and completion timing."],
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
      ["Login and resource queues are different", "Queued for login appears before you connect. The game keeps your queue ticket and checks again at intervals supplied by the server. Once inside, a resource queue means all usable spots at an activity are occupied. The developer’s launch notes confirm that resource queues are intentional. These are separate from the member activity queue described below."],
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
      ["Claim Drop: 400 points for 1 Audience Favor", "The player-reported price is 400 Twitch Channel Points during an active Drop Festival. A successful claim awards 1 Audience Favor. Open the Channel Points menu below Twitch chat and check the Claim Drop tile for the price before redeeming. If the reward was renamed, look for Audience Favor in its description."],
      ["Get 300 Channel Points for following", "The first time you follow a Twitch channel with Channel Points enabled, Twitch credits 300 points to that channel’s balance. If you started at zero, that leaves 100 more points to earn toward a 400-point Claim Drop. Watch the stream and collect any bonus points Twitch offers. Points stay with the channel where you earned them."],
      ["Check that your Favor arrived", "In Microscape, open Journal → History and select Audience Favors. Look for a Drop festival entry with the channel name and +1. If you don’t see it, check whether Twitch accepted the redemption and whether you used the Twitch account connected to your character."],
      ["Earn Favor without Twitch Channel Points", "Open the Tome of Knowledge → Achievements. Equipping your first weapon or tool now awards 3 Favor; Awakening Power gives 6 for your first ability limit break. The Journey Begins instead gives a Bazaar Invite for reaching level 10 in any skill. Brother Pela at Falcrest Reach Temple trades 1 Time Crystal for 1 Favor at Piety 1."],
      ["Dungeon Key and lurk rewards", "Claim Dungeon Key has a player-reported price of 2,000 Channel Points during a Dungeon Key event. I’m Lurkin’ n scapin’ counts as participation for Energy. " + lurkPrice + " Check the reward tile in Twitch chat for the exact cost."],
      ["Find Energy rewards in Streams", findStreams + " Rewards like +6hr for Me and +1hr for All add Energy."],
      ["What 1.2× and 1.3× Energy mean", streamEnergyRates],
      ["Spend Favor", "At Fellroot Swamp Hut, Mork’s new skilling-pet maps cost 10 Favor and his original skilling-pet maps cost 20. Beatrix and Scales maps remain 10. Otis’s maps cost 15 and require Adventurer’s Guild membership to obtain the pet. At Falcrest Reach Temple, Brother Alep exchanges 3 Favor for a Time Crystal or 15 for a Bazaar Permit."]
    ],
    related: ["item-audience-favor", "energy", "pets", "fellroot-swamp-hut", "falcrest-reach-temple"],
    sources: [["Microscape game: Streams, Journal, Channel Points manual and Achievements", official + "play/"], ["October 6 patch notes", patches], ["Twitch Channel Points viewer guide", twitchPoints]]
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
    summary: "Read the November 19 launch highlights and the beta updates behind this wiki’s first edition.",
    sections: [
      ["November 19 • Microscape launches!", "The launch servers are live. Characters start fresh, with no further progress wipes planned; serious bugs may still require rollbacks. Tutabay Atoll is the new starting area. New pets, boss and equipment balance changes, new dungeon coin chests and revised crafting actions are documented in the November 19 release changes guide. Resource queues remain intentional, and the client also supports a login queue. Bazaar changes limit targeted trading while allowing sellers to choose prices and quantities."],
      ["November 12 • The King’s Jubilee", "The King of O’Rock celebrated the closing beta with a party and goodie bags."],
      ["October 28 • Item and ability updates", "The hatchet became the logging axe and slag became dross. Equipment swaps and potions began taking effect immediately during combat. The patch revised several ability effects and investment counts."],
      ["October 21 and October 6 • Rebalance", "The patches changed recipes, XP rates, several spells, ability breakpoints and the experience curve. Use the original dates when comparing beta observations."]
    ],
    related: ["release-changes", "getting-started", "experience", "limit-breaks"],
    sources: [["Official patch notes", patches]]
  },
  {
    id: "about",
    title: "About and sources",
    summary: "About MzDunk’s community wiki, its references, and how to contribute.",
    sections: [
      ["MzDunk’s community wiki", "An independent reference for players of Microscape, the browser idle RPG by K3nt0456. The original village banner was generated for this site and is illustrative."],
      ["Reference data", "The catalog adapts the Miraheze Microscape Wiki’s indexes, tables and article facts, with source and revision-history links. Adapted reference data is available under Creative Commons Attribution-ShareAlike 4.0. The saved November 18 beta was compared with the public November 19 release client. Current definitions, recipes, drops, pet odds, skills, maps and artwork were refreshed from that capture. Durable factual snapshots preserve evidence when hashed client filenames disappear. Disabled recipes and removed beta items are labeled historical; deprecated recipes and unconfirmed sources remain explicit. Server-only rules require separate confirmation."],
      ["Contribute a correction", "Open an issue in the site repository. Include the article or item name, what you observed, and the patch date or an in-game tooltip so the change can be checked."]
    ],
    sources: [["Site repository and issue tracker", "https://github.com/ATritle/MicroscapeWiki"], ["Archived beta game data · November 18, 2026", "./assets/game-data/beta-2026-11-18.json"], ["Miraheze Microscape Wiki", wiki + "Main_Page"], ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"], ["Official game credits", official + "credits/"]]
  }
].map(guide => ({ category: "guides", ...guide,
  sources:[...(guide.sources||[]), ...((guide.sources||[]).some(([,url])=>url==="./assets/game-data/release-2026-11-19.json")?[]:[["Archived release game data · November 19, 2026", "./assets/game-data/release-2026-11-19.json"]])]
}));
