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
    summary: "Search live buy/sell orders and understand delayed trades, escrow, cancellation, tax and order slots.",
    sections: [
      ["Get a Bazaar Invite", "Reach level 10 in any skill and claim The Journey Begins achievement to receive one Bazaar Invite. Holding the invite unlocks the Bazaar in the release client. Bazaar Permits increase offer slots and do not replace the invite."],
      ["What changed at release", "The Bazaar now processes buy and sell orders with delayed trading. The developer introduced this to reduce feeding materials to a chosen account. Players still choose their price and quantity, but competing players can participate. A cheap listing does not reserve its contents for a friend or another account."],
      ["Find an item and compare prices", "In the game, search the Bazaar or browse its categories. An item's market page shows sellers, buyers and recent trades. The lowest sell price is the cheapest current asking price; the highest buy price is the strongest current buy offer. Quantities beside those prices summarize that side of the market, rather than promising that every unit is available at the best price. Check the individual orders for their actual quantities and prices."],
      ["Create a sell order", "Choose Sell Items, select a tradable item you own, then enter a quantity and a price per item in coins. Review the total before confirming. The items are held in escrow while the order remains open, so they are unavailable for your other activities. The selling dialog displays a 5% tax."],
      ["Create a buy order", "Choose Buy Items, select the item, and enter the quantity and price per item you are offering. The game checks that you have enough coins for quantity multiplied by price. Coins are held in escrow while the order is open. For example, 100 items at 10 coins each requires 1,000 coins before posting."],
      ["Clicking an existing order", "Selecting another player's listing opens a confirmation to create an order on the opposite side, with its price and remaining quantity filled in. You still review and place your own order. This does not immediately buy from that particular person or guarantee them as your trading partner."],
      ["Matching and trade times", "A matched indicator means the market found a compatible buyer or seller. The individual order page displays its scheduled trade time, while My Orders shows a countdown to your next trade. These are server-supplied times. A match is not a completed transaction: check History for trades that have actually executed. Orders can fill in parts, with the remaining quantity continuing on the market."],
      ["Cancellation and the waiting period", "The confirmation warns that a new order may be committed for up to 30 minutes. If the game permits immediate cancellation, untraded escrow returns straight away. Otherwise, cancellation is scheduled for the time shown in the dialog, and the order stays available to trade until then. Cancelling does not reverse completed trades. A pending cancellation can be undone through the order's controls."],
      ["Automatic cancellation or leaving an order open", "When placing an order, choose whether to leave the unfilled remainder listed or cancel it automatically at the displayed cutoff. Automatic cancellation returns untraded items for sell orders or unspent coins for buy orders. This setting does not guarantee a fill by that time."],
      ["Editing a committed order", "While immediate cancellation is unavailable, the client blocks lowering the remaining quantity. It also blocks raising a sell price or lowering a buy price. A seller can improve an offer by lowering the price, and a buyer can improve it by raising the price; quantity can increase if the additional items or coins are available. Use the cancellation controls for changes that the edit dialog does not allow."],
      ["Tax and vendor comparisons", "The sell-order screen shows 5% tax. Account for that when comparing a Bazaar sale with selling to an NPC vendor. The client warns when your asking price is at or below that item's listed vendor value. Vendor value, a shop's retail price, the market reference price and current player orders are different figures. Exact tax rounding and the server's final settlement-price calculation are not confirmed by the public client."],
      ["Order slots and permits", "Characters start with six open-order slots. Adventurer's Guild membership adds five. Each Bazaar Permit adds one slot, with a maximum of four permits held: up to 10 slots without membership or 15 with it. Buying and selling share the slot total. You can have one open buy order and one open sell order for a particular item. Brother Alep at Falcrest Reach Temple exchanges 15 Audience Favor for one permit."],
      ["What this wiki's live market shows", "Search the live Bazaar here to see public market summaries, individual buy and sell orders, and recent completed trades from Microscape. Live orders refresh every 30 seconds while the page is visible. Our own scheduled Cloudflare collector records the game's public market every 15 minutes; the page checks that history every five minutes. It keeps 15-minute samples for 14 days and daily averages for 400 days, plus lifetime recorded lows. Charts for 24 hours and 7 days use individual samples; longer charts use daily averages. The 7/30-day summaries use UTC calendar days. Our history begins on the displayed collection date, with no imported earlier prices. Lowest sell-order prices are observations, not a complete record of completed trades or prices between checks. A missing price is a dash, not zero. The watchlist saves item bookmarks only in your browser and does not send alerts. All buying, selling, editing and cancellation still happen inside Microscape."],
      ["What is not confirmed", "The public client does not expose the server's exact matching priority, tie-breaking rules or settlement-price algorithm. A highlighted deal or a suggested price is not a promise of profit or execution. The developer mentioned possible future support for giveaways and some faster trades, but those plans are not evidence that such features are available now."]
    ],
    facts: [["System checked", "November 20, 2026"], ["Selling tax shown", "5%"], ["Base order slots", "6"], ["Membership slots", "+5"], ["Maximum permits", "4"]],
    related: ["bazaar-invite", "bazaar-permit", "item-audience-favor", "falcrest-reach-temple", "getting-started", "vendor"],
    sources: [["November 19 launch trading rules", patches], ["Archived factual Bazaar mechanics · November 20", "./assets/game-data/bazaar-2026-11-20.json"], ["Current official game and Bazaar", official + "play/"]]
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
    summary: "Look up a player and choose a skill to fill current level and XP, or enter values manually to calculate XP and actions to your target level.",
    calculator: true,
    sections: [
      ["Fill from a player profile", "Start typing an in-game or Twitch username and select a matching name, or enter the full username and select Look up player. Choose a skill and your current level and exact XP fill automatically. If your target is below your current level, it moves to the next level. Profile values are a snapshot; look up again to refresh them. Target level and XP per action remain yours to choose, and every calculator field can still be edited manually."],
      ["Experience curve", "The October 6 patch adopted the Old School RuneScape experience thresholds multiplied by ten. Enter a start level and a target level to see the total required. If you know the XP per action, enter it to estimate how many actions you need. Enter your exact current XP to account for progress through your current level."],
      ["Compare training activities", "Open Activity Comparison from Resources in the left panel. Enter a player’s username, choose a skill and select two activities in that skill. The tool compares training rates using the reported base levels and equipped gear. Check the displayed timing assumptions and requirements before using an estimate."]
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
      ["Contribute a correction", "Share corrections with MzDunk’s community. Include the article or item name, what you observed, and the patch date or an in-game tooltip so the change can be checked."]
    ],
    sources: [["MzDunk’s community", "https://www.twitch.tv/mzdunk"], ["Archived beta game data · November 18, 2026", "./assets/game-data/beta-2026-11-18.json"], ["Miraheze Microscape Wiki", wiki + "Main_Page"], ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0/"], ["Official game credits", official + "credits/"]]
  }
].map(guide => ({ category: "guides", ...guide,
  sources:[...(guide.sources||[]), ...((guide.sources||[]).some(([,url])=>url==="./assets/game-data/release-2026-11-19.json")?[]:[["Archived release game data · November 19, 2026", "./assets/game-data/release-2026-11-19.json"]])]
}));
