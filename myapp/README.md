# UH Student Center Room Booking App

## Completed app

All three stages below are implemented. The pages load rooms from the API,
save reservations to JSON, and display and cancel saved bookings. The app
also validates dates and meeting times and prevents overlapping reservations
for the same room. Purpose is optional. Reservations must start and end on
the same day; back-to-back meetings are allowed. My Bookings shows all clubs'
reservations, as this assignment does not include user accounts.

From this folder, run:

```bash
npm install
npm test
npm start
```

Open **http://localhost:3000**. In Windows PowerShell, use `npm.cmd` in place
of `npm` if the script execution policy blocks `npm.ps1`.

On Windows, you can also double-click **Start Room Booking.cmd** in the
parent folder (the repository root). Keep its server window open while using the app.
If the browser says "localhost refused to connect," start the server again
and reload the page. The local server must be restarted after a computer
restart; the webpage cannot start it by itself.

Tests cover the API, JSON persistence, invalid input, overlapping bookings,
and the actual frontend scripts and forms using jsdom and a real local server.
They use temporary data directories and leave `backend/data/bookings.json`
unchanged. jsdom checks page behavior, not browser layout.

The original assignment instructions are retained below for reference.

A beginner project for learning **HTML, CSS, and JavaScript** on the
frontend, and **Node.js / Express** on the backend. You will build a
small web app that lets student clubs view and book meeting rooms at
the University of Houston Student Center.

No prior JavaScript experience is required. The project is broken
into **three stages**, and this repo already contains a skeleton you
can build on for each stage.

## What you're building

- A **Home** page that welcomes visitors and lists every meeting
  room with its capacity, available equipment, and whether food is
  allowed.
- A **Book a Room** page with a form to reserve a room.
- A **My Bookings** page that lists existing bookings and lets you
  cancel one.
- A small **Express** server that stores rooms and bookings in
  **JSON files** (no database needed) and exposes them through a
  REST API.
- A **navigation bar** present on every page linking the three pages
  together.

## Project structure

```
myapp/
├── package.json              # run "npm install" then "npm start" from here
├── README.md
├── backend/
│   ├── server.js             # Express app entry point (mostly done for you)
│   ├── data/
│   │   ├── rooms.json        # room data (already filled in)
│   │   └── bookings.json     # bookings data (starts empty: [])
│   ├── routes/
│   │   ├── rooms.js          # GET /api/rooms, GET /api/rooms/:id
│   │   └── bookings.js       # GET/POST /api/bookings, DELETE /api/bookings/:id
│   └── utils/
│       └── jsonStore.js      # helper functions to read/write the JSON files
└── frontend/
    ├── index.html            # Home / room list page
    ├── booking.html          # Book a room page
    ├── my-bookings.html      # View / cancel bookings page
    ├── css/
    │   └── style.css         # all styling lives here
    └── js/
        ├── api.js            # the ONLY file that talks to the backend
        ├── rooms.js          # renders room cards (done for you - study this!)
        ├── booking.js        # handles the booking form (TODO)
        └── my-bookings.js    # renders/cancels bookings (TODO)
```

## Requirements

- [Node.js](https://nodejs.org/) version 18 or newer (includes `npm`).
- A code editor such as VS Code.
- A modern web browser (Chrome, Edge, Firefox).

## Running the finished app

From the `myapp/` folder:

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser. The Express
server serves the frontend files *and* the API from the same origin,
so `fetch("/api/rooms")` works without any extra configuration
(no CORS setup needed).

---

## Stage 1 — Frontend (HTML, CSS, JavaScript)

**Goal:** build all three pages using only static/mock data, before
any backend exists.

Work only inside `frontend/`.

1. **`index.html`** — Already has the navbar and an empty
   `#room-list` container. Open it directly in your browser (double
   click the file, or use the VS Code "Live Server" extension) and
   confirm the room cards from `js/rooms.js` show up using the mock
   data in `js/api.js`.
2. **`css/style.css`** — A starter stylesheet is provided (navbar,
   room cards, form styling). Customize colors, fonts, and spacing
   to make it your own. Make sure the page looks reasonable on a
   phone-sized window too.
3. **`booking.html` + `js/booking.js`** — Finish the `TODO`s in
   `js/booking.js`:
   - `populateRoomSelect()` should fill the `<select>` dropdown with
     one `<option>` per room (using `getRooms()` from `api.js`).
   - `handleBookingSubmit()` should read the form fields and (for
     now) just log the booking object to the console with
     `console.log(...)`, since there's no backend yet to save it to.
4. **`my-bookings.html` + `js/my-bookings.js`** — Finish the `TODO`s
   so the page renders a list of bookings and a "Cancel" button per
   booking. Since there's no backend yet, this can start by working
   against `MOCK_BOOKINGS` in `api.js`.

**Checkpoint:** you should be able to navigate between all three
pages using the navbar, see the sample rooms on the Home page, fill
out and "submit" the booking form (even if it just logs to the
console), and see a bookings list.

## Stage 2 — Backend (Node.js / Express / JSON files)

**Goal:** build a REST API that reads and writes the JSON files in
`backend/data/`, without worrying about the frontend yet.

Work only inside `backend/`.

1. Run `npm install` from `myapp/` once to install Express.
2. Look at `backend/utils/jsonStore.js` — it's done for you. It
   gives you `readData(fileName)` and `writeData(fileName, data)` so
   you never have to write raw `fs` code yourself.
3. Look at `backend/routes/rooms.js` — the `GET /api/rooms` route is
   implemented as a worked example. Use the same pattern to
   implement `GET /api/rooms/:id`.
4. Implement all three routes in `backend/routes/bookings.js`
   following the `TODO` comments:
   - `GET /api/bookings`
   - `POST /api/bookings`
   - `DELETE /api/bookings/:id`
5. Start the server with `npm start` (from `myapp/`) and test your
   endpoints **without a frontend**, using one of:
   - [Postman](https://www.postman.com/) or the VS Code "Thunder
     Client" extension
   - `curl`, e.g. `curl http://localhost:3000/api/rooms`
   - Your browser (for GET requests only), e.g. visiting
     `http://localhost:3000/api/rooms`

### API reference

| Method | Endpoint            | Description                          | Body (JSON)                                                            |
|--------|----------------------|---------------------------------------|--------------------------------------------------------------------------|
| GET    | `/api/rooms`         | List all rooms                        | —                                                                          |
| GET    | `/api/rooms/:id`     | Get one room by id                    | —                                                                          |
| GET    | `/api/bookings`      | List all bookings                     | —                                                                          |
| POST   | `/api/bookings`      | Create a new booking                  | `{ "roomId", "clubName", "date", "startTime", "endTime", "purpose" }`     |
| DELETE | `/api/bookings/:id`  | Cancel (delete) a booking by id       | —                                                                          |

**Room object shape** (`backend/data/rooms.json`):

```json
{
  "id": "r1",
  "name": "Bayou City Room",
  "capacity": 12,
  "equipment": ["Projector", "Whiteboard", "Conference Phone"],
  "foodAllowed": true
}
```

**Booking object shape** (`backend/data/bookings.json`):

```json
{
  "id": "1735689600000",
  "roomId": "r1",
  "clubName": "Chess Club",
  "date": "2026-10-01",
  "startTime": "14:00",
  "endTime": "15:00",
  "purpose": "Weekly meeting"
}
```

**Checkpoint:** you can hit every endpoint above with Postman/curl,
see rooms come back, create a booking and see it appear in
`backend/data/bookings.json`, and delete it again.

## Stage 3 — Integration

**Goal:** connect the frontend you built in Stage 1 to the backend
you built in Stage 2, using `fetch`.

1. Open `frontend/js/api.js`. This is the **only** file you need to
   change. Every other frontend file (`rooms.js`, `booking.js`,
   `my-bookings.js`) already calls functions from this file, so if
   you keep the function names and return values the same, nothing
   else needs to change.
2. Replace the mock implementation of each function with a real
   `fetch()` call, following the commented examples already in the
   file. For example:

   ```js
   async function getRooms() {
     const response = await fetch("/api/rooms");
     return await response.json();
   }
   ```

3. For `createBooking`, remember to `POST` with a JSON body:

   ```js
   async function createBooking(bookingData) {
     const response = await fetch("/api/bookings", {
       method: "POST",
       headers: { "Content-Type": "application/json" },
       body: JSON.stringify(bookingData),
     });
     return await response.json();
   }
   ```

4. Run `npm start` from `myapp/` and open
   **http://localhost:3000** (not by double-clicking the HTML file
   anymore — the frontend now needs to be served by Express so that
   relative `fetch("/api/...")` calls work).
5. Test the full flow end to end:
   - Home page shows rooms loaded from `rooms.json` via the API.
   - Submitting the booking form actually saves a new entry into
     `bookings.json`.
   - The My Bookings page shows the booking you just created.
   - Canceling a booking removes it from `bookings.json` and from
     the page.

**Checkpoint (final deliverable):** starting from a clean checkout,
a grader can run:

```bash
npm install
npm start
```

and use the fully working app at `http://localhost:3000`, with data
persisted in the JSON files under `backend/data/`.

## Stretch goals (optional, for students who finish early)

- Prevent double-booking a room for an overlapping date/time.
- Add simple client-side form validation (e.g. end time after start time).
- Add a "search/filter rooms by capacity" input on the Home page.
- Add an `PUT /api/bookings/:id` endpoint to edit an existing booking.
- Persist and display *who* made each booking (a simple name field, no login system needed).
