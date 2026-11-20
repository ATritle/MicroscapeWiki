import {compareCombat, equipmentBonuses} from "./combat-comparison.js?v=vendors-20261120";

let catalogRequest;
export function readActivityCatalog() {
  catalogRequest ||= fetch(new URL("./activity-catalog.json?v=activity-order-20261120", import.meta.url)).then(async response => {
    if (!response.ok) throw Error("The activity catalog could not load. Please try again.");
    const data = await response.json();
    if (data.schemaVersion !== 1 || !Array.isArray(data.activities)) throw Error("The activity catalog is incomplete.");
    return data;
  }).catch(error => {catalogRequest = null; throw error;});
  return catalogRequest;
}

export function activitiesForSkill(catalog, skill) {
  return catalog.activities.filter(activity => activity.skill === skill)
    .sort((a, b) => Number(!!a.otherActivity) - Number(!!b.otherActivity)
      || (a.sortLevel ?? a.level) - (b.sortLevel ?? b.level));
}
export function validateActivityPair(catalog, skill, firstId, secondId) {
  const rows = [firstId, secondId].map(id => catalog.activities.find(activity => activity.id === id));
  if (rows.some(activity => !activity || activity.skill !== skill)) throw Error("Choose two activities from the same skill.");
  if (firstId === secondId) throw Error("Choose a different second activity to compare.");
  return rows;
}
export function compareSkilling(levels, bonuses, activities, {prepSeconds = 8, modelDoubleUps = false, repeatSeconds = 4} = {}) {
  if (!Number.isFinite(prepSeconds) || prepSeconds < 0 || prepSeconds > 3600 || !Number.isFinite(repeatSeconds) || repeatSeconds < 0 || repeatSeconds > 3600) throw Error("Use delays from 0 to 3,600 seconds.");
  return activities.map(activity => {
    const level = levels[activity.skill] || 1;
    const effectiveLevel = level + (bonuses[activity.skill] || 0);
    const doubleChance = Math.min(100, Math.max(0, effectiveLevel - activity.level)) / 100;
    const baseSeconds = activity.duration * 2 + prepSeconds;
    const cycleSeconds = baseSeconds + (modelDoubleUps ? doubleChance * repeatSeconds : 0);
    const xpPerCycle = activity.exp * (modelDoubleUps ? 1 + doubleChance : 1);
    return {...activity, levelMet:level >= activity.level, effectiveLevel, doubleChance,
      baseSeconds, cycleSeconds, xpPerCycle, xpPerHour:xpPerCycle * 3600 / cycleSeconds};
  });
}

export function rankActivityRates(rows) {
  if (rows.some(row => row.unsupported)) return {status:"unsupported"};
  const [best, other] = [...rows].sort((a, b) => b.xpPerHour - a.xpPerHour);
  const tied = Math.abs(best.xpPerHour - other.xpPerHour) < 1e-7;
  return {status:rows.some(row => row.levelMet === false || row.membershipMet === false) ? "theoretical" : "ready", best, tied,
    lead:other.xpPerHour > 0 ? (best.xpPerHour / other.xpPerHour - 1) * 100 : null};
}

export function renderActivityComparison({e, player, levels, catalog, byId, entryUrl, renderSpriteFrame, preferences}) {
  const loadoutKey = player.name.toLowerCase() + ":" + (player.equipment.weapon || "unarmed");
  if (preferences.loadoutKey !== loadoutKey) delete preferences.attackSeconds;
  preferences.loadoutKey = loadoutKey;
  const bonuses = equipmentBonuses(player.equipment, catalog.items);
  const fmt = (number, digits = 1) => Number.isFinite(number) ? new Intl.NumberFormat("en", {maximumFractionDigits:digits}).format(number) : "Unavailable";
  const pct = number => fmt(number * 100) + "%";
  const wikiLink = (label, id, attrs = {}) => id && byId.has(id) ? e("a", {href:entryUrl(id), ...attrs}, label) : e("span", attrs, label);
  const itemName = id => catalog.items[id]?.name || id;
  const metric = (label, value) => e("div", {}, e("dt", {}, label), e("dd", {}, value));
  const orderedSkills = [...catalog.skills];
  const skillSelect = e("select", {id:"comparison-skill"}, ...orderedSkills.map(skill => e("option", {value:skill.id}, skill.name)));
  skillSelect.value = preferences.skill || "attack";
  const firstSelect = e("select", {id:"comparison-first", required:""});
  const secondSelect = e("select", {id:"comparison-second", required:""});
  const panel = e("section", {class:"player-panel training-comparison activity-comparison", "aria-labelledby":"training-comparison-heading"},
    e("div", {class:"player-panel-heading"}, e("h2", {id:"training-comparison-heading"}, "Choose your activities"), e("span", {class:"training-estimate-badge"}, "Estimate")),
    e("p", {class:"training-intro"}, "Compare two activities using " + player.name + "’s reported levels and equipped gear. The second activity always uses the same skill as the first."));
  const selectors = e("div", {class:"training-controls activity-selectors"},
    e("label", {for:"comparison-skill"}, "Skill / activity type", skillSelect),
    e("label", {for:"comparison-first"}, "First activity", firstSelect),
    e("label", {for:"comparison-second"}, "Second activity", secondSelect));
  const settings = e("div", {class:"comparison-settings"});
  const output = e("div", {class:"training-output", "aria-live":"polite"});
  const calculate = e("button", {type:"submit", class:"button primary"}, "Calculate comparison");
  const controls = e("form", {class:"activity-comparison-form"}, selectors, settings, calculate);
  const assumptions = e("details", {class:"training-assumptions"}, e("summary", {}, "How this estimate works"));
  panel.append(controls, output, assumptions);
  let fields = {};
  const field = (id, title, value, help, min = 0) => {
    const input = e("input", {id, type:"number", min:String(min), max:"3600", step:"any", inputmode:"decimal", value:String(value)});
    return {input, label:e("label", {for:id}, title, input, e("small", {}, help))};
  };
  function fillActivities(reset = false) {
    const activities = activitiesForSkill(catalog, skillSelect.value);
    const combat = catalog.skills.find(s => s.id === skillSelect.value)?.combat;
    const optionFor = activity => {
      const locked = !combat && (levels[skillSelect.value] || 1) < activity.level;
      const displayLevel = combat ? activity.combatLevel : activity.level;
      return e("option", {value:activity.id}, activity.name + " · Lv " + displayLevel + (locked ? " · locked" : ""));
    };
    for (const select of [firstSelect, secondSelect]) select.replaceChildren(...activities.map(optionFor));
    const defaultFirst = activities.find(a => a.mob === "mouse") || activities[0];
    const defaultSecond = activities.find(a => a.mob === "chicken") || activities[1];
    firstSelect.value = !reset && activities.some(a => a.id === preferences.firstId) ? preferences.firstId : defaultFirst?.id || "";
    secondSelect.value = !reset && activities.some(a => a.id === preferences.secondId) ? preferences.secondId : defaultSecond?.id || "";
    if (secondSelect.value === firstSelect.value) secondSelect.value = activities.find(a => a.id !== firstSelect.value)?.id || "";
    syncSecondOptions();
    buildSettings();
  }
  function syncSecondOptions() {
    for (const option of secondSelect.options) option.disabled = option.value === firstSelect.value;
    if (secondSelect.value === firstSelect.value) secondSelect.value = [...secondSelect.options].find(option => !option.disabled && option.value === preferences.firstId)?.value
      || [...secondSelect.options].find(option => !option.disabled)?.value || "";
  }
  function buildSettings() {
    const combat = catalog.skills.find(s => s.id === skillSelect.value)?.combat;
    fields = {};
    if (combat) {
      const prep = field("comparison-prep", "Between fights (seconds)", preferences.prepSeconds ?? 6, "6s starts as an editable assumption.");
      const interval = field("comparison-interval", "Attack interval (seconds)", preferences.attackSeconds ?? (bonuses.attackCooldown ?? 4) * 2, "Starts with the equipped weapon’s base interval.", .000001);
      const rolls = e("select", {id:"comparison-rolls"}, e("option", {value:"positive"}, "1 to maximum hit"), e("option", {value:"zero"}, "0 to maximum hit"));
      rolls.value = preferences.includeZero ? "zero" : "positive";
      fields = {prep:prep.input, interval:interval.input, rolls};
      settings.replaceChildren(e("details", {class:"comparison-adjustments"}, e("summary", {}, "Timing assumptions"),
        e("div", {class:"training-controls"}, prep.label, interval.label,
          e("label", {for:"comparison-rolls"}, "Successful-hit damage roll", rolls, e("small", {}, "Uniform roll; server rule unverified.")))));
      if (skillSelect.value === "evilMagic") {
        const spell = e("select", {id:"comparison-spell"}, ...catalog.spells.map(s => e("option", {value:s.id}, s.name + " · Lv " + s.level + " · max " + s.maxHit + ((levels.evilMagic || 1) < s.level ? " · locked" : ""))));
        spell.value = catalog.spells.some(s => s.id === preferences.spellId) ? preferences.spellId : catalog.spells[0]?.id || "";
        fields.spell = spell;
        settings.prepend(e("div", {class:"training-controls comparison-spell-control"}, e("label", {for:"comparison-spell"}, "Spell to model", spell,
          e("small", {}, "Choose the spell you can cast. Learned spell unlocks and rune supplies are not public."))));
      }
    } else {
      const prep = field("comparison-skill-prep", "Preparation per action (seconds)", preferences.skillPrepSeconds ?? 8, "Default 8s matches the game’s displayed duration.");
      const repeat = field("comparison-repeat", "Bonus-action delay (seconds)", preferences.repeatSeconds ?? 4, "Default 4s follows the two-tick double-up timing.");
      const doubles = e("select", {id:"comparison-doubles"}, e("option", {value:"base"}, "Base rates · no bonus actions"), e("option", {value:"estimate"}, "Estimate one bonus action"));
      doubles.value = preferences.modelDoubleUps ? "estimate" : "base";
      fields = {prep:prep.input, repeat:repeat.input, doubles};
      settings.replaceChildren(e("details", {class:"comparison-adjustments"}, e("summary", {}, "Timing and double-up assumptions"),
        e("div", {class:"training-controls"}, prep.label, e("label", {for:"comparison-doubles"}, "Double-ups", doubles,
          e("small", {}, "Base rates exclude bonus XP; your chance is shown below.")), repeat.label)));
    }
    for (const control of Object.values(fields)) control.addEventListener("input", update);
  }
  function readSettings() {
    for (const control of Object.values(fields)) if (!control.validity.valid || (control.type === "number" && control.value.trim() === "")) throw Error("Enter valid timing values in the assumptions section.");
    const combat = catalog.skills.find(s => s.id === skillSelect.value)?.combat;
    if (combat) return {prepSeconds:Number(fields.prep.value), attackSeconds:Number(fields.interval.value),
      includeZero:fields.rolls.value === "zero",
      spellId:fields.spell?.value};
    return {skillPrepSeconds:Number(fields.prep.value), repeatSeconds:Number(fields.repeat.value), modelDoubleUps:fields.doubles.value === "estimate"};
  }
  function activityHeader(activity) {
    const foe = activity.mob && catalog.foes[activity.mob], page = foe && byId.get(foe.wikiId);
    const art = page?.sprites?.[0] ? wikiLink(renderSpriteFrame(page.sprites[0]), page.id, {"aria-label":foe.name + " foe details"})
      : activity.icon ? e("img", {src:activity.icon, alt:"", width:56, height:56, class:"comparison-activity-icon", loading:"lazy", referrerpolicy:"no-referrer"}) : null;
    return e("div", {class:"training-foe-heading"}, ...(art ? [art] : []), e("div", {},
      wikiLink(activity.name, foe?.wikiId || activity.wikiId), e("span", {}, foe ? foe.hp + " HP" : "Requires " + catalog.skills.find(s => s.id === activity.skill).name + " " + activity.level)));
  }
  function locations(activity) {
    const where = activity.mob ? catalog.foes[activity.mob]?.locations || [] : activity.locations || [];
    if (!where.length) return e("p", {class:"comparison-location"}, "Location: see the linked compendium entry for access details.");
    return e("p", {class:"comparison-location"}, "Train at: ", ...where.flatMap((location, index) => [...(index ? [", "] : []), wikiLink(location.name, location.wikiId)]));
  }
  function requirements(activity) {
    const nodes = [];
    const required = activity.mob ? catalog.foes[activity.mob]?.requiredItem : null;
    if (required) nodes.push(e("p", {class:"comparison-requirements"}, "Encounter item: ", wikiLink(itemName(required), catalog.items[required]?.wikiId), ". Inventory is not public."));
    if (activity.inputs?.length) nodes.push(e("p", {class:"comparison-requirements"}, "Per action: ", ...activity.inputs.flatMap((item, i) => [
      ...(i ? [", "] : []), fmt(item.amount) + " × ", wikiLink(itemName(item.id), catalog.items[item.id]?.wikiId)]), ". Supplies are not checked."));
    if (activity.requiresAbility) nodes.push(e("p", {class:"comparison-requirements"}, "Requires ability: " + activity.requiresAbility + ". Learned abilities are not public."));
    if (activity.requiresMembership) nodes.push(e("p", {class:"comparison-requirements"}, "Membership required."));
    if (activity.singleExecution) nodes.push(e("p", {class:"comparison-requirements"}, "Single-execution activity: sustained XP/hour is only a theoretical rate."));
    return nodes;
  }
  function recommendation(rows, settings, combat) {
    const ranked = rankActivityRates(rows);
    if (ranked.status === "unsupported") return e("div", {class:"training-recommendation"}, e("strong", {}, "A reliable rate comparison is unavailable"),
      e("p", {}, "One selected encounter has special mechanics or an unmet requirement. Its stats are shown, but the basic combat model cannot rank these activities."));
    const {best, tied, lead} = ranked;
    const title = best.xpPerHour <= 0 ? "No XP-producing damage in this model" : tied ? "Estimated XP rates are tied"
      : best.name + " leads this model" + (lead === null ? "" : " by " + fmt(lead) + "%");
    const theoretical = ranked.status === "theoretical";
    return e("div", {class:"training-recommendation"}, e("span", {class:"player-eyebrow"}, theoretical ? "THEORETICAL COMPARISON · REQUIREMENT NOT MET" : combat ? "BEFORE FOOD & BANKING" : "BEFORE SUPPLY GATHERING & BANKING"),
      e("strong", {}, title), ...(theoretical ? [e("p", {}, "The comparison includes an activity or spell above this player’s level, or an unmet membership requirement. Rates are shown for planning; the option remains locked in the game.")] : []),
      e("p", {}, combat ? (rows[0].xpRateStatus === "observed" ? "XP/hour uses the observed Attack baseline of " + rows[0].xpPerDamage + " XP per damage. "
        : "The XP conversion for " + (catalog.skills.find(skill => skill.id === rows[0].xpSkill)?.name || rows[0].xpSkill) + " is unverified; this estimate assumes " + rows[0].xpPerDamage + " XP per damage. ")
        + "Food use, survival and XP-granting abilities can change actual rates."
        : settings.modelDoubleUps ? "This estimate includes one bonus action per double-up, using your selected delay." : "Base XP/hour uses the listed XP and duration. Your double-up chance is shown separately and is excluded from this rate."));
  }
  function update() {
    try {
      const activities = validateActivityPair(catalog, skillSelect.value, firstSelect.value, secondSelect.value);
      const skill = catalog.skills.find(s => s.id === skillSelect.value);
      const config = readSettings();
      Object.assign(preferences, config, {skill:skill.id, firstId:firstSelect.value, secondId:secondSelect.value});
      let rows, intro;
      if (skill.combat) {
        const spell = catalog.spells.find(s => s.id === config.spellId);
        const foes = activities.map(a => catalog.foes[a.mob]);
        rows = compareCombat(levels, bonuses, foes, {...config, skill:skill.id, spellMaxHit:spell?.maxHit});
        const weapon = catalog.items[player.equipment.weapon];
        const wrongWeapon = skill.id === "ranged" ? !weapon?.tags.includes("bow") : ["attack", "strength", "defense"].includes(skill.id) && weapon?.tags.includes("bow");
        rows = rows.map((row, i) => {
          const reason = foes[i].special ? "Boss, scaling or persistent encounter: a basic solo rate is unavailable."
            : foes[i].safeSpot && !["ranged", "evilMagic"].includes(skill.id) ? "This safe spot needs Ranged or Evil Magic."
            : wrongWeapon ? skill.id === "ranged" ? "This player has no bow equipped for Ranged training." : "This player has a bow equipped; choose Ranged or use melee equipment." : null;
          return {...row, name:activities[i].name, unsupported:!!reason, unsupportedReason:reason,
            levelMet:!spell || (levels.evilMagic || 1) >= spell.level,
            lockReason:spell && (levels.evilMagic || 1) < spell.level ? spell.name + " requires Evil Magic " + spell.level + "; the player is level " + (levels.evilMagic || 1) + ". Rates are theoretical." : null};
        });
        intro = skill.name + " training · Attack " + (levels.attack || 1) + " · Strength " + (levels.strength || 1) + " · Defense " + (levels.defense || 1)
          + (skill.id === "ranged" ? " · Ranged " + (levels.ranged || 1) : skill.id === "evilMagic" ? " · Evil Magic " + (levels.evilMagic || 1) + " · " + spell.name : "")
          + " · " + fmt(rows[0].attackSeconds) + "s attacks · Assumed " + fmt(config.prepSeconds) + "s between fights · Gear: " + (weapon?.name || "Unarmed");
        assumptions.replaceChildren(e("summary", {}, "How this estimate works"), e("ul", {},
          e("li", {}, "Hit chance and maximum hits use public client formulas. Dodge is the client’s melee defense check; it does not describe every enemy spell or special attack. Enemy maximum hits below are melee hits."),
          e("li", {}, "Automatic base XP is modeled as 4 XP per damage. One-damage melee hits awarding 4 Attack XP were directly observed on November 20, 2026. The same baseline is assumed for Strength, Defense, Ranged and Evil Magic; those conversions have not been independently measured. Learned XP bonuses and spell-specific extra XP are excluded."),
          e("li", {}, "The model uses independent uniform damage rolls, one full attack interval per swing including the first, and the entered delay between full-health enemies. Misses deal zero; overkill earns no extra XP in this model. These server rules need an in-game check."),
          e("li", {}, "Only reported base levels and item bonuses are included. Learned abilities, potions, pets’ abilities, spell modifiers, prayers, extra attacks, eating, deaths, travel and banking are excluded. Ranged and magic require ammunition or runes that cannot be checked from a public profile."),
          e("li", {}, "Bosses, scaling/persistent encounters, melee safe spots, and incompatible weapon styles are not ranked. Other enemies use a basic solo model; special phases and additional damage can change sustained results. Enemy level labels show combat level, not a required player level.")),
          e("a", {href:"./assets/game-data/combat-xp-2026-11-20.json", target:"_blank", rel:"noopener noreferrer"}, "Combat XP baseline observation"));
      } else {
        rows = compareSkilling(levels, bonuses, activities, {...config, prepSeconds:config.skillPrepSeconds})
          .map(row => ({...row, membershipMet:!row.requiresMembership || player.isMember}));
        intro = skill.name + " level " + (levels[skill.id] || 1) + " · Gear bonus " + (bonuses[skill.id] >= 0 ? "+" : "") + fmt(bonuses[skill.id] || 0)
          + " · Effective level " + fmt((levels[skill.id] || 1) + (bonuses[skill.id] || 0));
        assumptions.replaceChildren(e("summary", {}, "How this estimate works"), e("ul", {},
          e("li", {}, "Listed base XP and action duration come from the public game definitions. The default duration includes four preparation ticks of two seconds each, matching the game’s activity details."),
          e("li", {}, "Double-up chance is clamped to 0–100%: base skill level + equipment skill bonus − required level. Base rates exclude bonus actions. The optional double-up model assumes at most one bonus action, the same XP reward, and the entered extra delay. The default 4-second delay follows the two-tick timing in the official October 6 patch notes."),
          e("li", {}, "Required levels use the trained base level. Gear improves the displayed double-up chance and does not unlock a higher-level activity. Materials, learned abilities, completed unlocks and access to areas cannot be confirmed from the profile."),
          e("li", {}, "Rates assume continuous access to supplies and a spot. Time gathering ingredients, queueing, walking, banking and resupplying is excluded. Secondary skill XP is shown separately, and active ability effects or temporary boosts are excluded.")));
      }
      const cards = e("div", {class:"training-cards"}, ...rows.map((row, index) => {
        const activity = activities[index], card = e("div", {class:"training-foe-card"}, activityHeader(activity));
        if (skill.combat) {
          card.append(e("dl", {}, metric("Your hit chance", pct(row.hitChance)), metric("Your melee dodge chance", pct(row.dodgeChance)),
            metric("XP conversion", row.xpPerDamage + " XP/damage · " + row.xpRateStatus),
            metric("Your maximum hit", fmt(row.maxHit)), metric("Enemy max melee hit", fmt(row.enemyMaxHit)),
            metric("Estimated kill cycle", row.unsupported ? "Not modeled" : fmt(row.cycleSeconds) + "s"),
            metric("Estimated damage/hour", row.unsupported ? "Not modeled" : fmt(row.damagePerHour)),
            metric(row.levelMet === false ? "Theoretical XP/hour" : "Estimated XP/hour", row.unsupported ? "Not modeled" : fmt(row.xpPerHour))));
          if (row.unsupported) card.append(e("p", {class:"comparison-warning"}, row.unsupportedReason));
          if (row.lockReason) card.append(e("p", {class:"comparison-warning"}, row.lockReason));
        } else {
          card.append(e("dl", {}, metric("Level requirement", row.levelMet ? "Met" : "Locked / unavailable"), metric("Listed XP/action", fmt(row.exp)),
            metric("Base action cycle", fmt(row.baseSeconds) + "s"), metric("Your double-up chance", pct(row.doubleChance)),
            metric(!row.levelMet || !row.membershipMet ? "Theoretical XP/hour" : config.modelDoubleUps ? "Estimated XP/hour" : "Base XP/hour", fmt(row.xpPerHour)),
            ...Object.entries(row.otherExp || {}).map(([id, xp]) => metric((catalog.skills.find(s => s.id === id)?.name || id) + " XP/action", fmt(xp)))));
          if (!row.levelMet) card.append(e("p", {class:"comparison-warning"}, "Theoretical rate only. Requires " + skill.name + " " + row.level + "; this player is level " + (levels[skill.id] || 1) + "."));
          if (!row.membershipMet) card.append(e("p", {class:"comparison-warning"}, "Theoretical rate only. Membership is required."));
        }
        card.append(...requirements(activity), locations(activity));
        return card;
      }));
      output.replaceChildren(e("p", {class:"training-loadout"}, intro), recommendation(rows, config, skill.combat), cards);
      assumptions.append(e("a", {href:"./activity-catalog.json", target:"_blank", rel:"noopener noreferrer"}, "Source: public game client · checked " + new Date(catalog.source.checkedAt).toLocaleDateString("en", {month:"long", day:"numeric", year:"numeric"})));
    } catch (error) {
      output.replaceChildren(e("p", {class:"training-message", role:"status"}, error.message));
    }
  }
  controls.addEventListener("submit", event => {event.preventDefault(); update();});
  skillSelect.addEventListener("change", () => {fillActivities(true); update();});
  firstSelect.addEventListener("change", () => {syncSecondOptions(); update();});
  secondSelect.addEventListener("change", update);
  fillActivities();
  update();
  return panel;
}
