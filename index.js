const express = require('express');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and url-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve all static files (HTML, CSS, Client-JS, updates.json) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Discord Webhook URL (using environment variable with fallback)
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/1533927070810247461/GYeJqyh2D_gLR6J_CNI8zmWqLDYLULmrhKANvtsk2_YcnzRGx_zO2rjzMhHxlchzG-dy";

/**
 * Sends a notification message to the configured Discord webhook.
 * @param {string} message - The text message to send to Discord.
 */
async function sendDiscordNotification(message) {
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: message }),
    });

    if (!response.ok) {
      console.error(`Failed to send Discord notification. Status: ${response.status}`);
    }
  } catch (error) {
    console.error("An error occurred while sending the Discord webhook:", error);
  }
}

// Server status endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Start the server on Render's assigned port
app.listen(PORT, () => {
    console.log(`Server is running successfully on port ${PORT}`);
    sendDiscordNotification("🟢 LemonCAD server has successfully started up!");
});

// --- CLIENT-SIDE LOGIC ---

let currentActiveTeam = 'Civilian';
let registeredCivilians = [];
let alertTimeout = null;
let currentFeet = 5;
let currentInches = 7;

function adjustHeight(type, amount) {
    if (type === 'feet') {
        currentFeet += amount;
        if (currentFeet < 2) currentFeet = 2; 
        if (currentFeet > 7) currentFeet = 7;
        
        if (currentFeet === 2 && currentInches < 0) {
            currentInches = 0;
        }

        if (currentFeet === 7) {
            currentInches = 0;
            document.getElementById('height-inches').innerText = currentInches;
        }
        document.getElementById('height-feet').innerText = currentFeet;
    } else if (type === 'inches') {
        if (currentFeet === 7 && amount > 0) {
            currentInches = 0;
            document.getElementById('height-inches').innerText = currentInches;
            return;
        }

        currentInches += amount;
        if (currentInches < 0) {
            currentInches = 11;
            if (currentFeet > 2) { 
                currentFeet--;
                document.getElementById('height-feet').innerText = currentFeet;
            } else {
                currentFeet = 2;
                currentInches = 0;
            }
        } else if (currentInches > 11) {
            currentInches = 0;
            if (currentFeet < 7) {
                currentFeet++;
                document.getElementById('height-feet').innerText = currentFeet;
                if (currentFeet === 7) {
                    currentInches = 0;
                }
            } else {
                currentInches = 0;
            }
        }

        if (currentFeet === 7) {
            currentInches = 0;
        }

        document.getElementById('height-inches').innerText = currentInches;
    }
}

function openTeamModal() {
    document.getElementById('team-modal').style.display = 'flex';
}

function handleTeamChange() {
    const team = document.getElementById('modal-team-select').value;
    const callsignGroup = document.getElementById('callsign-group');
    if (team === 'Civilian') {
        callsignGroup.style.display = 'none';
    } else {
        callsignGroup.style.display = 'block';
    }
}

function submitTeamSelection() {
    const team = document.getElementById('modal-team-select').value;
    const callsign = document.getElementById('modal-callsign-input').value.trim();
    const errorDiv = document.getElementById('callsign-error');

    currentActiveTeam = team;
    const pointsBadge = document.getElementById('civ-points-display');
    const staffCallerTab = document.getElementById('tab-btn-staff-caller');
    const staffDashboardTab = document.getElementById('tab-btn-staff-dashboard');

    if (team === 'Civilian') {
        errorDiv.style.display = 'none';
        document.getElementById('display-team-info').innerText = `Team: Civilian`;
        document.getElementById('team-modal').style.display = 'none';
        pointsBadge.style.display = 'block';
        
        document.querySelectorAll('.hidden-for-civ').forEach(el => el.classList.add('hidden-for-civ'));
        staffCallerTab.classList.remove('hidden-for-staff');
        staffDashboardTab.style.display = 'none';

        switchTab('caller', document.getElementById('tab-btn-caller'));
        return;
    }

    if (team === 'Staff') {
        errorDiv.style.display = 'none';
        document.getElementById('display-team-info').innerText = `Team: Staff`;
        document.getElementById('team-modal').style.display = 'none';
        pointsBadge.style.display = 'none';

        document.querySelectorAll('.hidden-for-civ').forEach(el => el.classList.remove('hidden-for-civ'));
        staffCallerTab.classList.add('hidden-for-staff'); 
        staffDashboardTab.style.display = 'block'; 

        switchTab('staff-dashboard', staffDashboardTab);
        return;
    }

    const letterCount = (callsign.match(/[a-zA-Z]/g) || []).length;
    const isValidLength = callsign.length >= 3 && callsign.length <= 6;
    const isValidLetters = letterCount <= 3;

    if (!isValidLength || !isValidLetters) {
        errorDiv.style.display = 'block';
        return;
    }

    errorDiv.style.display = 'none';
    document.getElementById('display-team-info').innerText = `Team: ${team} | ${callsign}`;
    document.getElementById('team-modal').style.display = 'none';
    pointsBadge.style.display = 'none';

    document.querySelectorAll('.hidden-for-civ').forEach(el => el.classList.remove('hidden-for-civ'));
    staffCallerTab.classList.remove('hidden-for-staff'); 
    staffDashboardTab.style.display = 'none';

    switchTab('cad', document.getElementById('tab-btn-cad'));
}

function switchTab(tabId, element) {
    if (currentActiveTeam === 'Civilian' && (tabId === 'cad' || tabId === 'dispatch')) {
        return;
    }
    if (currentActiveTeam === 'Staff' && tabId === 'staff-caller') {
        return;
    }
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active');
    if(element) element.classList.add('active');
}

function handleStaffReasonChange() {
    const reason = document.getElementById('staff-call-reason').value;
    const proofContainer = document.getElementById('proof-container');
    const proofInput = document.getElementById('staff-call-proof');
    
    if (reason.startsWith('RDM') || reason.startsWith('VDM')) {
        proofContainer.style.display = 'block';
        proofInput.required = true;
    } else {
        proofContainer.style.display = 'none';
        proofInput.required = false;
        proofInput.value = '';
    }
}

function registerCivilianProfile() {
    const name = document.getElementById('civ-name').value.trim();
    const age = document.getElementById('civ-age').value;
    const height = `${currentFeet}'${currentInches}"`;
    const gender = document.getElementById('civ-gender').value;
    const plate = document.getElementById('civ-plate').value.trim();
    const pointsToAdd = parseInt(document.getElementById('civ-violation-type').value) || 1;

    if(!name || !plate) {
        triggerAlert('⚠️ Error: Please enter full name and license plate.');
        return;
    }

    let existingCiv = registeredCivilians.find(c => c.name.toLowerCase() === name.toLowerCase());
    let wasAlreadyBolo = existingCiv ? existingCiv.points >= 4 : false;
    let finalPoints = pointsToAdd;

    if (existingCiv) {
        existingCiv.points += pointsToAdd;
        existingCiv.plate = plate;
        existingCiv.age = age;
        existingCiv.height = height;
        finalPoints = existingCiv.points;
    } else {
        existingCiv = { name, age, height, gender, plate, points: pointsToAdd };
        registeredCivilians.push(existingCiv);
        finalPoints = pointsToAdd;
    }

    updateCivPointsBadge();
    updateLeaderboard();

    let isNowBolo = finalPoints >= 4;

    if (isNowBolo && !wasAlreadyBolo) {
        dispatchBoloAlert(name, plate, finalPoints);
    } else {
        let statusType = isNowBolo ? "BOLO 🚨" : "Violator";
        triggerAlert(`✅ CVP Updated: +${pointsToAdd} pts for ${name}. Total: ${finalPoints} (${statusType})`);
    }
    
    document.getElementById('civ-name').value = '';
    document.getElementById('civ-plate').value = '';
}

function dispatchBoloAlert(civName, plate, points) {
    const newDispatch = {
        title: `[BOLO ALERT] ${civName} (Plate: ${plate}) reached ${points} points!`,
        location: 'Citywide / Active Pursuit',
        description: `Civilian ${civName} driving plate ${plate} has accumulated ${points} infraction points and is officially designated as a BOLO. All police units exercise caution.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        services: ['Police']
    };

    const listContainer = document.getElementById('dispatch-list');
    if (listContainer.innerHTML.includes('No active dispatches')) {
        listContainer.innerHTML = '';
    }

    const card = document.createElement('div');
    card.className = 'dispatch-card';
    card.innerHTML = `
        <h3>🚨 ${newDispatch.title}</h3>
        <p><strong>Location:</strong> ${newDispatch.location}</p>
        <p><strong>Details:</strong> ${newDispatch.description}</p>
        <p><strong>Dispatched Services:</strong> Police</p>
        <p><strong>Time:</strong> ${newDispatch.time}</p>
    `;
    listContainer.prepend(card);

    triggerAlert('🚨 BOLO ALERT: ' + civName + ' (' + plate + ') is now a BOLO!');
    sendDiscordNotification(`🚨 **BOLO ALERT:** Civilian **${civName}** (Plate: \`${plate}\`) has reached **${points} points** and is now designated as a BOLO!`);
}

function updateCivPointsBadge() {
    const badge = document.getElementById('civ-points-display');
    if (registeredCivilians.length > 0) {
        const latestCiv = registeredCivilians[registeredCivilians.length - 1];
        let status = latestCiv.points >= 4 ? "BOLO" : "Violator";
        badge.innerText = `CVP Points: ${latestCiv.points} | Status: ${status}`;
    } else {
        badge.innerText = `CVP Points: 0 | Status: Violator`;
    }
}

function updateLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    if (registeredCivilians.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #777;">No records found.</td></tr>`;
        return;
    }

    let sortedCivs = [...registeredCivilians].sort((a, b) => b.points - a.points);

    sortedCivs.forEach(civ => {
        let isBolo = civ.points >= 4;
        let badgeHtml = isBolo ? `<span class="badge-bolo">BOLO</span>` : `<span class="badge-violator">Violator</span>`;
        
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${civ.name}</strong></td>
            <td><code>${civ.plate}</code></td>
            <td>${civ.points}</td>
            <td>${badgeHtml}</td>
        `;
        tbody.appendChild(tr);
    });
}

function searchPerson() {
    const searchInput = document.getElementById('search-person-input');
    const query = searchInput.value.trim().toLowerCase();
    
    if(!query) {
        triggerAlert('⚠️ Error: Please enter a name to search.');
        return;
    }

    const found = registeredCivilians.find(c => c.name.toLowerCase().includes(query));
    if(found) {
        let status = found.points >= 4 ? "BOLO 🚨 (HIGH PRIORITY)" : "Violator";
        triggerAlert(`🔍 Found CVP: ${found.name} (${found.age}, ${found.height}) | Plate: ${found.plate} | Points: ${found.points} (${status})`);
    } else {
        triggerAlert('🔍 CVP Search: No profile found with that name.');
    }

    searchInput.value = '';
}

function searchPlate() {
    const searchInput = document.getElementById('search-plate-input');
    const query = searchInput.value.trim().toLowerCase();
    const resultBox = document.getElementById('dmv-lookup-result');
    resultBox.style.display = 'block';
    resultBox.innerHTML = '';

    if(!query) {
        triggerAlert('⚠️ Error: Please enter a license plate to search.');
        resultBox.style.display = 'none';
        return;
    }

    const foundCvp = registeredCivilians.find(c => c.plate.toLowerCase() === query);

    if(!foundCvp) {
        triggerAlert('🔍 DMV Search: License plate not found in CVP database.');
        resultBox.innerHTML = `
            <p style="color: #d9534f; font-weight: bold; margin-bottom: 8px;">This vehicle is not yet in our CVP database. Want to add the license plate to the registration form for a new CVP?</p>
            <button class="btn-yellow" onclick="autofillPlate('${query.toUpperCase()}')">Fill Plate in CVP Form</button>
        `;
    } else {
        let ownerStatus = foundCvp.points >= 4 ? "BOLO Owner 🚨" : "Violator";
        triggerAlert(`🔍 DMV Search: License plate recognized.`);
        resultBox.innerHTML = `
            <p style="color: #2e7d32; font-weight: bold; margin-bottom: 6px;">License plate recognized.</p>
            <p><strong>Owner:</strong> ${foundCvp.name} (${foundCvp.age}, ${foundCvp.height}) | <strong>Points:</strong> ${foundCvp.points} (${ownerStatus})</p>
            <div class="form-group" style="margin-top: 10px; margin-bottom: 8px;">
                <label style="font-size: 12px;">Add Points to ${foundCvp.name}</label>
                <select id="quick-add-points-${foundCvp.plate}" style="font-size: 13px; padding: 6px;">
                    <option value="1">Traffic Stop (+1 Point)</option>
                    <option value="2">Robbery / Heist (+2 Points)</option>
                    <option value="3">Killing another Civilian (+3 Points)</option>
                    <option value="4">Killing LEO, DOT, Medic, or Firefighter (+4 Points)</option>
                </select>
            </div>
            <button class="btn-yellow" style="padding: 6px; font-size: 13px;" onclick="addPointsDirectly('${foundCvp.plate}')">Add Points</button>
        `;
    }

    searchInput.value = '';
}

function autofillPlate(plate) {
    document.getElementById('civ-plate').value = plate;
    if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const resultBox = document.getElementById('dmv-lookup-result');
    resultBox.style.display = 'none';
    resultBox.innerHTML = '';

    triggerAlert(`✅ Plate ${plate} filled into CVP Registration form.`);
}

function addPointsDirectly(plate) {
    const selectEl = document.getElementById(`quick-add-points-${plate}`);
    const pointsToAdd = parseInt(selectEl.value) || 1;
    const civ = registeredCivilians.find(c => c.plate.toLowerCase() === plate.toLowerCase());

    if (!civ) return;

    let wasAlreadyBolo = civ.points >= 4;
    civ.points += pointsToAdd;
    let finalPoints = civ.points;

    updateCivPointsBadge();
    updateLeaderboard();

    let isNowBolo = finalPoints >= 4;

    if (isNowBolo && !wasAlreadyBolo) {
        dispatchBoloAlert(civ.name, civ.plate, finalPoints);
    } else {
        let statusType = isNowBolo ? "BOLO 🚨" : "Violator";
        triggerAlert(`✅ Added +${pointsToAdd} pts to ${civ.name}. Total: ${finalPoints} (${statusType})`);
    }

    const resultBox = document.getElementById('dmv-lookup-result');
    resultBox.style.display = 'none';
    resultBox.innerHTML = '';
}

async function submitEmergencyCall() {
    const title = document.getElementById('call-title').value.trim();
    const location = document.getElementById('call-location').value.trim();
    const description = document.getElementById('call-description').value.trim();

    const s1 = document.getElementById('service-1').value;
    const s2 = document.getElementById('service-2').value;
    const s3 = document.getElementById('service-3').value;
    const s4 = document.getElementById('service-4').value;

    if (!title || !location) {
        triggerAlert('⚠️ Error: Please enter a title and location for the 911 call.');
        return;
    }

    const targetServices = [s1, s2, s3, s4].filter(s => s !== 'N/A');

    const newDispatch = {
        title: `[911 CALL] ${title}`,
        location: location,
        description: description || 'No extra details provided.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        services: targetServices
    };

    const listContainer = document.getElementById('dispatch-list');
    if (listContainer.innerHTML.includes('No active dispatches')) {
        listContainer.innerHTML = '';
    }

    const card = document.createElement('div');
    card.className = 'dispatch-card';
    card.innerHTML = `
        <h3>🚨 ${newDispatch.title}</h3>
        <p><strong>Location:</strong> ${newDispatch.location}</p>
        <p><strong>Details:</strong> ${newDispatch.description}</p>
        <p><strong>Dispatched Services:</strong> ${targetServices.join(', ')}</p>
        <p><strong>Time:</strong> ${newDispatch.time}</p>
    `;
    listContainer.prepend(card);

    triggerAlert('🚨 New 911 Emergency Dispatch Sent Successfully!');
    
    sendDiscordNotification(`🚨 **911 Emergency Call**\n**Title:** ${title}\n**Location:** ${location}\n**Services:** ${targetServices.join(', ')}\n**Details:** ${newDispatch.description}`);

    document.getElementById('call-title').value = '';
    document.getElementById('call-location').value = '';
    document.getElementById('call-description').value = '';
    
    if (currentActiveTeam !== 'Civilian') {
        switchTab('dispatch', document.getElementById('tab-btn-dispatch'));
    }
}

function submitStaffCall() {
    const reason = document.getElementById('staff-call-reason').value;
    const description = document.getElementById('staff-call-description').value.trim();
    const proofInput = document.getElementById('staff-call-proof');
    const isRdmVdm = reason.startsWith('RDM') || reason.startsWith('VDM');

    if (isRdmVdm && proofInput.files.length === 0) {
        triggerAlert('⚠️ Error: Proof is required for RDM/VDM reports.');
        return;
    }

    const hasProof = proofInput.files.length > 0 ? 'Yes (File attached)' : 'None required/provided';

    const newStaffCall = {
        title: reason,
        description: description || 'No details provided.',
        hasProof: hasProof,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        team: currentActiveTeam
    };

    const listContainer = document.getElementById('staff-call-list');
    if (listContainer.innerHTML.includes('No active staff calls')) {
        listContainer.innerHTML = '';
    }

    const card = document.createElement('div');
    card.className = 'dispatch-card';
    card.innerHTML = `
        <h3>⚠️ [STAFF CALL] ${newStaffCall.title}</h3>
        <p><strong>Submitted by Team:</strong> ${newStaffCall.team}</p>
        <p><strong>Details:</strong> ${newStaffCall.description}</p>
        <p><strong>Proof Uploaded:</strong> ${newStaffCall.hasProof}</p>
        <p><strong>Time:</strong> ${newStaffCall.time}</p>
    `;
    listContainer.prepend(card);

    if (currentActiveTeam === 'Staff') {
        triggerAlert('🚨 NEW STAFF CALL RECEIVED: ' + reason);
    } else {
        triggerAlert('✅ Staff call successfully submitted to moderation team.');
    }

    sendDiscordNotification(`⚠️ **New Staff Call**\n**Reason:** ${reason}\n**Team:** ${currentActiveTeam}\n**Details:** ${newStaffCall.description}\n**Proof:** ${hasProof}`);

    document.getElementById('staff-call-description').value = '';
    proofInput.value = '';
}

function triggerAlert(customText) {
    const sound = document.getElementById('alert-sound');
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(e => console.log('Autoplay blocked by browser:', e));
    }

    const popup = document.getElementById('alert-popup');
    if (customText) {
        popup.innerText = customText;
    }
    popup.classList.add('show');
    
    if (alertTimeout) clearTimeout(alertTimeout);
    alertTimeout = setTimeout(() => {
        popup.classList.remove('show');
    }, 6000);
}

// Update Modal Client Logic
async function openUpdateModal() {
    const modal = document.getElementById('update-modal');
    const container = document.getElementById('update-logs-container');
    modal.style.display = 'flex';
    
    container.innerHTML = '<p>Loading updates...</p>';

    try {
        const response = await fetch('/updates.json');
        const data = await response.json();
        
        document.getElementById('version-label').innerText = data.currentVersion;

        let html = '';
        data.logs.forEach(log => {
            html += `
                <div style="border-bottom: 1px solid #444; margin-bottom: 10px; padding-bottom: 8px;">
                    <strong>${log.version}</strong> <span style="font-size: 12px; color: #aaa;">(${log.date})</span>
                    <ul style="margin: 5px 0 0 15px; padding: 0; font-size: 14px;">
                        ${log.changes.map(change => `<li>${change}</li>`).join('')}
                    </ul>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (error) {
        container.innerHTML = '<p style="color: red;">Could not load update logs.</p>';
    }
}

function closeUpdateModal() {
    document.getElementById('update-modal').style.display = 'none';
}

async function initVersionCheck() {
    try {
        const response = await fetch('/updates.json');
        const data = await response.json();
        const label = document.getElementById('version-label');
        if(label) label.innerText = data.currentVersion;
    } catch (e) {
        console.log('Could not fetch version number');
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.hidden-for-civ').forEach(el => el.classList.add('hidden-for-civ'));
        document.getElementById('civ-points-display').style.display = 'block';
        handleStaffReasonChange();
        initVersionCheck();
    });
}
