// Match the vendor's displayed exchange option to the pet-map inventory item.
export function addPetMapOptions(reference, data) {
  const putFact = (page, label, value, after) => {
    page.facts ||= [];
    const existing = page.facts.find(row => row[0] === label);
    if (existing) existing[1] = value;
    else {
      const index = page.facts.findIndex(row => row[0] === after);
      page.facts.splice(index < 0 ? page.facts.length : index + 1, 0, [label, value]);
    }
  };
  let updated = 0;
  for (const [id, pet] of Object.entries(data.pets)) {
    const map = pet.requiredItemToObtain;
    if (!map) continue;
    const exchange = Object.values(data.activities).find(a => !a.softDeleted && a.inventoryChanges?.[map] > 0);
    const page = reference.find(p => p.category === "pets" && p.gameId === id);
    const mapPage = reference.find(p => p.category === "items" && p.gameId === map);
    if (!page || !mapPage || !exchange?.name) throw Error("Missing pet-map exchange: " + id);
    const facts = new Map(page.facts), vendor = facts.get("Vendor"), cost = facts.get("Cost");
    const directions = `Visit ${vendor} at Fellroot Swamp Hut and select “${exchange.name}” to exchange ${cost} for ${mapPage.title}.`;
    putFact(page, "Vendor map option", exchange.name, "Pet Map");
    const how = page.sections.find(([heading]) => heading === "How to get " + pet.name);
    if (how) how[1] = directions + " Carry the map while completing one of the eligible tasks or encounters below. The map is consumed when the pet is found."
      + (pet.requiresMembershipToObtain ? " Adventurer’s Guild membership is required to obtain this pet." : "");
    for (const table of page.tables || []) {
      if (!table.columns.includes("Required item")) continue;
      let column = table.columns.indexOf("Vendor map option");
      if (column < 0) {column = table.columns.length; table.columns.push("Vendor map option");}
      for (const row of table.rows) row[column] = exchange.name;
    }
    putFact(mapPage, "Vendor map option", exchange.name, "In-game name");
    mapPage.sections ||= [];
    const obtain = mapPage.sections.find(row => row[0] === "How to obtain this map");
    if (obtain) obtain[1] = directions;
    else mapPage.sections.unshift(["How to obtain this map", directions]);
    mapPage.related = [...new Set([...(mapPage.related || []), "fellroot-swamp-hut"])];
    updated++;
  }
  const overview = reference.find(p => p.id === "pets");
  const table = overview?.tables?.find(t => t.title === "Release companions");
  if (table) {
    let column = table.columns.indexOf("Vendor map option");
    if (column < 0) {column = table.columns.indexOf("Map") + 1; table.columns.splice(column, 0, "Vendor map option"); for (const row of table.rows) row.splice(column, 0, "");}
    for (const row of table.rows) {
      const pet = reference.find(p => p.category === "pets" && p.title === row[0] && p.releasePet);
      row[column] = pet?.facts?.find(([label]) => label === "Vendor map option")?.[1] || "None required";
    }
  }
  return updated;
}
