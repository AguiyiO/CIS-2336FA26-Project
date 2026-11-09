// Bookings API: read, validate, save, and cancel room reservations.

const express = require("express");
const { randomUUID } = require("crypto");
const { readData, writeData } = require("../utils/jsonStore");
const router = express.Router();

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000-")) {
    return false;
  }

  // Comparing the parsed date catches impossible dates such as February 30.
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isValidTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

// GET /api/bookings
router.get("/", (req, res) => {
  res.json(readData("bookings.json"));
});

// POST /api/bookings
router.post("/", (req, res) => {
  const fields = req.body;
  if (!fields || typeof fields !== "object" || Array.isArray(fields)) {
    return res.status(400).json({ error: "Send a booking as a JSON object." });
  }

  const requiredFields = ["roomId", "clubName", "date", "startTime", "endTime"];
  for (const name of requiredFields) {
    if (typeof fields[name] !== "string" || !fields[name].trim()) {
      return res.status(400).json({ error: `${name} is required and must be a nonempty string.` });
    }
  }

  if (fields.purpose !== undefined && typeof fields.purpose !== "string") {
    return res.status(400).json({ error: "purpose must be a string." });
  }

  const roomId = fields.roomId.trim();
  const clubName = fields.clubName.trim();
  const date = fields.date.trim();
  const startTime = fields.startTime.trim();
  const endTime = fields.endTime.trim();
  const purpose = (fields.purpose || "").trim();

  if (!isValidDate(date)) {
    return res.status(400).json({ error: "date must be a valid calendar date in YYYY-MM-DD format." });
  }

  if (!isValidTime(startTime) || !isValidTime(endTime)) {
    return res.status(400).json({ error: "Times must use 24-hour HH:MM format." });
  }

  // Zero-padded HH:MM strings sort in the same order as their times.
  if (endTime <= startTime) {
    return res.status(400).json({ error: "End time must be after start time on the same day." });
  }

  const rooms = readData("rooms.json");
  if (!rooms.some((room) => room.id === roomId)) {
    return res.status(400).json({ error: "Choose an existing room." });
  }

  const bookings = readData("bookings.json");
  const overlaps = bookings.some((booking) =>
    booking.roomId === roomId &&
    booking.date === date &&
    startTime < booking.endTime &&
    endTime > booking.startTime
  );

  if (overlaps) {
    return res.status(409).json({ error: "This room is already booked during that time. Choose another time or room." });
  }

  const newBooking = {
    id: randomUUID(),
    roomId,
    clubName,
    date,
    startTime,
    endTime,
    purpose,
  };

  bookings.push(newBooking);
  writeData("bookings.json", bookings);
  res.status(201).json(newBooking);
});

// DELETE /api/bookings/:id
router.delete("/:id", (req, res) => {
  const bookings = readData("bookings.json");
  const remainingBookings = bookings.filter((booking) => booking.id !== req.params.id);

  if (remainingBookings.length === bookings.length) {
    return res.status(404).json({ error: "Booking not found" });
  }

  writeData("bookings.json", remainingBookings);
  res.json({ message: "Booking canceled" });
});

module.exports = router;
