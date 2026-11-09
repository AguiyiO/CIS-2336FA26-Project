// Build DOM elements with textContent so data is always displayed as text.
async function renderRooms() {
  const container = document.getElementById("room-list");
  try {
    const rooms = await getRooms();
    container.replaceChildren();
    if (rooms.length === 0) {
      container.textContent = "No rooms are available right now. Please check again later.";
      return;
    }
    for (const room of rooms) {
      container.appendChild(roomToCard(room));
    }
  } catch (error) {
    container.classList.add("error");
    container.textContent = `Could not load rooms. ${error.message} Refresh this page to retry.`;
  }
}

function roomToCard(room) {
  const card = document.createElement("article");
  card.className = "room-card";

  const title = document.createElement("h3");
  title.textContent = room.name;
  const capacity = document.createElement("p");
  capacity.textContent = `Capacity: ${room.capacity} people`;
  const equipmentTitle = document.createElement("p");
  equipmentTitle.className = "equipment-label";
  equipmentTitle.textContent = "Equipment";
  const equipment = document.createElement("ul");
  for (const item of room.equipment) {
    const listItem = document.createElement("li");
    listItem.textContent = item;
    equipment.appendChild(listItem);
  }
  const badge = document.createElement("span");
  badge.className = `badge ${room.foodAllowed ? "food-yes" : "food-no"}`;
  badge.textContent = room.foodAllowed ? "Food Allowed" : "No Food";
  const link = document.createElement("a");
  link.className = "room-book-link";
  link.href = `booking.html?roomId=${encodeURIComponent(room.id)}`;
  link.textContent = "Book this room";
  link.setAttribute("aria-label", `Book ${room.name}`);

  card.append(title, capacity, equipmentTitle, equipment, badge, link);
  return card;
}

document.addEventListener("DOMContentLoaded", renderRooms);
