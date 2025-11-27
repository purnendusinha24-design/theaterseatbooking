// app.js – Sugarland Theaters responsive seat selector with fake booking + localStorage

// CONFIGURATION
const ROWS = 8;
const COLS = 12;
const BASE_PRICE = 10;
const BOOKING_STORAGE_KEY = "sugarlandLastBooking";

// Example of pre-occupied seats (row-col codes)
const OCCUPIED = new Set([
  "A-5", "A-6", "A-7",
  "B-3", "B-4",
  "C-8", "C-9",
  "D-1", "D-2",
  "F-10", "F-11", "F-12"
]);

// Sector definitions by column range
const SECTORS = {
  all:   null,           // no restriction
  left:  { from: 1,  to: 4  },
  center:{ from: 5,  to: 8  },
  right: { from: 9,  to: 12 }
};

let currentSector = "all";

// Slight price variation by row (front cheaper, center more, back slightly cheaper again)
function priceForRow(rowIndex) {
  if (rowIndex <= 1) return BASE_PRICE - 2;
  if (rowIndex <= 4) return BASE_PRICE + 1;
  return BASE_PRICE;
}

// DOM REFERENCES
const seatsGrid = document.getElementById("seatsGrid");
const selectedList = document.getElementById("selectedList");
const selectedCount = document.getElementById("selectedCount");
const totalPrice = document.getElementById("totalPrice");
const modeLabel = document.getElementById("modeLabel");
const controlsHint = document.getElementById("controlsHint");

const clearBtn = document.getElementById("clearBtn");
const confirmBtn = document.getElementById("confirmBtn");

// mobile bar
const mobileCount = document.getElementById("mobileCount");
const mobileTotal = document.getElementById("mobileTotal");
const mobileConfirmBtn = document.getElementById("mobileConfirmBtn");

// sector buttons
let sectorButtons = [];

// fake booking overlay
const bookingOverlay = document.getElementById("bookingOverlay");
const bookingSummary = document.getElementById("bookingSummary");
const bookingHint = document.getElementById("bookingHint");
const bookingConfirmBtn = document.getElementById("bookingConfirmBtn");
const bookingCancelBtn = document.getElementById("bookingCancelBtn");
const customerNameInput = document.getElementById("customerName");
const customerEmailInput = document.getElementById("customerEmail");

// last booking info
const lastBookingInfo = document.getElementById("lastBookingInfo");

// STATE
// key = "A-1" value = {row, col, price}
const selectedSeats = new Map();

// HELPERS
function rowLabel(index) {
  return String.fromCharCode("A".charCodeAt(0) + index);
}

// For future use (dates from APIs)
function formatDate(yyyymmdd) {
  const s = String(yyyymmdd);
  const y = s.slice(0, 4);
  const m = s.slice(4, 6);
  const d = s.slice(6, 8);
  return `${y}/${m}/${d}`;
}

function getLayoutMode() {
  const w = window.innerWidth;
  if (w <= 540) return "mobile";
  if (w <= 900) return "tablet";
  return "desktop";
}

function updateModeLabel() {
  const mode = getLayoutMode();
  let label;
  let hint;

  if (mode === "desktop") {
    label = "Desktop layout · full seat map with side controls.";
    hint = "Click seats to select. Use the side buttons to clear or continue.";
  } else if (mode === "tablet") {
    label = "Tablet layout · condensed map and stacked controls.";
    hint = "Tap seats to select. Summary appears beside the map.";
  } else {
    label = "Mobile layout · sector view with larger touch targets and bottom booking bar.";
    hint = "Tap a sector (Left, Center, Right) to zoom, then tap seats to select.";
  }

  modeLabel.textContent = label;
  controlsHint.textContent = hint;
}

// BUILD SEAT GRID (respects sector & existing selections)
function buildGrid() {
  seatsGrid.innerHTML = "";

  const sector = SECTORS[currentSector]; // null or {from,to}

  for (let r = 0; r < ROWS; r++) {
    const rowName = rowLabel(r);

    // Row label
    const label = document.createElement("div");
    label.className = "row-label";
    label.textContent = `Row ${rowName}`;
    seatsGrid.appendChild(label);

    for (let c = 1; c <= COLS; c++) {
      // skip seats outside current sector (except when sector = all)
      if (sector && (c < sector.from || c > sector.to)) continue;

      const code = `${rowName}-${c}`;
      const seat = document.createElement("button");
      seat.type = "button";
      seat.className = "seat";

      seat.dataset.code = code;
      seat.dataset.row = rowName;
      seat.dataset.col = c;

      const occupied = OCCUPIED.has(code);
      const rowIndex = r;
      const price = priceForRow(rowIndex);

      // aria and tooltip -> show row / seat number
      const labelText = `Row ${rowName}, Seat ${c} (${occupied ? "occupied" : "available"})`;
      seat.setAttribute("aria-label", labelText);
      seat.title = `Row ${rowName}, Seat ${c}`;

      // apply state classes
      if (occupied) {
        seat.classList.add("occupied");
        seat.disabled = true;
      } else {
        seat.classList.add("available");
      }

      // if previously selected, mark as selected
      if (selectedSeats.has(code)) {
        seat.classList.add("selected");
      }

      seat.addEventListener("click", () => handleSeatClick(seat, rowIndex, price));

      seatsGrid.appendChild(seat);
    }
  }
}

// SEAT CLICK HANDLING
function handleSeatClick(seatEl, rowIndex, price) {
  const code = seatEl.dataset.code;
  const row = seatEl.dataset.row;
  const col = Number(seatEl.dataset.col);

  if (selectedSeats.has(code)) {
    selectedSeats.delete(code);
    seatEl.classList.remove("selected");
  } else {
    selectedSeats.set(code, { row, col, price });
    seatEl.classList.add("selected");
  }

  refreshSummary();
}

function handleClear() {
  selectedSeats.clear();
  document.querySelectorAll(".seat.selected").forEach(seat => {
    seat.classList.remove("selected");
  });
  refreshSummary();
}

// SECTOR CONTROLS
function handleSectorClick(key) {
  if (currentSector === key) return;
  currentSector = key;

  // toggle button styles
  sectorButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.sector === key);
  });

  // rebuild grid for new sector, keeping selections
  buildGrid();
}

// SUMMARY / TOTALS
function calculateTotal() {
  let total = 0;
  for (const { price } of selectedSeats.values()) {
    total += price;
  }
  return total;
}

function refreshSummary() {
  const count = selectedSeats.size;
  const total = calculateTotal();

  selectedCount.textContent = count;
  totalPrice.textContent = total;

  mobileCount.textContent = count;
  mobileTotal.textContent = total;

  selectedList.innerHTML = "";
  if (count === 0) {
    const li = document.createElement("li");
    li.className = "placeholder";
    li.textContent = "No seats selected yet.";
    selectedList.appendChild(li);
  } else {
    const sorted = Array.from(selectedSeats.entries()).sort(
      ([codeA], [codeB]) => (codeA < codeB ? -1 : 1)
    );
    for (const [code, info] of sorted) {
      const li = document.createElement("li");
      li.textContent = `${code} – $${info.price}`;
      selectedList.appendChild(li);
    }
  }

  const disabled = count === 0;
  clearBtn.disabled = disabled;
  confirmBtn.disabled = disabled;
  mobileConfirmBtn.disabled = disabled;
}

// FAKE BOOKING STEP + LOCAL STORAGE
function openBookingStep(context) {
  if (selectedSeats.size === 0) {
    alert("Please select at least one seat.");
    return;
  }

  const count = selectedSeats.size;
  const total = calculateTotal();
  const seatsStr = Array.from(selectedSeats.entries())
    .map(([code]) => code)
    .sort()
    .join(", ");

  bookingSummary.textContent = `${count} seat(s): ${seatsStr} · Total $${total}`;
  bookingHint.textContent =
    `This is a simulated ${context} checkout. Your booking will be saved locally in this browser.`;

  // reset inputs
  customerNameInput.value = "";
  customerEmailInput.value = "";

  bookingOverlay.hidden = false;
}

function closeBookingStep() {
  bookingOverlay.hidden = true;
}

function saveBookingToLocalStorage() {
  const name = customerNameInput.value.trim();
  const email = customerEmailInput.value.trim();
  const seats = Array.from(selectedSeats.entries()).map(([code, info]) => ({
    code,
    row: info.row,
    col: info.col,
    price: info.price
  }));

  const booking = {
    name,
    email,
    seats,
    total: calculateTotal(),
    time: Date.now()
  };

  try {
    localStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify(booking));
  } catch (err) {
    console.error("Error saving booking to localStorage:", err);
  }

  updateLastBookingInfo();
}

function updateLastBookingInfo() {
  if (!lastBookingInfo) return;

  let raw;
  try {
    raw = localStorage.getItem(BOOKING_STORAGE_KEY);
  } catch (err) {
    console.error("Error reading booking from localStorage:", err);
    return;
  }

  if (!raw) {
    lastBookingInfo.textContent = "";
    return;
  }

  try {
    const booking = JSON.parse(raw);
    if (!booking || !booking.seats || !booking.seats.length) {
      lastBookingInfo.textContent = "";
      return;
    }

    const seatsText = booking.seats.map(s => s.code).join(", ");
    const when = new Date(booking.time).toLocaleString();

    lastBookingInfo.textContent =
      `Last booking (${when}): ${seatsText} · $${booking.total}`;

  } catch (err) {
    console.error("Error parsing booking JSON:", err);
  }
}

// INIT
function init() {
  // sector buttons
  sectorButtons = Array.from(document.querySelectorAll(".sector-btn"));
  sectorButtons.forEach(btn => {
    btn.addEventListener("click", () => handleSectorClick(btn.dataset.sector));
  });

  buildGrid();
  updateModeLabel();
  refreshSummary();
  updateLastBookingInfo();

  clearBtn.addEventListener("click", handleClear);
  confirmBtn.addEventListener("click", () => openBookingStep("Desktop/Tablet"));
  mobileConfirmBtn.addEventListener("click", () => openBookingStep("Mobile"));

  bookingCancelBtn.addEventListener("click", closeBookingStep);
  bookingOverlay.addEventListener("click", e => {
    if (e.target === bookingOverlay) closeBookingStep();
  });

  bookingConfirmBtn.addEventListener("click", () => {
    saveBookingToLocalStorage();
    closeBookingStep();
    alert("Booking completed (fake)! It has been saved in this browser only.");
    handleClear();
  });

  window.addEventListener("resize", updateModeLabel);
}

document.addEventListener("DOMContentLoaded", init);
