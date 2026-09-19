
const distanceElement = document.getElementById("distance");
const timeElement = document.getElementById("time");
const paceElement = document.getElementById("pace");
const statusElement = document.getElementById("status");

let watchId = null;
let startTime = null;
let elapsedSeconds = 0;
let totalDistance = 0;
let lastPosition = null;
let timerId = null;

let map = null;
let marker = null;
let pathLine = null;
let pathPoints = [];

function initMap() {
  if (typeof L === "undefined" || !document.getElementById("map")) {
    return;
  }

  map = L.map("map", {
    zoomControl: true,
    attributionControl: true
  }).setView([0, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
}

const FOLLOW_ZOOM = 16;

function updateMap(latitude, longitude) {
  if (!map) {
    return;
  }

  const latLng = [latitude, longitude];
  pathPoints.push(latLng);

  if (!pathLine) {
    pathLine = L.polyline(pathPoints, {
      color: "#4facfe",
      weight: 4,
      opacity: 0.85,
      lineJoin: "round"
    }).addTo(map);
  } else {
    pathLine.setLatLngs(pathPoints);
  }

  if (!marker) {
    const gpsIcon = L.divIcon({
      className: "gps-marker-wrapper",
      html: '<div class="gps-marker"></div>',
      iconSize: [14, 14]
    });

    marker = L.marker(latLng, { icon: gpsIcon }).addTo(map);
    map.setView(latLng, FOLLOW_ZOOM);
  } else {
    marker.setLatLng(latLng);
    map.setView(latLng, map.getZoom(), {
      animate: true,
      duration: 0.5
    });
  }
}

function resetMap() {
  pathPoints = [];

  if (pathLine) {
    pathLine.setLatLngs([]);
  }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRadians = (degrees) => degrees * Math.PI / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );
}

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return [
    hours,
    minutes,
    secs
  ]
    .map(value => String(value).padStart(2, "0"))
    .join(":");
}

function updateDisplay() {
  distanceElement.textContent =
    (totalDistance / 1000).toFixed(2);

  timeElement.textContent =
    formatTime(elapsedSeconds);

  const distanceKm = totalDistance / 1000;

  if (distanceKm > 0.05 && elapsedSeconds > 0) {
    const paceSeconds = elapsedSeconds / distanceKm;
    const minutes = Math.floor(paceSeconds / 60);
    const seconds = Math.floor(paceSeconds % 60);

    paceElement.textContent =
      `${minutes}:${String(seconds).padStart(2, "0")} /km`;
  } else {
    paceElement.textContent = "--:-- /km";
  }
}

function handlePosition(position) {
  const { latitude, longitude, accuracy } = position.coords;

  if (accuracy > 50) {
    statusElement.textContent =
      `GPS impreciso (${Math.round(accuracy)}m)`;
    return;
  }

  const currentPosition = {
    latitude,
    longitude
  };

  if (lastPosition) {
    const distance = calculateDistance(
      lastPosition.latitude,
      lastPosition.longitude,
      currentPosition.latitude,
      currentPosition.longitude
    );

    if (distance < 100) {
      totalDistance += distance;
    }
  }

  lastPosition = currentPosition;
  updateDisplay();
  updateMap(latitude, longitude);

  statusElement.textContent = "GPS ativo";
}

function handleError(error) {
  statusElement.textContent =
    `Erro GPS: ${error.message}`;
}

function startRun() {
  if (!navigator.geolocation) {
    statusElement.textContent =
      "GPS não suportado neste navegador";
    return;
  }

  if (!window.isSecureContext) {
    statusElement.textContent =
      "GPS requer HTTPS (origem não é segura)";
    return;
  }

  if (watchId !== null) {
    return;
  }

  startTime = Date.now() - elapsedSeconds * 1000;

  timerId = setInterval(() => {
    elapsedSeconds = (Date.now() - startTime) / 1000;
    updateDisplay();
  }, 1000);

  watchId = navigator.geolocation.watchPosition(
    handlePosition,
    handleError,
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 10000
    }
  );

  statusElement.textContent = "A obter GPS...";
}

function stopRun() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  clearInterval(timerId);
  timerId = null;

  if (startTime !== null) {
    elapsedSeconds = (Date.now() - startTime) / 1000;
  }

  updateDisplay();
  statusElement.textContent = "Corrida parada";
}

function resetRun() {
  stopRun();

  startTime = null;
  elapsedSeconds = 0;
  totalDistance = 0;
  lastPosition = null;
  resetMap();

  updateDisplay();
  statusElement.textContent = "Pronto para começar";
}

updateDisplay();
initMap();

// Auto-start ao carregar: permite usar esta página como Web Source no PRISM
// Live Studio (ou noutro OBS-like), onde não é possível clicar num botão.
startRun();