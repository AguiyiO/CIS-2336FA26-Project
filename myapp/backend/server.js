// Express serves the frontend and the JSON API from the same origin.

const express = require("express");
const path = require("path");

const roomsRouter = require("./routes/rooms");
const bookingsRouter = require("./routes/bookings");

const app = express();
const PORT = Number(process.env.PORT || 3000);

// Allow Express to read JSON request bodies (needed for POST /api/bookings)
app.use(express.json());

// Serve the frontend folder as static files
app.use(express.static(path.join(__dirname, "..", "frontend")));

// API routes
app.use("/api/rooms", roomsRouter);
app.use("/api/bookings", bookingsRouter);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "API endpoint not found" });
});

// Express catches synchronous route errors, including JSON file read/write errors.
app.use((error, req, res, next) => {
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Request body must contain valid JSON." });
  }

  if (error.type === "entity.too.large") {
    return res.status(413).json({ error: "Request body is too large." });
  }

  console.error("Unable to complete request:", error);
  res.status(500).json({ error: "Unable to complete your request. Please try again." });
});

// Importing the app lets tests use an available port without starting a second server.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
