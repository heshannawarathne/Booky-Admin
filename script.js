// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

// Firebase Initialize කිරීම
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();




function loadDashboardStats() {
    // Total Users
    db.collection("Users").onSnapshot(snap => {
        document.getElementById("totalUsersCount").innerText = snap.size;
    });

    // Total Bookings
    db.collection("Bookings").onSnapshot(snap => {
        document.getElementById("totalBookingsCount").innerText = snap.size;
    });

    // Active Schedules
    db.collection("Schedules").onSnapshot(snap => {
        document.getElementById("activeBusesCount").innerText = snap.size;
    });
}


async function fetchLocations() {
    const tbody = document.getElementById("locationTableBody");
    if (!tbody) return;

    // Firestore එකේ "Locations" collection එකට reference එකක් ගන්නවා
    db.collection("Locations").onSnapshot((querySnapshot) => {
        tbody.innerHTML = ""; // කලින් තිබ්බ ඒවා clear කරනවා
        
        querySnapshot.forEach((doc) => {
            const cityData = doc.data();
            const cityName = doc.id; // ඔයා Document ID එක විදිහට නම දීලා තියෙන නිසා

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${doc.id.substring(0, 5)}...</td> 
                <td><i class="fas fa-location-dot me-2 text-teal"></i>${cityName}</td>
                <td>
                    <button class="btn btn-outline-danger btn-sm" onclick="deleteLocation('${doc.id}')">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // Schedule පේජ් එකේ තියෙන Dropdowns (From/To) ටිකත් Update කරනවා
        renderCitySelects(querySnapshot);
    });
}

// නගරයක් මකා දැමීම සඳහා
function deleteLocation(id) {
    if(confirm("Are you sure you want to delete this city?")) {
        db.collection("Locations").doc(id).delete().then(() => {
            console.log("City deleted!");
        });
    }
}

fetchLocations();


// නගරයක් එකතු කිරීම
async function addLocation() {
    const input = document.getElementById("cityName");
    const name = input.value.trim();

    if (!name) return alert("Enter city name!");

    try {
        // 1. මුලින්ම බලනවා මේ නමින් නගරයක් දැනටමත් තියෙනවද කියලා
        const docRef = db.collection("Locations").doc(name);
        const doc = await docRef.get();

        if (doc.exists) {
            // නගරය දැනටමත් තියෙනවා නම් alert එකක් දීලා නතර කරනවා
            return alert("This city is already added!");
        }

        // 2. නැත්නම් විතරක් අලුතින් ඇඩ් කරනවා
        await docRef.set({
            name: name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert(name + " added successfully!");
        input.value = "";

    } catch (err) {
        console.error("Error checking/adding city: ", err);
        alert("Error: " + err.message);
    }
}

// නගරයක් මකා දැමීම
function deleteCity(id) {
    if (confirm("Delete this city?")) {
        db.collection("Cities").doc(id).delete();
    }
}

// Schedule එකක් Publish කිරීම
document.getElementById("scheduleForm")?.addEventListener("submit", function(e) {
    e.preventDefault();
    
    const scheduleData = {
        busNo: document.getElementById("busNo").value,
        phone: document.getElementById("phone").value,
        fromCity: document.getElementById("fromCity").value,
        toCity: document.getElementById("toCity").value,
        price: parseFloat(document.getElementById("price").value),
        departure: document.getElementById("depTime").value,
        scheduleType: document.getElementById("scheduleType").value,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    db.collection("Schedules").add(scheduleData)
        .then(() => {
            alert("Schedule Published Successfully!");
            this.reset();
            showSection('overview');
        })
        .catch(err => alert("Error: " + err));
});

// ------------------------- UI NAVIGATION -------------------------

function showSection(sectionId) {
    document.querySelectorAll('section').forEach(sec => sec.style.display = 'none');
    document.getElementById(`${sectionId}-section`).style.display = 'block';
    
    document.querySelectorAll('.sidebar .nav-link').forEach(link => link.classList.remove('active'));
    document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');
}

document.querySelectorAll('.sidebar .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        showSection(link.getAttribute('data-section'));
    });
});

// Page එක Load වෙද්දී වැඩ පටන් ගන්න
window.onload = () => {
    loadDashboardStats();
    listenToCities();
    // Chart එකත් මෙතනම Init කරන්න පුළුවන්
};

function fetchUsers() {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;

    // "Users" collection එකට real-time සවන් දීම
    db.collection("Users").onSnapshot((querySnapshot) => {
        tbody.innerHTML = ""; // Table එක clear කරනවා
        
        // Dashboard එකේ Total Users count එක update කිරීම
        const userCountElement = document.getElementById("totalUsersCount");
        if (userCountElement) {
            userCountElement.innerText = querySnapshot.size;
        }

        querySnapshot.forEach((doc) => {
            const user = doc.data();
            const userId = doc.id;
            const name = user.name || "Booky User";
            const email = user.email || "—";
            // Screenshot එකේ තියෙන්නේ 'phone', 'mobile' නෙවෙයි
            const phone = user.phone || "—"; 

            // Login Method එක සහ Badge එක තීරණය කිරීම ( screenshots මත පදනම්ව)
            let loginMethodBadge = '';
            
            // ක්‍රමය 1: 'method' field එක හරහා Google අඳුනා ගැනීම
            if (user.method === "google") {
                loginMethodBadge = `<span class="badge bg-light text-primary border"><i class="fab fa-google me-1"></i> Google</span>`;
            } 
            // ක්‍රමය 2: 'phone' field එක තිබේ නම් එය Mobile User කෙනෙකි
            else if (phone !== "—") {
                loginMethodBadge = `<span class="badge bg-light text-success border"><i class="fas fa-phone-alt me-1"></i> Mobile</span>`;
            } 
            // එසේ නොමැති නම් (උදාහරණයක් ලෙස පැරණි දත්ත හෝ වෙනත් ක්‍රම)
            else {
                loginMethodBadge = `<span class="badge bg-light text-secondary border">Other</span>`;
            }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><small class="text-muted">${userId.substring(0, 6)}...</small></td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="avatar-sm me-2 rounded-circle d-flex align-items-center justify-content-center" style="width:36px; height:36px; background: #f0f2f5;">
                            <i class="fas fa-user text-secondary"></i>
                        </div>
                        <div>
                            <span class="fw-semibold">${name}</span>
                        </div>
                    </div>
                </td>
                <td><small>${email}</small></td>
                <td>
                    ${loginMethodBadge}
                    ${phone !== "—" ? `<br><span class="small fw-bold text-success">${phone}</span>` : ''}
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-danger border-0" onclick="deleteUser('${userId}')" title="Delete User">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }, (error) => {
        console.error("Error fetching users: ", error);
    });
}

// App එක පටන් ගන්න කොටම function එක call කරනවා
fetchUsers();


// 1. Dropdown එකට බස් අංක ටික ලෝඩ් කිරීම
function loadBusListForFilter() {
    const busFilter = document.getElementById("busFilter");
    
    // Schedules collection එකෙන් දැනට තියෙන බස් අංක ටික විතරක් ගන්නවා
    db.collection("Schedules").onSnapshot((querySnapshot) => {
        // පරණ ලිස්ට් එක clear කරලා මුල් option එක තියනවා
        busFilter.innerHTML = '<option value="">All Buses (Select to Filter)</option>';
        
        let busNumbers = [];
        querySnapshot.forEach((doc) => {
            const busNo = doc.data().busNo;
            if (busNo && !busNumbers.includes(busNo)) {
                busNumbers.push(busNo);
                const option = `<option value="${busNo}">${busNo}</option>`;
                busFilter.innerHTML += option;
            }
        });
    });
}

// 2. තෝරාගත් බස් එකට අනුව Bookings Filter කිරීම
function fetchFilteredBookings() {
    const selectedBus = document.getElementById("busFilter").value;
    const tbody = document.getElementById("bookingsTableBody");
    
    let query = db.collection("Bookings");

    // බස් එකක් සිලෙක්ට් කරලා නම් විතරක් query එක filter කරනවා
    if (selectedBus !== "") {
        query = query.where("busNo", "==", selectedBus);
    }

    query.onSnapshot((querySnapshot) => {
        tbody.innerHTML = "";
        
        // Dashboard එකේ count එකටත් මේකම පාවිච්චි කරන්න පුළුවන්
        if (document.getElementById("totalBookingsCount") && selectedBus === "") {
            document.getElementById("totalBookingsCount").innerText = querySnapshot.size;
        }

        querySnapshot.forEach((doc) => {
            const booking = doc.data();
            const tr = document.createElement("tr");
            
            tr.innerHTML = `
                <td><small class="text-muted">${doc.id.substring(0, 8)}</small></td>
                <td>
                    <span class="fw-bold">${booking.passengerName || 'N/A'}</span><br>
                    <small class="text-muted">${booking.passengerPhone || ''}</small>
                </td>
                <td><span class="badge-modern">${booking.busNo}</span></td>
                <td><small>${booking.fromCity} ➔ ${booking.toCity}</small></td>
                <td>${booking.selectedSeats ? booking.selectedSeats.length : 0} Seats</td>
                <td class="fw-bold text-teal">Rs. ${booking.totalPrice || 0}</td>
            `;
            tbody.appendChild(tr);
        });
        
        if (querySnapshot.empty) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No bookings found for this selection.</td></tr>`;
        }
    });
}

// මුලින්ම ලෝඩ් වෙන්න ඕන දේවල්
loadBusListForFilter();
fetchFilteredBookings();