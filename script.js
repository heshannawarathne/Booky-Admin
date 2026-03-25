
mapboxgl.accessToken = 'pk.eyJ1IjoicHJhbW9kOTE4NCIsImEiOiJjbW12eXF4YnIwbWdhMnNwejVweGQ1ODR5In0.VypLwtDMmky5fa7kKF4Hyg'; 
// Firebase Configuration

const firebaseConfig = {
  apiKey: "AIzaSyB26tawJ3La7cSldcfP6ldyfZNf2HdFafc",
  authDomain: "bookyapp-bef0e.firebaseapp.com",
  databaseURL: "https://bookyapp-bef0e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bookyapp-bef0e",
  storageBucket: "bookyapp-bef0e.firebasestorage.app",
  messagingSenderId: "145154911764",
  appId: "1:145154911764:web:2be47f7c68f39d85df4101",
  measurementId: "G-4GH90XM7P7"
};

// Firebase Initialize
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global modal instance
let editModal;

// ------------------------- DASHBOARD STATS -------------------------
function loadDashboardStats() {
    db.collection("Users").onSnapshot(snap => {
        document.getElementById("totalUsersCount").innerText = snap.size;
    });

    db.collection("Bookings").onSnapshot(snap => {
        document.getElementById("totalBookingsCount").innerText = snap.size;
        let totalRevenue = 0;
        snap.forEach(doc => {
            totalRevenue += (doc.data().totalPrice || 0);
        });
        document.getElementById("revenueTotal").innerText = totalRevenue.toLocaleString();
    });

    db.collection("Schedules").onSnapshot(snap => {
        document.getElementById("activeBusesCount").innerText = snap.size;
    });
}

// ------------------------- LOCATIONS (CITIES) -------------------------
function fetchLocations() {
    const tbody = document.getElementById("locationTableBody");
    const fromCity = document.getElementById("fromCity");
    const toCity = document.getElementById("toCity");

    if (!tbody) return;

    // Real-time listener for Locations collection
    db.collection("Locations").onSnapshot((querySnapshot) => {
        tbody.innerHTML = ""; 
        let options = '<option value="">Select City</option>';

        if (querySnapshot.empty) {
            console.warn("No locations found in Firebase!");
            tbody.innerHTML = '<tr><td colspan="3" class="text-center">No locations added yet.</td></tr>';
        }

        querySnapshot.forEach((doc) => {
            const cityName = doc.id; // මෙතන doc.id කියන්නේ City name එක
            
            // Table එක update කිරීම
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${cityName.substring(0, 5)}...</td> 
                <td><i class="fas fa-location-dot me-2 text-teal"></i>${cityName}</td>
                <td>
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteLocation('${cityName}')">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(tr);

            // Dropdown options එකතු කිරීම
            options += `<option value="${cityName}">${cityName}</option>`;
        });

        // Dropdowns update කිරීම
        if (fromCity) fromCity.innerHTML = options;
        if (toCity) toCity.innerHTML = options;
        
        console.log("Locations updated successfully.");
    }, (error) => {
        console.error("Error fetching locations: ", error);
    });
}

async function addLocation() {
    const input = document.getElementById("cityName");
    const name = input.value.trim();
    
    // 1. නම ඇතුළත් කරලා නැත්නම් alert එකක් දෙනවා
    if (!name) return alert("Enter city name!");

    // 2. මැප් එකේ ලොකේෂන් එකක් සිලෙක්ට් කරලා නැත්නම් alert එකක් දෙනවා
    // (selectedLocation කියන්නේ mapLocations.on('click') එකෙන් අපිට ලැබෙන අගය)
    if (!selectedLocation) {
        return alert("Please click on the map to select the exact location!");
    }

    try {
        // 3. දැන් අපි Mapbox API එකට කෝල් කරන්නේ නැහැ. 
        // කෙලින්ම මැප් එකෙන් ගත්ත coordinates (selectedLocation) Firestore එකට දානවා.
        const docRef = db.collection("Locations").doc(name);
        
        await docRef.set({
            name: name,
            lng: selectedLocation.lng, // හරියටම මැප් එකේ ක්ලික් කරපු තැන
            lat: selectedLocation.lat, // හරියටම මැප් එකේ ක්ලික් කරපු තැන
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(name + " added with exact map coordinates!");

        // 4. සේව් වුණාට පස්සේ form එක සහ මැප් එකේ මාකර් එක clear කරනවා
        input.value = "";
        if (locMarker) locMarker.remove();
        selectedLocation = null;

    } catch (err) {
        alert("Error: " + err.message);
    }
}

function deleteLocation(id) {
    if(confirm("Are you sure you want to delete this city?")) {
        db.collection("Locations").doc(id).delete();
    }
}

function renderCitySelects(snapshot) {
    const fromCity = document.getElementById("fromCity");
    const toCity = document.getElementById("toCity");
    if (!fromCity || !toCity) return;

    let options = '<option value="">Select City</option>';
    snapshot.forEach(doc => {
        options += `<option value="${doc.id}">${doc.id}</option>`;
    });
    fromCity.innerHTML = options;
    toCity.innerHTML = options;
}


// ------------------------- BOOKINGS (FILTERED) -------------------------
function loadBusListForFilter() {
    const busFilter = document.getElementById("busFilter");
    if (!busFilter) return;

    db.collection("Bookings").onSnapshot((querySnapshot) => {
        busFilter.innerHTML = '<option value="">All Buses (Select to Filter)</option>';
        let busNumbers = new Set();
        querySnapshot.forEach((doc) => {
            const bookingData = doc.data();
            if (bookingData.busNo) busNumbers.add(bookingData.busNo);
        });

        busNumbers.forEach((busNo) => {
            const option = document.createElement("option");
            option.value = busNo;
            option.textContent = busNo;
            busFilter.appendChild(option);
        });
    });
}

function fetchFilteredBookings() {
    const busFilterElement = document.getElementById("busFilter");
    const dateFilterElement = document.getElementById("dateFilter");
    const tbody = document.getElementById("bookingsTableBody");

    if (!tbody) return;

    const selectedBus = busFilterElement.value;
    const rawDate = dateFilterElement.value; 

    let query = db.collection("Bookings");

    if (selectedBus !== "") {
        query = query.where("busNo", "==", selectedBus);
    }

    if (rawDate !== "") {
        const dateObj = new Date(rawDate);
        const day = dateObj.getDate();
        const month = dateObj.toLocaleString('en-GB', { month: 'short' });
        const year = dateObj.getFullYear();
        const formattedDate = `${day} ${month} ${year}`;
        query = query.where("date", "==", formattedDate);
    }

    query.onSnapshot((querySnapshot) => {
        tbody.innerHTML = "";

        if (querySnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">
                <i class="fas fa-search d-block mb-2 fs-3"></i>
                No bookings found for <b>${selectedBus || 'this bus'}</b> on <b>${rawDate || 'this date'}</b>.
            </td></tr>`;
            return;
        }

        const now = new Date();

        querySnapshot.forEach((doc) => {
            const booking = doc.data();
            const seatsList = booking.seats ? booking.seats.join(", ") : "N/A";
            
            // Check if bus departure time has passed
            const bookingDateTime = new Date(`${booking.date} ${booking.time}`);
            const isExpired = now > bookingDateTime;

            const tr = document.createElement("tr");
            if (isExpired) tr.style.opacity = "0.6";

            tr.innerHTML = `
                <td><small class="text-muted fw-bold">#${doc.id.substring(0,8)}</small></td>
                <td>
                    <div class="fw-semibold" style="font-size: 0.85rem;">${booking.email || "Guest"}</div>
                </td>
                <td>
                    <span class="badge bg-light text-dark border">
                        <i class="fas fa-bus me-1"></i> ${booking.busNo}
                    </span>
                </td>
                <td>
                    <div class="fw-medium" style="font-size: 0.85rem;">${booking.fromLocation} ➔ ${booking.toLocation}</div>
                    <div class="text-teal small mt-1">
                        <i class="fas fa-map-marker-alt me-1"></i> <b>Pickup:</b> ${booking.pickup || "Not specified"}
                    </div>
                    <div class="text-muted small" style="font-size: 0.75rem;">${booking.date} | ${booking.time} ${isExpired ? '<span class="text-danger fw-bold">(Passed)</span>' : ''}</div>
                </td>
                <td>
                    <div class="badge bg-light border" style="font-size: 0.75rem; color: #000;">
                        <strong style="color: #000;">${booking.seats ? booking.seats.length : 0}</strong> Seats: 
                        <span style="color: #000;">${seatsList}</span>
                    </div>
                </td>
                <td>
                    <div class="fw-bold text-teal">Rs. ${(booking.totalPrice || 0).toLocaleString()}</div>
                </td>
                <td>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-outline-primary border-0" 
                            onclick="openEditModal('${doc.id}', '${seatsList}', ${booking.totalPrice || 0}, ${booking.seats ? booking.seats.length : 1})" 
                            title="Edit Seats" ${isExpired ? 'disabled' : ''}>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger border-0" 
                            onclick="deleteFullBooking('${doc.id}')" 
                            title="Delete Booking" ${isExpired ? 'disabled' : ''}>
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

// ------------------------- USERS -------------------------
function fetchUsers() {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    db.collection("Users").onSnapshot((querySnapshot) => {
        tbody.innerHTML = "";
        querySnapshot.forEach((doc) => {
            const user = doc.data();
            const phone = user.phone || user.mobile || "—";
            let loginBadge = user.method === 'google' ? 
                '<span class="badge bg-light text-primary border"><i class="fab fa-google"></i> Google</span>' : 
                '<span class="badge bg-light text-success border"><i class="fas fa-phone"></i> Mobile</span>';

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><small>${doc.id.substring(0,6)}...</small></td>
                <td><span class="fw-semibold">${user.name || "User"}</span></td>
                <td>${user.email || "—"}</td>
                <td>${loginBadge} <br> <b>${phone}</b></td>
                <td><button class="btn btn-sm text-danger" onclick="deleteUser('${doc.id}')"><i class="fas fa-trash"></i></button></td>
            `;
            tbody.appendChild(tr);
        });
    });
}

function deleteUser(id) {
    if(confirm("Delete user?")) db.collection("Users").doc(id).delete();
}

// ------------------------- REVENUE CHART -------------------------
let myChart;
function loadRevenueChart() {
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;

    db.collection("Bookings").orderBy("date").onSnapshot((querySnapshot) => {
        const dailyRevenue = {};
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const date = data.date || "Unknown";
            const price = data.totalPrice || 0;
            dailyRevenue[date] = (dailyRevenue[date] || 0) + price;
        });

        if (myChart) myChart.destroy();
        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(dailyRevenue),
                datasets: [{
                    label: 'Revenue',
                    data: Object.values(dailyRevenue),
                    borderColor: '#008080',
                    tension: 0.4,
                    fill: true,
                    backgroundColor: 'rgba(0, 128, 128, 0.1)'
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    });
}

// ------------------------- NAVIGATION -------------------------
function showSection(sectionId) {
    document.querySelectorAll('section').forEach(sec => sec.style.display = 'none');
    const target = document.getElementById(`${sectionId}-section`);
    if(target) target.style.display = 'block';
    
    document.querySelectorAll('.sidebar .nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`[data-section="${sectionId}"]`)?.classList.add('active');

    // මැප් resize කරන ලොජික් එක මෙතනින් update කරන්න
    setTimeout(() => {
        // Manage Locations section එකට ආවොත් mapLocations එක resize කරනවා
        if (sectionId === 'locations' && mapLocations) {
            mapLocations.resize();
            console.log("mapLocations resized");
        }
        // Add Schedules section එකට ආවොත් mapSchedules එක resize කරනවා
        if (sectionId === 'schedules' && mapSchedules) {
            mapSchedules.resize();
            console.log("mapSchedules resized");
        }
    }, 300);

    // අනිත් data loading ලොජික් ටික
    if (sectionId === 'bookings') {
        loadBusListForFilter();
        fetchFilteredBookings();
    } else if (sectionId === 'overview') {
        loadDashboardStats();
        loadRevenueChart();
    } else if (sectionId === 'users') {
        fetchUsers();
    }else if (sectionId === 'locations') {
        fetchLocations(); 
    }else if (sectionId === 'schedules') {
        fetchLocations();
        fetchSchedules(); 
    }
}

document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        showSection(link.getAttribute('data-section'));
    });
});

// ------------------------- INITIAL LOAD -------------------------
window.onload = () => {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById("dateFilter");
    if(dateInput) dateInput.value = today;

    loadDashboardStats();
    loadRevenueChart();
    fetchLocations();
    loadBusListForFilter();
    fetchFilteredBookings(); 
    showSection('overview');

    initMaps();
};

// ------------------------- HELPER FUNCTIONS -------------------------

function deleteFullBooking(docId) {
    if (confirm("Are you sure you want to delete this entire booking? This action cannot be undone.")) {
        db.collection("Bookings").doc(docId).delete()
            .then(() => alert("Booking deleted successfully."))
            .catch((error) => alert("Error deleting booking: " + error));
    }
}

let tempSelectedSeats = []; // තාවකාලිකව සීට් තියාගන්න array එකක්

function openEditModal(docId, seatsStr, total, count) {
    document.getElementById("modalDocId").value = docId;
    document.getElementById("modalCurrentTotal").value = total;
    document.getElementById("modalCurrentCount").value = count;

    // සීට් ටික array එකකට ගන්නවා
    tempSelectedSeats = seatsStr.split(',').map(s => s.trim()).filter(s => s !== "");
    
    renderSeatSelection(); // සීට් ටික screen එකේ පෙන්වනවා

    editModal = new bootstrap.Modal(document.getElementById('editSeatsModal'));
    editModal.show();
}

function renderSeatSelection() {
    const container = document.getElementById("seatContainer");
    const countDisplay = document.getElementById("selectedCountDisplay");
    const totalDisplay = document.getElementById("newTotalDisplay");
    
    const currentTotal = parseFloat(document.getElementById("modalCurrentTotal").value);
    const currentCount = parseInt(document.getElementById("modalCurrentCount").value);
    const pricePerSeat = currentTotal / currentCount;

    container.innerHTML = ""; // පරණ ඒවා අයින් කරනවා

    tempSelectedSeats.forEach((seat, index) => {
        const seatBtn = document.createElement("div");
        seatBtn.className = "btn btn-teal-custom d-flex align-items-center justify-content-center shadow-sm";
        seatBtn.style.width = "45px";
        seatBtn.style.height = "45px";
        seatBtn.style.fontSize = "0.8rem";
        seatBtn.innerHTML = seat;
        
        // සීට් එකක් click කරපුහම ඒක අයින් කරනවා
        seatBtn.onclick = () => {
            if(confirm(`Do you want to remove seat ${seat}?`)) {
                tempSelectedSeats.splice(index, 1);
                renderSeatSelection(); // ආයෙත් පෙන්වනවා update කරලා
            }
        };
        container.appendChild(seatBtn);
    });

    // Update displays
    countDisplay.innerText = tempSelectedSeats.length;
    totalDisplay.innerText = (pricePerSeat * tempSelectedSeats.length).toLocaleString();
}

async function saveSeatChanges() {
    const docId = document.getElementById("modalDocId").value;
    const currentTotal = parseFloat(document.getElementById("modalCurrentTotal").value);
    const currentCount = parseInt(document.getElementById("modalCurrentCount").value);

    if (tempSelectedSeats.length === 0) {
        alert("At least one seat must be selected. If you want to cancel everything, use Delete.");
        return;
    }

    const pricePerSeat = currentTotal / currentCount;
    const newTotal = pricePerSeat * tempSelectedSeats.length;

    try {
        await db.collection("Bookings").doc(docId).update({
            seats: tempSelectedSeats,
            totalPrice: newTotal
        });
        editModal.hide();
        alert("Booking updated successfully!");
    } catch (err) {
        alert("Error: " + err.message);
    }
}








// Mapbox Access Token (ඔයාගේ Mapbox Dashboard එකෙන් Token එක මෙතනට දාන්න)
mapboxgl.accessToken = 'pk.eyJ1IjoicHJhbW9kOTE4NCIsImEiOiJjbW12eXF4YnIwbWdhMnNwejVweGQ1ODR5In0.VypLwtDMmky5fa7kKF4Hyg';

let mapLocations, mapSchedules; // මැප් දෙක සඳහා variables
let locMarker = null; // Manage Cities මැප් එකේ marker එක
let routeMarkers = []; // Add Schedule මැප් එකේ markers (පාර අඳින)
let selectedLocation = null;


// Map එක Initialize කිරීම
function initMaps() {
    // 1. Manage Cities Map
    mapLocations = new mapboxgl.Map({
        container: 'map-locations', // HTML එකේ ID එක
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [80.7718, 7.8731],
        zoom: 7
    });

    // 2. Add Schedules Map
    mapSchedules = new mapboxgl.Map({
        container: 'map-schedules', // දෙවැනි මැප් එකේ ID එක
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [80.7718, 7.8731],
        zoom: 7
    });

    // නගර තෝරන ලොජික් එක mapLocations එකට විතරක් දාන්න
    // මේ කොටස initMaps() ඇතුළේ තියෙන්න ඕනේ
mapLocations.on('click', (e) => {
    // Click කරපු තැන longitude සහ latitude ගන්නවා
    selectedLocation = e.lngLat; 

    // කලින් තිබ්බ මාකර් එක අයින් කරලා අලුත් එකක් දානවා
    if (locMarker) locMarker.remove();
    locMarker = new mapboxgl.Marker({ color: '#008080' })
        .setLngLat(selectedLocation)
        .addTo(mapLocations);

    console.log("Selected Coords:", selectedLocation.lng, selectedLocation.lat);
});
}

// City දෙක අතර Route එක ඇඳීම
async function updateMapRoute() {
    const fromCityId = document.getElementById("fromCity").value;
    const toCityId = document.getElementById("toCity").value;

    if (!fromCityId || !toCityId) return;

    // පරණ markers සහ route මැප් එකෙන් අයින් කරනවා
    routeMarkers.forEach(m => m.remove());
    routeMarkers = [];
    if (mapSchedules.getLayer('route')) mapSchedules.removeLayer('route');
    if (mapSchedules.getSource('route')) mapSchedules.removeSource('route');

    async function getFirestoreCoords(cityId) {
        try {
            const doc = await db.collection("Locations").doc(cityId).get();
            if (doc.exists) {
                const data = doc.data();
                // Mapbox වලට longitude මුලට එන්න ඕනේ: [lng, lat]
                return [data.lng, data.lat]; 
            }
            return null;
        } catch (err) { return null; }
    }

    const start = await getFirestoreCoords(fromCityId);
    const end = await getFirestoreCoords(toCityId);

    if (start && end) {
        // 1. මැප් එකේ Start/End Markers දානවා
        routeMarkers.push(new mapboxgl.Marker({ color: '#2ecc71' }).setLngLat(start).addTo(mapSchedules));
        routeMarkers.push(new mapboxgl.Marker({ color: '#e74c3c' }).setLngLat(end).addTo(mapSchedules));

        // 2. පාර (Route) ඇඳීමට Directions API එකට කෝල් කරනවා
        const routeUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
        
        try {
            const response = await fetch(routeUrl);
            const routeData = await response.json();

            if (routeData.routes && routeData.routes.length > 0) {
                const geometry = routeData.routes[0].geometry;

                // 3. පාරේ හැඩය (Line) මැප් එකට ඇඩ් කරනවා
                mapSchedules.addSource('route', {
                    'type': 'geojson',
                    'data': {
                        'type': 'Feature',
                        'properties': {},
                        'geometry': geometry
                    }
                });

                mapSchedules.addLayer({
                    'id': 'route',
                    'type': 'line',
                    'source': 'route',
                    'layout': { 'line-join': 'round', 'line-cap': 'round' },
                    'paint': { 
                        'line-color': '#008080', // තද කොළ පාටට හුරු පාරක්
                        'line-width': 5,
                        'line-opacity': 0.75
                    }
                });

                // 4. නගර දෙකම පේන විදිහට මැප් එක Zoom කරනවා
                const bounds = new mapboxgl.LngLatBounds().extend(start).extend(end);
                mapSchedules.fitBounds(bounds, { padding: 80, duration: 1500 });
            }
        } catch (err) {
            console.error("Directions API Error:", err);
        }
    }
}

// Select boxes වලට listener එකතු කිරීම
document.getElementById("fromCity")?.addEventListener("change", updateMapRoute);
document.getElementById("toCity")?.addEventListener("change", updateMapRoute);

// ------------------------- SCHEDULE PUBLISH (DAILY RECURRENCE) -------------------------
// ------------------------- UI LOGIC: SHOW/HIDE DATE BASED ON TYPE -------------------------

// Schedule Type එක අනුව Input එක පාලනය කිරීම
document.getElementById("scheduleType")?.addEventListener("change", function() {
    const depTimeInput = document.getElementById("depTime");
    
    if (this.value === "daily") {
        // Daily නම් වෙලාව විතරක් select කරන්න දෙනවා (Time Picker)
        depTimeInput.type = "time";
    } else {
        // One-time නම් Date සහ Time දෙකම select කරන්න දෙනවා (DateTime Picker)
        depTimeInput.type = "datetime-local";
    }
});

// ------------------------- SCHEDULE PUBLISH LOGIC (FINAL) -------------------------

// ------------------------- SCHEDULE PUBLISH LOGIC (FINAL & CORRECTED) -------------------------

// ------------------------- SCHEDULE PUBLISH LOGIC (FINAL & CORRECTED) -------------------------

document.getElementById("scheduleForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    
    const btn = e.target.querySelector('button');
    const fromCityId = document.getElementById("fromCity").value;
    const toCityId = document.getElementById("toCity").value;
    const scheduleType = document.getElementById("scheduleType").value;
    const timeValue = document.getElementById("depTime").value; 
    const busNo = document.getElementById("busNo").value;
    const phone = document.getElementById("phone").value;
    const price = parseFloat(document.getElementById("price").value);

    if (!timeValue) return alert("Please enter the departure details!");

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Publishing...';

    try {
        // 1. නගර දෙකේ Coordinates Firestore එකෙන් ලබා ගැනීම
        const fromDoc = await db.collection("Locations").doc(fromCityId).get();
        const toDoc = await db.collection("Locations").doc(toCityId).get();

        if (!fromDoc.exists || !toDoc.exists) throw new Error("Location coordinates missing!");

        const fromData = fromDoc.data();
        const toData = toDoc.data();
        const route_id = `${fromCityId.substring(0, 3).toUpperCase()}-${toCityId.substring(0, 3).toUpperCase()}`;

        let batch = db.batch();
        let iterations = scheduleType === 'daily' ? 30 : 1;

        // --- පටන් ගන්න දවස සෙට් කිරීම (හෙට සිට) ---
        let baseDate = new Date();
        baseDate.setDate(baseDate.getDate() + 1); // අදට වඩා 1ක් එකතු කර හෙට දවස ගන්නවා

        for (let i = 0; i < iterations; i++) {
            let targetDate = new Date(baseDate);
            
            // i=0 වෙද්දී හෙට, i=1 වෙද්දී අනිද්දා... 
            // මෙතනදී targetDate.getDate() + i කිරීමෙන් මාස මාරු වීම auto සිදු වේ.
            targetDate.setDate(baseDate.getDate() + i);

            if (scheduleType === 'daily') {
                const [hours, minutes] = timeValue.split(':');
                targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            } else {
                // One-time නම් user තේරූ specific datetime එකම ගන්නවා
                targetDate = new Date(timeValue);
            }

            // Screenshot එකේ තිබූ පරිදි Document ID එක සෑදීම
            const dateStr = targetDate.toISOString().split('T')[0];
            const randomId = Math.floor(100 + Math.random() * 900);
            const docId = `${route_id}-${dateStr}-${randomId}`;

            const scheduleRef = db.collection("Schedules").doc(docId);
            
            // Screenshot එකේ තිබූ හරියටම Field Names මෙන්න:
            batch.set(scheduleRef, {
                departure_time: firebase.firestore.Timestamp.fromDate(targetDate),
                from: fromCityId,
                from_lat: fromData.lat,
                from_lng: fromData.lng,
                phone_number: phone,
                pickup_points: [fromCityId.toLowerCase()],
                price: price,
                route_id: route_id,
                schedule_type: scheduleType,
                to: toCityId,
                to_lat: toData.lat,
                to_lng: toData.lng,
                bus_no: busNo, // පසුව filter කිරීමට පහසු වීමට
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        await batch.commit();
        alert(`Successfully published ${iterations} schedule(s)!`);
        
        this.reset();
        
        // Map elements clear කිරීම
        if (typeof routeMarkers !== 'undefined') {
            routeMarkers.forEach(m => m.remove());
            routeMarkers = [];
        }
        if (mapSchedules.getLayer('route')) mapSchedules.removeLayer('route');
        if (mapSchedules.getSource('route')) mapSchedules.removeSource('route');
        
        showSection('overview');

    } catch (err) {
        console.error("Publishing Error:", err);
        alert("Error: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plus-circle me-2"></i> Publish Schedule';
    }
});


// Map එක load කරන්න අමතක කරන්න එපා
window.addEventListener('load', initMap);


// 1. නගර ටික Load කරන කොට Filter dropdowns දෙකටත් ඒවා දාන්න
function fetchLocations() {
    const tbody = document.getElementById("locationTableBody");
    const fromCity = document.getElementById("fromCity");
    const toCity = document.getElementById("toCity");
    const schedFromFilter = document.getElementById("schedFromFilter");
    const schedToFilter = document.getElementById("schedToFilter");

    db.collection("Locations").onSnapshot((snapshot) => {
        let options = '<option value="">Select City</option>';
        let filterOptions = '<option value="">All Cities</option>';
        
        if (tbody) tbody.innerHTML = ""; // Table එක clear කරනවා

        snapshot.forEach(doc => {
            const data = doc.data();
            const cityName = data.name || doc.id;

            // 1. Dropdown options හදනවා
            options += `<option value="${cityName}">${cityName}</option>`;
            filterOptions += `<option value="${cityName}">${cityName}</option>`;

            // 2. Table එකට Row එකක් ඇඩ් කරනවා (මේ කොටසයි අඩුවෙලා තිබ්බේ)
            if (tbody) {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${doc.id.substring(0, 5)}...</td> 
                    <td><i class="fas fa-location-dot me-2 text-teal"></i>${cityName}</td>
                    <td>
                        <div class="small text-muted">${data.lat?.toFixed(4)}, ${data.lng?.toFixed(4)}</div>
                    </td>
                    <td>
                        <button class="btn btn-outline-danger btn-sm border-0" onclick="deleteLocation('${doc.id}')">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            }
        });

        // Dropdowns update කිරීම
        if (fromCity) fromCity.innerHTML = options;
        if (toCity) toCity.innerHTML = options;
        if (schedFromFilter) schedFromFilter.innerHTML = filterOptions;
        if (schedToFilter) schedToFilter.innerHTML = filterOptions;
        
    }, (error) => {
        console.error("Error fetching locations: ", error);
    });
}

// 2. Schedules ටික Filter කරලා අරන් පෙන්වන ප්‍රධාන function එක
function fetchSchedules() {
    const tbody = document.getElementById("schedulesTableBody");
    if (!tbody) return;

    const dateVal = document.getElementById("schedDateFilter").value;
    const fromVal = document.getElementById("schedFromFilter").value;
    const toVal = document.getElementById("schedToFilter").value;

    let query = db.collection("Schedules").orderBy("departure_time", "asc");

    // City අනුව Firestore එකෙන්ම filter කරනවා
    if (fromVal) query = query.where("from", "==", fromVal);
    if (toVal) query = query.where("to", "==", toVal);

    query.onSnapshot((snapshot) => {
        tbody.innerHTML = "";
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const depTimestamp = data.departure_time.toDate();
            
            // Date එක තෝරලා තියෙනවා නම් ඒක විතරක් පෙන්වන්න (JS filter)
            if (dateVal) {
                const selectedDate = new Date(dateVal).toDateString();
                if (depTimestamp.toDateString() !== selectedDate) return;
            }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <div class="fw-bold text-dark">${depTimestamp.toLocaleDateString('en-GB')}</div>
                    <div class="small text-muted">${depTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td>
                    <div class="small fw-semibold text-teal">${data.from} ➔ ${data.to}</div>
                </td>
                <td><span class="badge bg-light text-dark border">${data.bus_no}</span></td>
                <td class="fw-bold">Rs. ${data.price}</td>
                <td>
                    <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteSchedule('${doc.id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (tbody.innerHTML === "") {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted small">No schedules found.</td></tr>';
        }
    });
}

// 3. Filters Reset කරන function එක
function clearSchedFilters() {
    document.getElementById("schedDateFilter").value = "";
    document.getElementById("schedFromFilter").value = "";
    document.getElementById("schedToFilter").value = "";
    fetchSchedules();
}

// 4. Delete Schedule
function deleteSchedule(id) {
    if (confirm("Are you sure you want to delete this schedule?")) {
        db.collection("Schedules").doc(id).delete()
            .then(() => alert("Schedule deleted!"))
            .catch((error) => console.error("Error: ", error));
    }
}