# Public player live-state audit — November 19, 2026

Compared the deployed wiki relay with direct, unauthenticated requests to the
official `https://microscape.cc/server/tapi/character-by-id` endpoint, using the
JSON input `characterId`. Repeated direct requests with cache-busting queries and
`cache: no-store`. No authentication credentials were accessed.

Three distinct profiles were checked: xMrTwister23x (`424803524`), MzDunk
(`195104909`) and TwisterRaptorclawz (`115664950`). Each response correctly
identified that player and returned different XP and equipment. All three
returned exactly the same live-state values:

- Map: `jesters-room`.
- Position: x 17, y 14; facing x 16, y 11.
- Activity: zone `jesters-room`, skill `piety`, activity `jesters-chest-large`.
- Activity timing: remaining 6, length 7, including repeat requests.
- Resources: HP 60, maximum HP 60.

The relay matched the upstream response. This was not a cross-player cache-key
collision or a wiki fallback value. In particular, the returned activity did not
agree with the player's reported current activity. The public fields therefore
cannot support a claim of live location, activity or health. Their server-side
purpose is not documented; treating them as example/placeholder state is an
inference from these observations.

The archived official client `index-CUJKZV-W.js`, `ProfileScreen`, displays
equipment and skill levels from this endpoint, with no location or activity
section. The actual signed-in game obtains its current state through socket
updates; that is a different source from the public profile.

Correction: keep the verified public identity, equipment and XP. Return
`liveStatusAvailable: false`, null out live-state fields, omit the internal world
ID, and label live status unavailable in the UI. The UI requires an explicit
verified-live flag before rendering those values, protecting readers from older
cached responses. Revisit only when a reliable public live-state source exists.
