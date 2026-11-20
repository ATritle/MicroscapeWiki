const asset = name => "./assets/bazaar/" + name;
export const bazaarVisualSteps = [
  {
    title:"Open Bazaar and choose the right tab", short:"Open Bazaar",
    image:asset("01-open-bazaar.png"), width:550, height:510,
    alt:"Microscape's Bazaar menu and the New, Sellers, Buyers and My Orders tabs.",
    caption:"The in-game Bazaar is in the left menu. The four tabs do different jobs.",
    text:"Start by deciding what you want to do: get an item, sell something, or check an order you already posted.",
    points:["New shows recently posted orders from both sides of the market.","Sellers shows items other players are offering. Start here when you want to buy.","Buyers shows what other players want. Start here when you want to sell.","My Orders contains your open orders and completed-trade history."]
  },
  {
    title:"Search for the item", short:"Find an item",
    image:asset("02-find-an-item.png"), width:338, height:350,
    alt:"The Sellers tab filtered to copper, showing Copper Ore with a quantity and a price in coins.",
    caption:"This example searches Sellers for Copper Ore. The price on the right is per item.",
    text:"Type part of the item's name into the search box. You can also narrow the list with the category menu beside it.",
    points:["Select the item to open its market page.","Selling means those players have the item available. Buying means those players are offering coins for it.","A quantity such as 2.0k is approximately 2,000 items. Read the coin price separately on the right."]
  },
  {
    title:"Read the item's market page", short:"Compare prices",
    image:asset("03-read-the-market.png"), width:338, height:690,
    alt:"Copper Ore's market page showing Sellers, Buyers, their best prices and quantities, and completed trade history.",
    caption:"Sellers and Buyers describe current orders. Trade History describes trades that already happened.",
    text:"This screen helps you compare what sellers are asking with what buyers are offering. They can be different prices.",
    points:["In this screenshot, the best sell offer is 2 coins each and the best buy order is 1 coin each.","The quantity on each side is a market total. Open that side to inspect the individual listings and their quantities.","Trade History shows completed prices. The current Sellers rows tell you what is available now.","The NPC vendor price is a separate figure from player offers in the Bazaar."]
  },
  {
    title:"Open an individual listing", short:"Choose an order",
    image:asset("04-individual-orders.png"), width:338, height:255,
    alt:"Separate Copper Ore sell orders, each with its own remaining quantity, age and price.",
    caption:"Each row is a separate order. Compare its price and remaining quantity.",
    text:"Select a listing if you want the game to prepare an order on the opposite side. Accepting the matching-order prompt opens a form for you to review.",
    points:["Selecting a sell listing prepares a buy order. Selecting a buy listing prepares a sell order.","The form starts with the listing's price and remaining quantity. You can review those values before posting.","You are posting to the shared market. This does not reserve that person's items for you or complete an instant trade."]
  },
  {
    title:"Buying: check quantity × price", short:"Buy an item",
    image:asset("06-buy-order.png"), width:338, height:660,
    alt:"A Copper Ore buy-order form set to six items at two coins each, with a total of twelve coins and automatic cancellation selected.",
    caption:"Example buy order: 6 Copper Ore × 2 coins each = 12 coins committed when posted.",
    text:"Quantity is how many items you want. Price per Unit is what you offer for each one. Check the multiplied total before confirming.",
    points:["For six items at 2 coins each, set aside 12 coins.","Posting the order holds the required coins in escrow while it is open.","Cancel it schedules the unfilled remainder to return at the cutoff shown. Leave it up keeps the remainder listed.","The final confirmation warns that a new order can be committed for up to 30 minutes. Check its displayed time before proceeding."]
  },
  {
    title:"Selling: check the total and tax", short:"Sell an item",
    image:asset("07-sell-order.png"), width:338, height:590,
    alt:"An unsubmitted Logs sell-order form set to five logs at two coins each, showing a ten-coin total and five percent tax.",
    caption:"Example sell order: 5 Logs × 2 coins each = 10 coins before the displayed 5% selling tax.",
    text:"Use Sell Items to choose something you own, then enter the quantity and your asking price per item.",
    points:["The Total is the order's gross value. Allow for the 5% selling tax when comparing it with selling to an NPC.","The game holds the listed items while the order is open, so you cannot use those same items elsewhere.","Exact coin rounding is not confirmed here. Check the completed trade for the actual coins received.","The screenshot is an unsubmitted example; opening a form is separate from posting an order."]
  },
  {
    title:"Follow the result in My Orders", short:"Track the result",
    image:asset("08-my-orders.png"), width:338, height:425,
    alt:"The My Orders tab showing open-order slots, Selling and Buying sections, and the History heading.",
    caption:"This screenshot has no open orders. Yours appear under Selling or Buying; completed trades appear below History.",
    text:"After posting, open My Orders. A compatible order may be found before the trade actually executes, so follow its status and scheduled time.",
    points:["Matched means a compatible buyer or seller was found. Look for Will trade at to see the scheduled time.","History records completed trades. An order can fill in parts, leaving a smaller quantity open.","If you request cancellation during the waiting period, the order remains tradable until the cancellation time shown.","The screenshot's 11 slots include membership. The base is 6, membership adds 5, and each permit adds 1, up to four permits."]
  }
];

export function renderBazaarWalkthrough(element, prefix = "bazaar-visual") {
  const headingId=prefix+"-title";
  const steps=bazaarVisualSteps.map((step,index)=>element("section",{class:"bazaar-visual-step",id:prefix+"-step-"+(index+1)},
    element("div",{class:"bazaar-step-copy"},
      element("div",{class:"bazaar-step-label"},"STEP "+(index+1)),element("h3",{},step.title),element("p",{},step.text),
      element("ul",{},...step.points.map(point=>element("li",{},point)))),
    element("figure",{},element("a",{href:step.image,target:"_blank",rel:"noopener noreferrer","aria-label":"Enlarge screenshot: "+step.short},
      element("img",{src:step.image,alt:step.alt,width:step.width,height:step.height,loading:"lazy",decoding:"async"})),
      element("figcaption",{},step.caption," Select the image to enlarge."))));
  const contents=element("div",{class:"bazaar-visual-contents","aria-label":"Visual guide steps"},
    ...bazaarVisualSteps.map((step,index)=>{
      const button=element("button",{type:"button"},(index+1)+". "+step.short);
      button.addEventListener("click",()=>steps[index].scrollIntoView({behavior:"smooth",block:"start"}));return button;
    }));
  const flow=(title,items,className)=>element("section",{class:"bazaar-order-flow "+className},element("h3",{},title),
    element("ol",{},...items.map(([label,text])=>element("li",{},element("strong",{},label),element("p",{},text)))));
  return element("section",{class:"bazaar-visual","aria-labelledby":headingId},
    element("h2",{id:headingId},"Bazaar: a picture walkthrough"),
    element("p",{class:"intro"},"Post what you want to buy or sell, wait for the market to match it, then check My Orders for the result."),
    element("div",{class:"bazaar-direction-cards"},
      element("div",{},element("strong",{},"I want to BUY an item"),element("p",{},"Browse Sellers → review an item → create a buy order. Your coins wait in escrow.")),
      element("div",{},element("strong",{},"I want to SELL an item"),element("p",{},"Browse Buyers, or choose Sell Items → set quantity and price → create a sell order. Your items wait in escrow."))),
    element("p",{class:"bazaar-help"},"Actual game screenshots captured November 20, 2026. Prices, quantities, balances and clock times are examples from that moment. Check the live market and your own order for current values."),
    contents,...steps,
    flow("From posting to completion — illustrated",[
      ["1 · Posted","Your items or coins are held for the open order."],
      ["2 · Waiting","The market needs a compatible order on the other side."],
      ["3 · Matched","Check the scheduled trade time. The trade is still pending."],
      ["4 · Completed","History records the executed trade. Any unfilled remainder can stay open."]
    ],"bazaar-trade-flow"),
    flow("If you cancel during the waiting period",[
      ["Request cancellation","Read the cancellation time the game shows."],
      ["Still on the market","The order may trade before that time arrives."],
      ["Remainder returned","Untraded items or unspent coins return when cancellation takes effect."]
    ],"bazaar-cancel-flow"),
    element("p",{class:"notice"},"Cancelling an order does not reverse trades that already completed. The game may allow immediate cancellation when the order's current state permits it."));
}
