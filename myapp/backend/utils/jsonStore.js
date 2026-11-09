// Small helper for reading/writing our JSON "database" files.

const fs = require("fs");
const path = require("path");

// Tests can point to a temporary directory without changing the app's data.
const DATA_DIR = process.env.BOOKING_DATA_DIR
  ? path.resolve(process.env.BOOKING_DATA_DIR)
  : path.join(__dirname, "..", "data");

function readData(fileName) {
  const filePath = path.join(DATA_DIR, fileName);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function writeData(fileName, data) {
  const filePath = path.join(DATA_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

module.exports = { readData, writeData };
