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

// ------------------------- REAL-TIME LISTENERS -------------------------

// Dashboard එකේ Stats (ගණන් හිලව්) Update කිරීම
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

// Cities (නගර) List එක Real-time කියවීම
function listenToCities() {
    db.collection("Cities").orderBy("name").onSnapshot(snapshot => {
        const tbody = document.getElementById("locationTableBody");
        const fromSelect = document.getElementById("fromCity");
        const toSelect = document.getElementById("toCity");

        if (!tbody) return;
        tbody.innerHTML = "";
        
        let selectOptions = '<option value="">Select city</option>';

        snapshot.forEach(doc => {
            const city = doc.data();
            // Table එකට දාමු
            tbody.innerHTML += `
                <tr>
                    <td>${doc.id.substring(0, 5)}</td>
                    <td><i class="fas fa-location-dot me-2 text-teal"></i>${city.name}</td>
                    <td><button class="btn btn-outline-teal btn-sm" onclick="deleteCity('${doc.id}')"><i class="fas fa-trash-alt"></i> Delete</button></td>
                </tr>`;
            
            // Dropdown වලට දාමු
            selectOptions += `<option value="${city.name}">${city.name}</option>`;
        });

        fromSelect.innerHTML = selectOptions;
        toSelect.innerHTML = selectOptions;
    });
}

// ------------------------- ACTIONS (Add / Delete) -------------------------

// නගරයක් එකතු කිරීම
function addLocation() {
    const input = document.getElementById("cityName");
    const name = input.value.trim();
    if (!name) return alert("Enter city name!");

    db.collection("Cities").add({ name: name })
        .then(() => input.value = "")
        .catch(err => alert("Error: " + err));
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