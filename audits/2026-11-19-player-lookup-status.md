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

## November 22 recheck

Repeated read-only, unauthenticated requests to the official character endpoint
for the same three distinct profiles, with cache-busting query parameters and
`cache: no-store`. All returned HTTP 200 and the correct distinct names, but all
still returned activity zone `jesters-room`, skill `piety`, activity
`jesters-chest-large`, remaining `6`, length `7`, and world ID `shared-67`.
There is still no evidence that these public activity fields are current player
state. Keep them excluded from lookup results. No game character, equipment,
activity, authentication session or account setting was changed.

## November 22 current-client investigation

Captured the current public client at 2026-11-22T17:24:02.912Z:

- Asset: `https://microscape.cc/play/assets/index-BsSHHy-E.js`.
- Bytes: `1273300` (UTF-8).
- SHA-256: `228bbcdac7deb74e394e283dc124611450abc4dd7f9d7ba98fb141846f649878`.
- Game-reported build ID: `mwoj4yu6`.
- Local source, manifest, AST inventory and anonymous probe results are preserved
  in `C:/dev/MicroscapeBuilds/activity-research-2026-11-22/`.

Parsed the JavaScript with Acorn and inventoried its application query calls,
socket listeners and activity consumers. The client has a real activity source,
but it is distinct from the public profile:

| Client evidence | Character offset | Finding |
| --- | ---: | --- |
| Socket creation (`kx`) | 483391 | Socket.IO uses `/server/ws`, WebSocket transport, and no automatic connection. |
| `update` listener | 484467 | Patches the live `mS` state using `jx.patch`. This is a stream of patches, not independent complete profiles. |
| `X` state getter | 486983 | Reads the signed-in character from `mS.value.me`. |
| `hS` state getter | 487075 | Reads and filters the other characters supplied in `mS.value.characters`. |
| BottomBar | 1083290 | Formats `X.value.activity` as combat, skilling, preparation, queuing, travel or banking text. |
| CharacterRenderer | 1198500 | Uses the supplied character's real activity for combat effects, projectiles and skill animations. |
| ProfileScreen query | 1242112 | Still fetches `character-by-id`; it does not query live activity for the selected profile. |
| Connection verification | 1268161 | Checks `verify-and-refresh-token`, queue and `okToConnect` before connecting. |
| Socket auth and connect | 1268570 | Uses the verified game session, version and a local `server-id`. There is no target username argument here. |

The scene uses the supplied characters for rendering and profile camera focus.
The public client does not establish the server's complete visibility rules, so
do not claim that this feed contains every player, every world, or arbitrary
players requested by username. No general live-player lookup query or socket
subscription by character ID/name was found in this client.

Anonymous checks of procedures actually used by the current client returned:

- `version`: HTTP 200, with `version` and `buildId`.
- `verify-and-refresh-token`: HTTP 200, `okToConnect: false`, `queued: false`.
- `leaderboard` (Attack, all communities): HTTP 200; ranking rows contain only
  `twitchId`, `displayName`, `rank` and `level`.
- `user-ranks`: HTTP 200; skill-to-rank results, no activity.

No game cookies, tokens or saved browser sessions were used. No authenticated
socket was opened and no `input:game` event was sent. The client explicitly
handles `connected-elsewhere` by disconnecting, so duplicating a player's game
session should not be treated as a harmless wiki lookup implementation.

### Practical alternatives

1. Prefer a developer-provided, read-only live-status endpoint with explicit
   visibility rules. It could support arbitrary public username lookups without
   a game connection owned by the wiki.
2. A player-authorized companion in their own open game could potentially share
   only their own activity with the wiki. This is an implementation proposal,
   not a verified integration: it would need game compatibility checks, consent,
   authenticated publication, timestamps/expiry and a way to stop sharing. It
   would cover participating players while the companion is running. Nearby
   characters should not be automatically collected or published.

Twitch website sign-in alone gives neither a Microscape game session nor a
global live-state directory. XP changes over time could indicate recent skill
training, but cannot establish the exact current task or enemy, so they should
not be labeled current activity. Keep the present public lookup unchanged.
