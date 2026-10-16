import {
  travelNotes,
  travelYears,
  travelRange,
  RECENT_COUNT,
  selectTravelNotes,
} from "./data/travel.mjs";

const grid = document.querySelector("#expedition-grid");
const filterHost = document.querySelector("#year-filters");
const status = document.querySelector("#atlas-status");
const moreButton = document.querySelector("#atlas-more");
let selectedYear = "all";
let showAll = false;

document.querySelector("#travel-total").textContent = String(
  travelNotes.length,
);
document.querySelector("#travel-range").textContent = travelRange;

for (const year of ["all", ...travelYears]) {
  const button = document.createElement("button");
  button.className = "year-filter";
  button.type = "button";
  button.dataset.year = year;
  button.textContent = year === "all" ? "All years" : year;
  button.setAttribute("aria-pressed", String(year === selectedYear));
  button.setAttribute("aria-controls", "expedition-grid");
  button.addEventListener("click", () => {
    selectedYear = year;
    showAll = false;
    renderTravel();
  });
  filterHost.append(button);
}

function renderTravel() {
  const { matching, visible } = selectTravelNotes(selectedYear, showAll);
  const cards = visible.map((note) => {
    const card = document.createElement("article");
    card.className = "expedition-note";
    const date = document.createElement("p");
    date.className = "note-date";
    date.textContent = note.period;
    const title = document.createElement("h3");
    title.textContent = note.place;
    const country = document.createElement("p");
    country.className = "note-country";
    country.textContent = note.country;
    card.append(date, title, country);
    return card;
  });
  grid.replaceChildren(...cards);
  status.textContent =
    selectedYear === "all"
      ? `Showing ${visible.length} of ${matching.length} travel notes.`
      : `${matching.length} travel ${matching.length === 1 ? "note" : "notes"} starting in ${selectedYear}.`;
  for (const button of filterHost.querySelectorAll("button")) {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.year === selectedYear),
    );
  }
  moreButton.hidden = selectedYear !== "all" || matching.length <= RECENT_COUNT;
  moreButton.setAttribute("aria-expanded", String(showAll));
  moreButton.setAttribute("aria-controls", "expedition-grid");
  moreButton.textContent = showAll
    ? "Show recent notes ↑"
    : `Show all ${travelNotes.length} travel notes ↓`;
}

moreButton.addEventListener("click", () => {
  showAll = !showAll;
  renderTravel();
  // Keep the collapse control visible after the long list becomes short again.
  if (!showAll) moreButton.scrollIntoView({ block: "nearest" });
});
renderTravel();
