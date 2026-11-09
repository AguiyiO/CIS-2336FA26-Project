// All requests to the Express backend live here. Page scripts only call
// these functions, so they do not need to know how the data is stored.
async function requestJson(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch (error) {
    throw new Error("Unable to reach the server. Please check your connection and try again.");
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error("The server returned an unexpected response. Please try again.");
  }

  if (!response.ok) {
    throw new Error(data.error || "The request could not be completed. Please try again.");
  }
  return data;
}

async function getRooms() {
  return requestJson("/api/rooms");
}

async function getRoomById(id) {
  return requestJson(`/api/rooms/${encodeURIComponent(id)}`);
}

async function getBookings() {
  return requestJson("/api/bookings");
}

async function createBooking(bookingData) {
  return requestJson("/api/bookings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bookingData),
  });
}

async function deleteBooking(id) {
  return requestJson(`/api/bookings/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
