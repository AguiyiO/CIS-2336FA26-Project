const assert = require("node:assert/strict");
const { after, before, beforeEach, test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// Every request uses a real HTTP server, with an isolated JSON data directory.
// Running this suite never changes backend/data/bookings.json.
let dataDirectory;
let server;
let baseUrl;
let expectedRooms;
const previousDataDirectory = process.env.BOOKING_DATA_DIR;

before(async () => {
  dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "uh-room-booking-test-"));
  fs.copyFileSync(
    path.join(__dirname, "..", "backend", "data", "rooms.json"),
    path.join(dataDirectory, "rooms.json")
  );
  fs.writeFileSync(path.join(dataDirectory, "bookings.json"), "[]");
  expectedRooms = JSON.parse(fs.readFileSync(path.join(dataDirectory, "rooms.json"), "utf8"));
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
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeIdleConnections();
    });
  }
  if (previousDataDirectory === undefined) {
    delete process.env.BOOKING_DATA_DIR;
  } else {
    process.env.BOOKING_DATA_DIR = previousDataDirectory;
  }
  if (dataDirectory) fs.rmSync(dataDirectory, { recursive: true, force: true });
});

function booking(overrides = {}) {
  return {
    roomId: expectedRooms[0].id,
    clubName: "Chess Club",
    date: "2026-11-12",
    startTime: "14:00",
    endTime: "15:00",
    purpose: "Weekly meeting",
    ...overrides,
  };
}

async function request(route, { method = "GET", body, rawBody } = {}) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: body !== undefined || rawBody !== undefined
      ? { "Content-Type": "application/json" }
      : {},
    body: rawBody !== undefined ? rawBody : body !== undefined ? JSON.stringify(body) : undefined,
  });
  assert.match(response.headers.get("content-type") || "", /application\/json/);
  return { status: response.status, body: await response.json() };
}

function storedBookings() {
  return JSON.parse(fs.readFileSync(path.join(dataDirectory, "bookings.json"), "utf8"));
}

function assertError(response, status, context = "") {
  assert.equal(response.status, status, context);
  assert.equal(typeof response.body.error, "string", context);
  assert.ok(response.body.error.trim(), context);
}

test("all rooms and individual rooms match the JSON store", async () => {
  const list = await request("/api/rooms");
  assert.equal(list.status, 200);
  assert.deepEqual(list.body, expectedRooms);
  for (const room of expectedRooms) {
    const result = await request(`/api/rooms/${encodeURIComponent(room.id)}`);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, room);
  }
  assertError(await request("/api/rooms/does-not-exist"), 404);
});

test("create, list, persist, and cancel bookings without removing other bookings", async () => {
  assert.deepEqual(await request("/api/bookings"), { status: 200, body: [] });
  const first = await request("/api/bookings", { method: "POST", body: booking() });
  assert.equal(first.status, 201);
  assert.equal(typeof first.body.id, "string");
  assert.ok(first.body.id);
  assert.deepEqual(first.body, { id: first.body.id, ...booking() });
  assert.deepEqual(storedBookings(), [first.body]);

  const second = await request("/api/bookings", {
    method: "POST", body: booking({ roomId: expectedRooms[1].id }),
  });
  assert.equal(second.status, 201);
  assert.notEqual(second.body.id, first.body.id);
  assert.deepEqual((await request("/api/bookings")).body, [first.body, second.body]);
  assert.deepEqual(storedBookings(), [first.body, second.body]);

  assert.deepEqual(await request(`/api/bookings/${encodeURIComponent(first.body.id)}`, {
    method: "DELETE",
  }), { status: 200, body: { message: "Booking canceled" } });
  assert.deepEqual((await request("/api/bookings")).body, [second.body]);
  assert.deepEqual(storedBookings(), [second.body]);
  assertError(await request(`/api/bookings/${encodeURIComponent(first.body.id)}`, {
    method: "DELETE",
  }), 404);
  assert.deepEqual(storedBookings(), [second.body]);

  assert.equal((await request(`/api/bookings/${encodeURIComponent(second.body.id)}`, {
    method: "DELETE",
  })).status, 200);
  assert.deepEqual((await request("/api/bookings")).body, []);
  assert.deepEqual(storedBookings(), []);
});

test("required strings are trimmed and omitted purpose defaults to an empty string", async () => {
  const input = booking({ purpose: undefined });
  for (const field of ["roomId", "clubName", "date", "startTime", "endTime"]) {
    input[field] = `  ${input[field]}  `;
  }
  const result = await request("/api/bookings", { method: "POST", body: input });
  assert.equal(result.status, 201);
  assert.deepEqual(result.body, { id: result.body.id, ...booking({ purpose: "" }) });
  assert.deepEqual(storedBookings(), [result.body]);
});

test("missing, blank, and non-string fields fail without writing a booking", async () => {
  for (const field of ["roomId", "clubName", "date", "startTime", "endTime"]) {
    for (const value of [undefined, "", "   ", null, 123, [], {}]) {
      const result = await request("/api/bookings", {
        method: "POST", body: booking({ [field]: value }),
      });
      assertError(result, 400, `${field} = ${JSON.stringify(value)}`);
    }
  }
  for (const purpose of [null, 123, [], {}, false]) {
    assertError(await request("/api/bookings", {
      method: "POST", body: booking({ purpose }),
    }), 400, `purpose = ${JSON.stringify(purpose)}`);
  }
  assertError(await request("/api/bookings", {
    method: "POST", body: booking({ roomId: "does-not-exist" }),
  }), 400);
  assert.deepEqual(storedBookings(), []);
});

test("calendar dates and times are validated, including leap years", async () => {
  const invalidValues = [
    { date: "2026-02-29" },
    { date: "2026-04-31" },
    { date: "2026-13-01" },
    { date: "2026-00-01" },
    { date: "2026-01-00" },
    { date: "2026-1-01" },
    { date: "11/12/2026" },
    { startTime: "9:00" },
    { startTime: "24:00" },
    { startTime: "14:60" },
    { endTime: "25:00" },
    { endTime: "15:99" },
    { startTime: "14:00:00" },
    { endTime: "14:00" },
    { endTime: "13:59" },
    { startTime: "23:00", endTime: "01:00" },
  ];
  for (const overrides of invalidValues) {
    assertError(await request("/api/bookings", {
      method: "POST", body: booking(overrides),
    }), 400, JSON.stringify(overrides));
  }
  assert.deepEqual(storedBookings(), []);
  const leapDay = await request("/api/bookings", {
    method: "POST", body: booking({ date: "2028-02-29", startTime: "00:00", endTime: "23:59" }),
  });
  assert.equal(leapDay.status, 201);
  assert.deepEqual(storedBookings(), [leapDay.body]);
});

test("overlapping bookings conflict; adjacent times, other rooms, and other dates work", async () => {
  const original = await request("/api/bookings", { method: "POST", body: booking() });
  assert.equal(original.status, 201);
  const overlaps = [
    { startTime: "14:00", endTime: "15:00" },
    { startTime: "13:30", endTime: "14:30" },
    { startTime: "14:30", endTime: "15:30" },
    { startTime: "14:15", endTime: "14:45" },
    { startTime: "13:00", endTime: "16:00" },
  ];
  for (const times of overlaps) {
    assertError(await request("/api/bookings", {
      method: "POST", body: booking(times),
    }), 409, JSON.stringify(times));
    assert.deepEqual(storedBookings(), [original.body]);
  }
  for (const overrides of [
    { startTime: "13:00", endTime: "14:00" },
    { startTime: "15:00", endTime: "16:00" },
    { roomId: expectedRooms[1].id },
    { date: "2026-11-13" },
  ]) {
    assert.equal((await request("/api/bookings", {
      method: "POST", body: booking(overrides),
    })).status, 201, JSON.stringify(overrides));
  }
  assert.equal(storedBookings().length, 5);
});

test("simultaneous requests preserve every booking and generate distinct IDs", async () => {
  const results = await Promise.all(Array.from({ length: 12 }, (_, index) => request("/api/bookings", {
    method: "POST",
    body: booking({ date: `2026-12-${String(index + 1).padStart(2, "0")}` }),
  })));
  for (const result of results) {
    assert.equal(result.status, 201);
    assert.equal(typeof result.body.id, "string");
    assert.ok(result.body.id);
  }
  const ids = results.map((result) => result.body.id);
  assert.equal(new Set(ids).size, results.length);
  assert.deepEqual(storedBookings().map((entry) => entry.id).sort(), ids.sort());
  assert.equal((await request("/api/bookings")).body.length, results.length);
});

test("malformed JSON and invalid request bodies produce JSON errors", async () => {
  for (const rawBody of ['{"roomId":', "null", '"booking"', "[]"]) {
    assertError(await request("/api/bookings", { method: "POST", rawBody }), 400, rawBody);
  }
  assertError(await request("/api/bookings", { method: "POST" }), 400);
  assertError(await request("/api/bookings/unknown", { method: "DELETE" }), 404);
  assert.deepEqual(storedBookings(), []);
});

test("the server serves all three pages with navigation and their application scripts", async () => {
  const pages = [
    ["/", "room-list", "rooms.js"],
    ["/booking.html", "booking-form", "booking.js"],
    ["/my-bookings.html", "bookings-list", "my-bookings.js"],
  ];
  for (const [route, container, script] of pages) {
    const response = await fetch(`${baseUrl}${route}`);
    assert.equal(response.status, 200, route);
    assert.match(response.headers.get("content-type") || "", /text\/html/);
    const html = await response.text();
    assert.ok(html.includes(`id="${container}"`), `${route}: application container`);
    for (const destination of ["index.html", "booking.html", "my-bookings.html"]) {
      assert.ok(html.includes(`href="${destination}"`), `${route}: navigation to ${destination}`);
    }
    assert.ok(html.includes('src="js/api.js"'), `${route}: API script`);
    assert.ok(html.includes(`src="js/${script}"`), `${route}: page script`);
  }
  const style = await fetch(`${baseUrl}/css/style.css`);
  assert.equal(style.status, 200);
  assert.match(style.headers.get("content-type") || "", /text\/css/);
});
