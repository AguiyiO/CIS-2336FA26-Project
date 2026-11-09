// Fill the form from the API and save a reservation when it is submitted.
async function populateRoomSelect() {
  const select = document.getElementById("room-select");
  const button = document.querySelector("#booking-form button[type='submit']");
  const status = document.getElementById("form-status");
  select.disabled = true;
  button.disabled = true;
  status.textContent = "Loading rooms...";

  try {
    const rooms = await getRooms();
    for (const room of rooms) {
      const option = document.createElement("option");
      option.value = room.id;
      option.textContent = `${room.name} (${room.capacity} people)`;
      select.appendChild(option);
    }

    if (rooms.length === 0) {
      status.textContent = "No rooms are available to book right now. Please check again later.";
      return;
    }

    // Room cards link directly to this form with that room selected.
    const requestedRoom = new URLSearchParams(window.location.search).get("roomId");
    if (rooms.some((room) => room.id === requestedRoom)) {
      select.value = requestedRoom;
    }
    select.disabled = false;
    button.disabled = false;
    status.textContent = "";
  } catch (error) {
    status.className = "status-message error";
    status.textContent = `Could not load rooms. ${error.message} Refresh this page to retry.`;
  }
}

async function handleBookingSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector("button[type='submit']");
  const status = document.getElementById("form-status");
  if (button.disabled) return;

  const bookingData = {
    roomId: document.getElementById("room-select").value,
    clubName: document.getElementById("club-name").value.trim(),
    date: document.getElementById("date").value,
    startTime: document.getElementById("start-time").value,
    endTime: document.getElementById("end-time").value,
    purpose: document.getElementById("purpose").value.trim(),
  };

  status.className = "status-message error";
  if (!bookingData.roomId || !bookingData.clubName || !bookingData.date ||
      !bookingData.startTime || !bookingData.endTime) {
    status.textContent = "Please complete all required fields, including a club name.";
    return;
  }
  if (bookingData.endTime <= bookingData.startTime) {
    status.textContent = "End time must be after start time on the same day.";
    document.getElementById("end-time").focus();
    return;
  }

  button.disabled = true;
  button.textContent = "Saving booking...";
  status.className = "status-message";
  status.textContent = "Saving your booking...";
  try {
    await createBooking(bookingData);
    form.reset();
    status.className = "status-message success";
    status.textContent = "Your room is booked! Visit My Bookings to view or cancel your reservation.";
  } catch (error) {
    status.className = "status-message error";
    status.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Submit Booking";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  populateRoomSelect();
  document.getElementById("booking-form").addEventListener("submit", handleBookingSubmit);
});
