// ==========================================
// 1. FIREBASE INITIALIZATION (Compat mode)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyCJYx0fDIz-SoxIls66uE082aHKseKUMvw",
    authDomain: "lemoncad.firebaseapp.com",
    databaseURL: "https://lemoncad-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "lemoncad",
    storageBucket: "lemoncad.firebasestorage.app",
    messagingSenderId: "884482514267",
    appId: "1:884482514267:web:0068f88ff6257179acce7e",
    measurementId: "G-R7F2Z723MG"
};

firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();

// ==========================================
// 2. STATE & DATA MANAGEMENT
// ==========================================
let currentTeam = "Civilian";
let currentCallsign = "";
let civPoints = 0;
let civHeightFeet = 5;
let civHeightInches = 7;

let dispatches = [];
let staffCalls = [];
let civilians = [];

// ==========================================
// 3. UI & NAVIGATION FUNCTIONS
// ==========================================
function openTeamModal() {
    document.getElementById("team-modal").style.display = "flex";
}

function handleTeamChange() {
    const team = document.getElementById("modal-team-select").value;
    const callsignGroup = document.getElementById("callsign-group");
    if (team === "Police" || team === "EMS" || team === "Staff") {
        callsignGroup.style.display = "block";
    } else {
        callsignGroup.style.display = "none";
    }
}

function submitTeamSelection() {
    const team = document.getElementById("modal-team-select").value;
    const callsignInput = document.getElementById("modal-callsign-input").value.trim();
    const errorElem = document.getElementById("callsign-error");

    if (team !== "Civilian") {
        if (callsignInput.length < 3 || callsignInput.length > 6) {
            errorElem.style.display = "block";
            return;
        }
        currentCallsign = callsignInput;
    } else {
        currentCallsign = "";
    }

    errorElem.style.display = "none";
    currentTeam = team;
    document.getElementById("display-team-info").innerText = `Team: ${currentTeam} ${currentCallsign ? '(' + currentCallsign + ')' : ''}`;
    document.getElementById("team-modal").style.display = "none";

    const cadTabBtn = document.getElementById("tab-btn-cad");
    const dispatchTabBtn = document.getElementById("tab-btn-dispatch");
    const staffDashBtn = document.getElementById("tab-btn-staff-dashboard");

    if (currentTeam === "Civilian") {
        cadTabBtn.classList.add("hidden-for-civ");
        dispatchTabBtn.classList.add("hidden-for-civ");
        staffDashBtn.style.display = "none";
        switchTab('caller', document.getElementById('tab-btn-caller'));
    } else {
        cadTabBtn.classList.remove("hidden-for-civ");
        dispatchTabBtn.classList.remove("hidden-for-civ");
        if (currentTeam === "Staff") {
            staffDashBtn.style.display = "inline-block";
        } else {
            staffDashBtn.style.display = "none";
        }
        switchTab('cad', document.getElementById('tab-btn-cad'));
    }
    showAlert(`Successfully switched to ${currentTeam}!`);
}

function switchTab(tabId, btnElement) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".nav-tab").forEach(el => el.classList.remove("active"));

    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add("active");
    if (btnElement) btnElement.classList.add("active");
}

function showAlert(message) {
    const popup = document.getElementById("alert-popup");
    const audio = document.getElementById("alert-sound");
    popup.innerText = message;
    popup.classList.add("show");
    
    if (audio) {
        audio.play().catch(e => console.log("Audio play blocked by browser policy"));
    }

    setTimeout(() => {
        popup.classList.remove("show");
    }, 4000);
}

// ==========================================
// 4. EMERGENCY CALLER (911)
// ==========================================
function submitEmergencyCall() {
    const title = document.getElementById("call-title").value.trim();
    const location = document.getElementById("call-location").value.trim();
    const description = document.getElementById("call-description").value.trim();

    if (!title || !location) {
        showAlert("Please fill in at least a title and location!");
        return;
    }

    const services = [
        document.getElementById("service-1").value,
        document.getElementById("service-2").value,
        document.getElementById("service-3").value,
        document.getElementById("service-4").value
    ].filter(s => s !== "N/A");

    const newDispatch = {
        id: Date.now(),
        title,
        location,
        description,
        services: services.length > 0 ? services.join(", ") : "All Units",
        time: new Date().toLocaleTimeString()
    };

    dispatches.unshift(newDispatch);
    updateDispatchFeed();

    document.getElementById("call-title").value = "";
    document.getElementById("call-location").value = "";
    document.getElementById("call-description").value = "";

    showAlert("Emergency call successfully dispatched to units!");
    switchTab('dispatch', document.getElementById('tab-btn-dispatch'));
}

function updateDispatchFeed() {
    const feedContainer = document.getElementById("dispatch-list");
    if (dispatches.length === 0) {
        feedContainer.innerHTML = `<p style="color: var(--text-muted);">No active dispatches right now.</p>`;
        return;
    }

    let html = "";
    dispatches.forEach(d => {
        html += `
            <div class="dispatch-card">
                <h3>🚨 ${escapeHtml(d.title)}</h3>
                <p><strong>Location:</strong> ${escapeHtml(d.location)}</p>
                <p><strong>Target Services:</strong> ${escapeHtml(d.services)}</p>
                <p><strong>Description:</strong> ${escapeHtml(d.description || 'None provided')}</p>
                <p style="font-size: 11px; color: #777; margin-top: 8px;">Dispatched at: ${d.time}</p>
                <button class="btn-yellow" style="padding: 4px 10px; font-size: 12px; margin-top: 8px;" onclick="resolveDispatch(${d.id})">Clear / Resolve</button>
            </div>
        `;
    });
    feedContainer.innerHTML = html;
}

function resolveDispatch(id) {
    dispatches = dispatches.filter(d => d.id !== id);
    updateDispatchFeed();
    showAlert("Dispatch marked as resolved.");
}

// ==========================================
// 5. CAD / DMV & CIVILIAN PROFILE
// ==========================================
function registerCivilianProfile() {
    const name = document.getElementById("civ-name").value.trim();
    const age = document.getElementById("civ-age").value;
    const plate = document.getElementById("civ-plate").value.trim().toUpperCase();
    const violationPoints = parseInt(document.getElementById("civ-violation-type").value, 10);

    if (!name) {
        showAlert("Please enter a full name for the civilian profile.");
        return;
    }

    civPoints += violationPoints;
    let statusText = civPoints >= 5 ? "Wanted / Felony" : "Violator / Active";

    document.getElementById("civ-points-display").innerText = `CVP Points: ${civPoints} | Status: ${statusText}`;

    const existingIndex = civilians.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
    const profileData = {
        name,
        age,
        plate: plate || "NONE",
        points: civPoints,
        status: statusText
    };

    if (existingIndex >= 0) {
        civilians[existingIndex] = profileData;
    } else {
        civilians.push(profileData);
    }

    updateLeaderboard();
    showAlert("Civilian profile and points updated successfully!");
}

function updateLeaderboard() {
    const tbody = document.getElementById("leaderboard-body");
    if (civilians.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #777;">No records found.</td></tr>`;
        return;
    }

    let html = "";
    civilians.forEach(c => {
        html += `
            <tr>
                <td>${escapeHtml(c.name)}</td>
                <td>${escapeHtml(c.plate)}</td>
                <td>${c.points}</td>
                <td><span class="badge-violator">${escapeHtml(c.status)}</span></td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ==========================================
// 6. STAFF REPORTS WITH FIREBASE STORAGE
// ==========================================
function handleStaffReasonChange() {
    const reason = document.getElementById("staff-call-reason").value;
    const proofContainer = document.getElementById("proof-container");
    if (reason.includes("RDM") || reason.includes("VDM")) {
        proofContainer.style.display = "block";
    } else {
        proofContainer.style.display = "none";
    }
}

async function submitStaffCall() {
    const reason = document.getElementById("staff-call-reason").value;
    const description = document.getElementById("staff-call-description").value.trim();
    const fileInput = document.getElementById("staff-call-proof");

    let proofUrl = "";

    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        try {
            showAlert("Uploading proof to Firebase Storage...");
            const fileRef = storage.ref().child(`staff_proofs/${Date.now()}_${file.name}`);
            const snapshot = await fileRef.put(file);
            proofUrl = await snapshot.ref.getDownloadURL();
        } catch (error) {
            console.error("Error uploading file to Firebase Storage:", error);
            showAlert("Failed to upload proof file!");
            return;
        }
    }

    const report = {
        id: Date.now(),
        reason,
        description,
        proofUrl,
        time: new Date().toLocaleTimeString()
    };

    staffCalls.unshift(report);
    updateStaffDashboard();

    document.getElementById("staff-call-description").value = "";
    if (fileInput) fileInput.value = "";

    showAlert("Staff report successfully submitted!");
    switchTab('caller', document.getElementById('tab-btn-caller'));
}

function updateStaffDashboard() {
    const container = document.getElementById("staff-call-list");
    if (!container) return;

    if (staffCalls.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted);">No active staff calls.</p>`;
        return;
    }

    let html = "";
    staffCalls.forEach(r => {
        html += `
            <div class="dispatch-card" style="border-left-color: #3498db;">
                <h3 style="color: #3498db;">📋 ${escapeHtml(r.reason)}</h3>
                <p><strong>Description:</strong> ${escapeHtml(r.description || 'No description')}</p>
                ${r.proofUrl ? `<p><strong>Proof:</strong> <a href="${r.proofUrl}" target="_blank" style="color: var(--accent-color);">View Uploaded File</a></p>` : ''}
                <p style="font-size: 11px; color: #777; margin-top: 8px;">Submitted at: ${r.time}</p>
                <button class="btn-yellow" style="padding: 4px 10px; font-size: 12px; margin-top: 8px; background-color: var(--danger-color); color: white;" onclick="closeStaffReport(${r.id})">Close Report</button>
            </div>
        `;
    });
    container.innerHTML = html;
}

function closeStaffReport(id) {
    staffCalls = staffCalls.filter(r => r.id !== id);
    updateStaffDashboard();
    showAlert("Staff report closed.");
}

function openUpdateModal() {
    document.getElementById("update-modal").style.display = "flex";
}

function closeUpdateModal() {
    document.getElementById("update-modal").style.display = "none";
}

function escapeHtml(text) {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
