let stationsList = [];

async function fetchStations() {
    const url = "https://environment.data.gov.uk/flood-monitoring/id/stations";
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.items;
    } catch (error) {
        console.error("Error fetching stations:", error);
        return [];
    }
}

async function populateStations() {
stationsList = await fetchStations();
const select = document.getElementById("stationSelect");
const defaultOption = document.createElement("option");
defaultOption.value = "";
defaultOption.textContent = "Select Station";
defaultOption.disabled = true;
defaultOption.selected = true;
select.appendChild(defaultOption);

stationsList.forEach(station => {
const option = document.createElement("option");
option.value = station["@id"].split("/").pop();
option.textContent = station.label;
select.appendChild(option);
});
}


function filterStations() {
    const input = document.getElementById("searchInput").value.toLowerCase();
    const select = document.getElementById("stationSelect");
    select.innerHTML = "";

    stationsList.forEach(station => {
        if (station.label.toLowerCase().includes(input)) {
            const option = document.createElement("option");
            option.value = station["@id"].split("/").pop();
            option.textContent = station.label;
            select.appendChild(option);
        }
    });
}

async function fetchStationData(stationId) {
    if (!stationId) return [];

    const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const url = `https://environment.data.gov.uk/flood-monitoring/id/stations/${stationId}/readings?since=${past24Hours}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.items || [];
    } catch (error) {
        console.error("Error fetching station data:", error);
        return [];
    }
}

async function loadStationData() {
const stationId = document.getElementById("stationSelect").value;
if (!stationId) return;

document.getElementById("loadingIndicator").style.display = "inline-block";
const readings = await fetchStationData(stationId);
document.getElementById("loadingIndicator").style.display = "none";

const tableBody = document.querySelector("#dataTable tbody");
tableBody.innerHTML = "";

const labels = [];
const dataPoints = [];

readings.forEach(reading => {
const dateTime = new Date(reading.dateTime);
if (isNaN(dateTime)) {
    console.warn("Invalid date-time value:", reading.dateTime);
    return;
}
const formattedDate = dateTime.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
});
const formattedTime = dateTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
});
const fullDateTime = `${formattedDate} ${formattedTime}`;
const row = tableBody.insertRow();
row.insertCell(0).textContent = fullDateTime;
row.insertCell(1).textContent = reading.value;
labels.push(formattedTime);
dataPoints.push(reading.value);
});

updateChart(labels, dataPoints);
}

let chart;
function updateChart(labels, data) {
    const ctx = document.getElementById("chartCanvas").getContext("2d");
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Water Level (m)",
                data: data,
                borderColor: "#18677a",
                backgroundColor: "rgba(24, 103, 122, 0.2)",
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        }
    });
}

let sortDirections = [true, true];

function sortTable(columnIndex) {
const table = document.getElementById("dataTable");
const rows = Array.from(table.querySelectorAll("tbody tr"));

const isAscending = sortDirections[columnIndex];
sortDirections[columnIndex] = !isAscending;

rows.sort((a, b) => {
let aText = a.cells[columnIndex].textContent.trim();
let bText = b.cells[columnIndex].textContent.trim();

if (columnIndex === 0) {
    const aDate = new Date(aText);
    const bDate = new Date(bText);
    if (isNaN(aDate) || isNaN(bDate)) {
        return 0;
    }

    return isAscending ? aDate - bDate : bDate - aDate;
}
if (!isNaN(aText) && !isNaN(bText)) {
    return isAscending ? parseFloat(aText) - parseFloat(bText) : parseFloat(bText) - parseFloat(aText);
}

return isAscending ? aText.localeCompare(bText) : bText.localeCompare(aText);
});

rows.forEach(row => table.querySelector("tbody").appendChild(row));
}

populateStations();