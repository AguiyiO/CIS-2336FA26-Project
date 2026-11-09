const assert = require("node:assert/strict");
const { after, afterEach, before, beforeEach, test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { JSDOM, VirtualConsole } = require("jsdom");

// Execute the actual served pages and scripts against the real API, while
// keeping every reservation in a temporary directory owned by this suite.
let dataDirectory;
let server;
let baseUrl;
let rooms;
let pages = [];
let pageErrors = [];
const previousDataDirectory = process.env.BOOKING_DATA_DIR;

before(async () => {
  dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "uh-room-frontend-test-"));
  fs.copyFileSync(
    path.join(__dirname, "..", "backend", "data", "rooms.json"),
    path.join(dataDirectory, "rooms.json")
  );
  fs.writeFileSync(path.join(dataDirectory, "bookings.json"), "[]");
  rooms = JSON.parse(fs.readFileSync(path.join(dataDirectory, "rooms.json"), "utf8"));
  process.env.BOOKING_DATA_DIR = dataDirectory;
  const app = require("../backend/server");
  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(() => {
  fs.writeFileSync(path.join(dataDirectory, "bookings.json"), "[]");
  pages = [];
  pageErrors = [];
});

afterEach(() => {
  for (const page of pages) page.window.close();
  assert.deepEqual(pageErrors, [], "Page scripts must not produce unhandled errors");
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
      server.closeIdleConnections();
    });
  }
  if (previousDataDirectory === undefined) delete process.env.BOOKING_DATA_DIR;
  else process.env.BOOKING_DATA_DIR = previousDataDirectory;
  if (dataDirectory) fs.rmSync(dataDirectory, { recursive: true, force: true });
});

async function openPage(route, shouldFail = () => false) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => pageErrors.push(error.message));
  const page = await JSDOM.fromURL(`${baseUrl}${route}`, {
    resources: "usable",
    runScripts: "dangerously",
    virtualConsole,
    beforeParse(window) {
      window.fetch = (input, options) => {
        const url = new URL(input, window.location.href);
        if (shouldFail(url, options || {})) {
          return Promise.reject(new TypeError("Simulated network failure"));
        }
        return fetch(url, options);
      };
    },
  });
  pages.push(page);
  return page.window;
}

async function waitFor(predicate, message) {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() >= deadline) assert.fail(`Timed out waiting for ${message}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function storedBookings() {
  return JSON.parse(fs.readFileSync(path.join(dataDirectory, "bookings.json"), "utf8"));
}

function booking(overrides = {}) {
  return {
    roomId: "r3",
    clubName: "Chess Club",
    date: "2026-11-12",
    startTime: "14:00",
    endTime: "15:00",
    purpose: "Weekly meeting",
    ...overrides,
  };
}

function fillBooking(window, values = booking()) {
  const fields = {
    roomId: "room-select", clubName: "club-name", date: "date",
    startTime: "start-time", endTime: "end-time", purpose: "purpose",
  };
  for (const [field, id] of Object.entries(fields)) {
    window.document.getElementById(id).value = values[field];
  }
}

async function readyForm(route = "/booking.html") {
  const window = await openPage(route);
  await waitFor(() => !window.document.querySelector("button[type='submit']").disabled,
    "the room dropdown to load");
  return window;
}

test("home renders all five rooms with equipment, capacity, food policy and booking links", async () => {
  const window = await openPage("/");
  const document = window.document;
  await waitFor(() => document.querySelectorAll(".room-card").length === rooms.length,
    "all room cards");
  assert.equal(rooms.length, 5);
  const cards = [...document.querySelectorAll(".room-card")];
  rooms.forEach((room, index) => {
    const card = cards[index];
    assert.equal(card.querySelector("h3").textContent, room.name);
    assert.ok(card.textContent.includes(`${room.capacity} people`));
    assert.deepEqual([...card.querySelectorAll("li")].map((item) => item.textContent), room.equipment);
    assert.equal(card.querySelector(".badge").textContent, room.foodAllowed ? "Food Allowed" : "No Food");
    assert.equal(new URL(card.querySelector("a").href).searchParams.get("roomId"), room.id);
  });
});

test("dropdown preselects a room; invalid times and blank club names do not save", async () => {
  const window = await readyForm("/booking.html?roomId=r3");
  const document = window.document;
  const select = document.getElementById("room-select");
  assert.equal(select.value, "r3");
  assert.deepEqual([...select.options].map((option) => option.value), ["", ...rooms.map((room) => room.id)]);

  fillBooking(window, booking({ endTime: "13:00" }));
  document.getElementById("booking-form").requestSubmit();
  assert.match(document.getElementById("form-status").textContent, /End time must be after start time/);
  assert.equal(document.activeElement.id, "end-time");
  assert.deepEqual(storedBookings(), []);

  fillBooking(window, booking({ clubName: "   " }));
  document.getElementById("booking-form").requestSubmit();
  assert.match(document.getElementById("form-status").textContent, /complete all required fields/);
  assert.deepEqual(storedBookings(), []);
});

test("form creation persists, a fresh page displays safe text, and cancellation removes the booking", async () => {
  const window = await readyForm();
  const values = booking({
    clubName: '  <img src=x onerror="window.injected=true"> Chess Club  ',
    purpose: '  <script>window.injected=true</script> Strategy meeting  ',
  });
  fillBooking(window, values);
  window.document.getElementById("booking-form").requestSubmit();
  await waitFor(() => window.document.getElementById("form-status").classList.contains("success"),
    "the successful booking message");
  const saved = storedBookings();
  assert.equal(saved.length, 1);
  assert.deepEqual(saved[0], {
    id: saved[0].id, ...values,
    clubName: values.clubName.trim(), purpose: values.purpose.trim(),
  });
  assert.ok(saved[0].id);
  assert.equal(window.document.getElementById("club-name").value, "");
  assert.equal(window.document.querySelector("button[type='submit']").disabled, false);

  const bookingsWindow = await openPage("/my-bookings.html");
  const document = bookingsWindow.document;
  await waitFor(() => document.querySelector(".booking-item"), "the saved booking on a fresh page");
  const card = document.querySelector(".booking-item");
  assert.equal(card.querySelector("h2").textContent, rooms.find((room) => room.id === values.roomId).name);
  for (const value of [values.clubName.trim(), values.date, values.startTime, values.endTime, values.purpose.trim()]) {
    assert.ok(card.textContent.includes(value), `Booking should display ${value}`);
  }
  assert.equal(card.querySelector("img, script"), null);
  assert.equal(bookingsWindow.injected, undefined);
  card.querySelector("button").click();
  await waitFor(() => document.getElementById("bookings-status").classList.contains("success"),
    "successful cancellation");
  assert.equal(document.querySelector(".booking-item"), null);
  assert.match(document.getElementById("bookings-list").textContent, /There are no bookings yet/);
  assert.equal(document.querySelector("#bookings-list a").getAttribute("href"), "booking.html");
  assert.deepEqual(storedBookings(), []);
});

test("a booking conflict displays the API error and preserves form values for correction", async () => {
  const response = await fetch(`${baseUrl}/api/bookings`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(booking()),
  });
  assert.equal(response.status, 201);
  const original = await response.json();
  const window = await readyForm();
  fillBooking(window, booking({ clubName: "Another Club" }));
  window.document.getElementById("booking-form").requestSubmit();
  await waitFor(() => window.document.getElementById("form-status").classList.contains("error"),
    "the conflict message");
  assert.match(window.document.getElementById("form-status").textContent, /already booked/);
  assert.equal(window.document.getElementById("club-name").value, "Another Club");
  assert.equal(window.document.getElementById("room-select").value, "r3");
  assert.equal(window.document.querySelector("button[type='submit']").disabled, false);
  assert.deepEqual(storedBookings(), [original]);
});

test("failed room and booking loads display useful errors instead of unhandled exceptions", async () => {
  const bookingWindow = await openPage("/booking.html", () => true);
  await waitFor(() => bookingWindow.document.getElementById("form-status").classList.contains("error"),
    "the room loading error");
  assert.match(bookingWindow.document.getElementById("form-status").textContent, /Could not load rooms.*Unable to reach the server/);
  assert.equal(bookingWindow.document.getElementById("room-select").disabled, true);
  assert.equal(bookingWindow.document.querySelector("button[type='submit']").disabled, true);

  const bookingsWindow = await openPage("/my-bookings.html", () => true);
  await waitFor(() => bookingsWindow.document.getElementById("bookings-list").classList.contains("error"),
    "the bookings loading error");
  assert.match(bookingsWindow.document.getElementById("bookings-list").textContent, /Could not load bookings.*Unable to reach the server/);
  assert.deepEqual(storedBookings(), []);
});

test("failed cancellation retains the card and reservation, then a retry succeeds", async () => {
  const response = await fetch(`${baseUrl}/api/bookings`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(booking()),
  });
  assert.equal(response.status, 201);
  const original = await response.json();
  let failCancellation = true;
  const window = await openPage("/my-bookings.html", (url, options) =>
    failCancellation && options.method === "DELETE");
  const document = window.document;
  await waitFor(() => document.querySelector(".booking-item"), "the booking card");
  const card = document.querySelector(".booking-item");
  const button = card.querySelector("button");
  button.click();
  await waitFor(() => document.getElementById("bookings-status").classList.contains("error"),
    "the cancellation error");
  assert.match(document.getElementById("bookings-status").textContent, /Unable to reach the server/);
  assert.equal(card.isConnected, true);
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, "Cancel");
  assert.deepEqual(storedBookings(), [original]);

  failCancellation = false;
  button.click();
  await waitFor(() => document.getElementById("bookings-status").classList.contains("success"),
    "successful cancellation after retry");
  assert.equal(card.isConnected, false);
  assert.deepEqual(storedBookings(), []);
});
