// Rooms API: list every room or look up one room by its ID.

const express = require("express");
const router = express.Router();
const { readData } = require("../utils/jsonStore");

// GET /api/rooms
router.get("/", (req, res) => {
  const rooms = readData("rooms.json");
  res.json(rooms);
});

// GET /api/rooms/:id
router.get("/:id", (req, res) => {
  const rooms = readData("rooms.json");
  const room = rooms.find((item) => item.id === req.params.id);

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  res.json(room);
});

module.exports = router;
