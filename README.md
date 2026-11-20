# WESCOSA Staycation · Silver Dome, Ibadan

A 3D walk-around of the Silver Dome resort, built the same way as The Feast (`../TheFeast`): Next.js, React Three Fiber, zustand, and the same Rocketbox people.

It starts at night. A pearl-white stretch limousine comes down the street outside the resort (a two-way road with traffic going by and street lights), filmed by a drone in three shots: from the top, from the front, and from the side as it pulls in to the kerb. It stops side-on to the gate with you inside. Before you step out you pick lady or guy and type your name. Then you get a welcome: your name in lights, confetti and fireworks over the resort. You step out in a simple, elegant outfit (a different one each time you arrive) and walk in through the gate. The limo drives off. Tolu, your host, is waiting just inside the gate facing you, and follows once you've passed her.

Tolu stays a step behind you and tells you what to do next. A "Next" card on screen (tap it to do it straight away), a glowing marker over the right attendant, and a faint arrow at your feet make it obvious. The weekend, in order:

| Where | What you do there |
|---|---|
| The welcome desk inside the gate | **Check in** with Ada: get your key card (name, set, house, avatar, T-shirt, diet, your Yearbook line) |
| Just past check-in, on the terrace | **The Yearbook**: a 3D book on a little billboard. It says "not available yet" until `YEARBOOK_OPEN` is turned on, and asks people to put their name in |
| Hotel reception (up the stairs) | **Room partner**: pick who you'd like to share with; it's a match when they pick you too |
| The poolside dinner (a long table for 50 between the pool and the grill) | Sit at the table, or see Funke at the **buffet** across its end, for the **Menu** |
| The bar pavilion, any table | **Menu**: sit at a free seat (E) and choose a main, side and drink for every meal of the stay |
| The grill | **Grill night** menu (suya, chicken, croaker, asun) |
| The big screen at the end of the dinner table (Kemi) | **Movie night**: trailers playing; vote, or open a trailer |
| The movie lawn | **Movie night**: vote; the leader shows live on the roof screen. Sit in a chair for a cinema view |
| The bonfire on the field (through the west wall) | **Games** with Coach Bayo: tick what you'll play. People sit on logs round the fire and dance |
| Awards board (foot of the stairs) | **Nominate** classmates in ten categories; the leaders show on the board |
| The pool | Walk in and wade about |

Every spot has a member of staff in the Silver Dome polo. They turn to you as you come over, wave, and tell you what they can do; their bubble's button (or E) opens it. Roll-up banners (welcome, staycation, the Silver Dome party) stand at the desk, the stairs, the bar, the pool, the movie lawn and the field path.

The guests carry the organisers' names (`src/game/data/guests.ts`), each name once. The name you type on arrival is taken out of the crowd. Bobo, Herjyy and Khay come over and flirt if you're a lady. Guests are dressed for the night (fitted dresses and shirts, some in Ankara prints).
- People in the pool and on the loungers wear swimwear, and the swimmers knock a beach ball about.
- The 5-a-side has orange and blue kits, keepers, goals and a scoreboard.
- People play Ayo and Ludo at the courtyard tables.
- Now and then someone near you turns, waves and says hi.

Plus a **Day / Evening** switch (pool lights, purple LED in the bar, wall lights, lit windows) and a "Your weekend" checklist.

The resort is modelled from the photos in [references](references): the pool and flagstone deck, the black-grid glass bar with ivy and rattan lamps, the three-storey cream hotel with brown pilasters and terracotta hip roofs, the graffiti mural by the stairs, the cinema block with its white roof screen, the grill in the paved courtyard, the block-walled football field, and the yellow mosque and rusty roofs of the neighbourhood. The layout lives in one file, [src/game/world/layout.ts](src/game/world/layout.ts).

## Music

There are no audio files; both tracks are generated in the browser (`src/game/music.ts`):
- **Near the dinner:** slow underground jazz (Rhodes, walking bass, brushes, vinyl crackle).
- **At the bonfire:** a highlife / afrobeat groove (talking drum, shakers, bass, guitar).
- Each fades in as you walk towards it and out as you leave. It starts with the first tap, and 🎵 turns it off.

## Different devices

`src/game/quality.ts` works out a level when the site opens, as The Feast does:
- **high:** computers.
- **mid:** recent phones.
- **low:** older or low-memory phones.

Each level sets:
- pixel ratio and shadows;
- how many guests and dinner guests appear, and how many avatar models download;
- how far away people stop animating, and stop being drawn;
- particles, houses, trees, texture sizes and lights.

`?quality=low|mid|high` forces a level.

## Run it

```bash
npm install
npm run dev -- -p 3010
```

Then open http://localhost:3010. `?quality=lite` forces the phone version, `?evening` opens at dusk.

**Controls:**
Controls work as in The Feast:
- **Computers:** ↑ ↓ (or W S) walk forward and back, ← → (or A D) turn you all the way round with the camera behind you, Shift runs, E talks, sits or opens a spot. Drag to swing the camera round you (to see your front); it eases back behind you as you walk. Scroll or pinch to zoom.
- **Phones:** the same with the arrow pad. Drag with one finger to look round, pinch to zoom, tap the prompt or the Next card.
- **Everywhere:** the camera pulls in rather than going through walls. The aerial view, with buttons over every spot, is one tap away.

## Where things are saved

Everything goes through one API route, [src/app/api/[action]/route.ts](src/app/api/[action]/route.ts):
- **Saved:** check-ins, meal orders, movie votes, games, nominations and room-partner requests.
- **Locally:** they go to `.data/*.jsonl`.
- **On Netlify:** they go to Netlify Blobs (store `staycation`).

Each check-in gets a key card code (`SD-XXXXXX`), kept on the device. Every other action has to carry it, and the server checks it.

The public list (`GET /api/state`) never includes emails, phone numbers or key cards.

## To fill in before launch

- **Event details:** dates, the association's full name and the number of nights, in [src/game/data/event.ts](src/game/data/event.ts).
- **Menu:** the dishes are placeholders, in [src/game/data/menu.ts](src/game/data/menu.ts).
- **Movies, games and award categories:** placeholders, in [src/game/data/activities.ts](src/game/data/activities.ts).
- **Yearbook:** switch `YEARBOOK_OPEN` on in [src/game/data/event.ts](src/game/data/event.ts) when it's ready.
- **Guest names:** the names over the people walking about, and which avatar each gets, in [src/game/data/guests.ts](src/game/data/guests.ts).
