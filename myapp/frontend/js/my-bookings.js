// Show persisted reservations and remove each one after successful cancellation.
async function renderBookings() {
  const container = document.getElementById("bookings-list");
  container.textContent = "Loading bookings...";
  try {
    const [bookings, rooms] = await Promise.all([getBookings(), getRooms()]);
    container.replaceChildren();
    if (bookings.length === 0) {
      showEmptyBookings(container);
      return;
    }

    bookings.sort((first, second) =>
      `${first.date} ${first.startTime}`.localeCompare(`${second.date} ${second.startTime}`)
    );
    for (const booking of bookings) {
      const room = rooms.find((item) => item.id === booking.roomId);
      const card = document.createElement("article");
      card.className = "booking-item";
      const details = document.createElement("div");
      const title = document.createElement("h2");
      title.textContent = room ? room.name : booking.roomId;
      const club = document.createElement("p");
      club.className = "booking-club";
      club.textContent = booking.clubName;
      const schedule = document.createElement("p");
      schedule.textContent = `${booking.date} | ${booking.startTime} - ${booking.endTime}`;
      const purpose = document.createElement("p");
      purpose.textContent = booking.purpose || "No purpose provided.";
      details.append(title, club, schedule, purpose);

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Cancel";
      button.dataset.id = booking.id;
      button.setAttribute("aria-label", `Cancel booking for ${booking.clubName} on ${booking.date}`);
      button.addEventListener("click", () => handleCancelClick(booking.id, button, card));
      card.append(details, button);
      container.appendChild(card);
    }
  } catch (error) {
    container.classList.add("error");
    container.textContent = `Could not load bookings. ${error.message} Refresh this page to retry.`;
  }
}

function showEmptyBookings(container) {
  const message = document.createElement("p");
  message.textContent = "There are no bookings yet.";
  const link = document.createElement("a");
  link.href = "booking.html";
  link.textContent = "Book a room for your club";
  container.replaceChildren(message, link);
}

async function handleCancelClick(bookingId, button, card) {
  if (button.disabled) return;
  const status = document.getElementById("bookings-status");
  button.disabled = true;
  button.textContent = "Canceling...";
  status.className = "status-message";
  status.textContent = "Canceling booking...";
  try {
    await deleteBooking(bookingId);
    card.remove();
    const container = document.getElementById("bookings-list");
    if (!container.querySelector(".booking-item")) showEmptyBookings(container);
    status.className = "status-message success";
    status.textContent = "Booking canceled.";
  } catch (error) {
    status.className = "status-message error";
    status.textContent = error.message;
    button.disabled = false;
    button.textContent = "Cancel";
  }
}

document.addEventListener("DOMContentLoaded", renderBookings);
