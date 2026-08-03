// =====================================================
// Monthi Fest Check-In V1.1
// =====================================================

const CLIENT_VERSION = "1.0.0";
const API = "https://kkscanner-proxy.lobo-alwyn.workers.dev/";

let html5QrCode = null;
let currentToken = null;
let scanBusy = false;

// -----------------------------------------------------
// Controls
// -----------------------------------------------------

const topBar = document.getElementById("topBar");
const backBtn = document.getElementById("backBtn");

const homeDiv = document.getElementById("home");
const scannerArea = document.getElementById("scannerArea");
const manualArea = document.getElementById("manualArea");

const statusDiv = document.getElementById("status");
const detailsDiv = document.getElementById("details");

const nameDiv = document.getElementById("name");
const regidDiv = document.getElementById("regid");

const adultsDiv = document.getElementById("adults");
const childrenDiv = document.getElementById("children");

const bandsDiv = document.getElementById("bandsCount");

const confirmBtn = document.getElementById("confirmBtn");

const scanModeBtn = document.getElementById("scanModeBtn");
const manualModeBtn = document.getElementById("manualModeBtn");

const lookupBtn = document.getElementById("lookupBtn");
const searchText = document.getElementById("searchText");

const resultsDiv = document.getElementById("searchResults");


// -----------------------------------------------------
// Status
// -----------------------------------------------------

function setStatus(text, css = "") {

    statusDiv.className = "status";

    if (css !== "")
        statusDiv.classList.add(css);

    statusDiv.innerHTML = text;

}

// -----------------------------------------------------
// Show Participant
// -----------------------------------------------------

function showParticipant(person) {
    searchText.value = "";
    currentToken = person.token;

    nameDiv.innerHTML = person.name;

    regidDiv.innerHTML =
        "Registration : " + person.regid;

    adultsDiv.innerHTML = person.adults;

    childrenDiv.innerHTML = person.children;

    bandsDiv.innerHTML = person.bands;

    detailsDiv.classList.remove("hidden");

    if (person.checked) {

        confirmBtn.disabled = true;

        setStatus(
            "Already checked in (" +
            person.checkedBy +
            ")",
            "error"
        );

    }
    else {

        confirmBtn.disabled = false;

        setStatus(
            "Participant Found",
            "success"
        );

    }

}


function showSearchResults(results) {

    detailsDiv.classList.add("hidden");

    resultsDiv.innerHTML = "";

    resultsDiv.classList.remove("hidden");

    setStatus(results.length + " participants found. Please select one.");

    results.forEach(function(person){

        const card = document.createElement("div");

        card.className = "resultCard";

card.innerHTML = `
<div style="font-size:24px;font-weight:bold;color:#00529B;">
    👤 ${person.name}
</div>

<div style="margin-top:6px;font-size:18px;">
    🪪 ${person.regid}
</div>

<div style="margin-top:8px;">
    👨 Adults: <b>${person.adults}</b>
    &nbsp;&nbsp;&nbsp;
    👧 Children: <b>${person.children}</b>
</div>

<div style="margin-top:10px;font-weight:bold;color:${
    person.checked ? "#198754" : "#d97706"
};">

${person.checked ? "✅ Already Checked-In" : "⏳ Not Checked-In"}

</div>
`;

        card.addEventListener("click", function(){

    resultsDiv.innerHTML = "";
    resultsDiv.classList.add("hidden");

    searchText.value = "";

    showParticipant(person);

        });

        resultsDiv.appendChild(card);

    });

}
// -----------------------------------------------------
// API
// -----------------------------------------------------
async function apiLookup(search){

    // clearDiagnostics();

    const start = performance.now();

    const r = await fetch(
        API + "?action=lookup&search=" + encodeURIComponent(search)
    );

    window.workerVersion =
        r.headers.get("X-Worker-Version") || "?";

    window.workerTime =
        r.headers.get("X-Worker-Time") || "?";

    const result = await r.json();

    updateDiagnostics(
        result,
        Math.round(performance.now() - start)
    );

    return result;

}

async function apiSearch(search){

    const start = performance.now();

    const r = await fetch(
        API +
        "?action=search&search=" +
        encodeURIComponent(search)
    );

    window.workerVersion =
        r.headers.get("X-Worker-Version") || "?";

    window.workerTime =
        r.headers.get("X-Worker-Time") || "?";

    const result = await r.json();

    updateDiagnostics(
        result,
        Math.round(performance.now() - start)
    );

    return result;

}

async function apiCheckin(token){

  //  clearDiagnostics();

    const start = performance.now();

    const r = await fetch(
        API + "?action=checkin&token=" + encodeURIComponent(token)
    );

    window.workerVersion =
        r.headers.get("X-Worker-Version") || "?";

    window.workerTime =
        r.headers.get("X-Worker-Time") || "?";

    const result = await r.json();

    updateDiagnostics(
        result,
        Math.round(performance.now() - start)
    );

    return result;

}

// -----------------------------------------------------
// QR Scanner
// -----------------------------------------------------

async function startScanner() {

    if (html5QrCode) {
        return;
    }

    html5QrCode = new Html5Qrcode("reader");

    await html5QrCode.start(

        {
            facingMode: "environment"
        },

        {
            fps: 10,
            qrbox: 250
        },

        onScanSuccess

    );

    setStatus(
        "Point the camera at a QR Code"
    );

}

async function stopScanner() {

    if (!html5QrCode)
        return;

    try {

        await html5QrCode.stop();

    }
    catch (e) {
    }

    html5QrCode = null;

}

// -----------------------------------------------------
// QR detected
// -----------------------------------------------------

async function onScanSuccess(decodedText) {

    await stopScanner();

    setStatus("Looking up participant...");

    try {

        const person = await apiLookup(decodedText);

        if (!person.found) {

            setStatus(
                person.message,
                "error"
            );

            return;

        }

        showParticipant(person);

    }
    catch (err) {
console.error(err);

        setStatus(
            "Lookup failed",
            "error"
        );

    }

}


// -----------------------------------------------------
// Home Screen Buttons
// -----------------------------------------------------

scanModeBtn.addEventListener("click", async function () {

    // Clear previous manual search
searchText.value = "";

resultsDiv.innerHTML = "";
resultsDiv.classList.add("hidden");

detailsDiv.classList.add("hidden");

setStatus("Point the camera at a QR Code");
    homeDiv.classList.add("hidden");
topBar.classList.remove("hidden");

    manualArea.classList.add("hidden");

    scannerArea.classList.remove("hidden");

    detailsDiv.classList.add("hidden");

    try {

        await startScanner();

    }
    catch (err) {

        console.error(err);

        setStatus(
            "Unable to start camera",
            "error"
        );

    }

});


manualModeBtn.addEventListener("click", function () {

    homeDiv.classList.add("hidden");
topBar.classList.remove("hidden");

    scannerArea.classList.add("hidden");

    manualArea.classList.remove("hidden");

    detailsDiv.classList.add("hidden");

    searchText.value = "";

    searchText.focus();

    setStatus(
        "Enter Registration ID, Email, Name or Token"
    );

});


// -----------------------------------------------------
// Manual Search
// -----------------------------------------------------

lookupBtn.addEventListener("click", async function () {

    const text = searchText.value.trim();
    
    // Clear previous search
    resultsDiv.innerHTML = "";
    resultsDiv.classList.add("hidden");
    detailsDiv.classList.add("hidden");
    
    if (text === "") {

        setStatus(
            "Please enter Registration ID, Email, Name or Token",
            "error"
        );

        return;

    }

    setStatus("Searching...");

lookupBtn.disabled = true;
lookupBtn.textContent = "Searching...";

try {

    const person = await apiSearch(text);

    if (!person.found) {

        setStatus(
            person.message,
            "error"
        );

        detailsDiv.classList.add("hidden");

        return;

    }

    if (person.multiple) {

        showSearchResults(person.results);

    } else {

        showParticipant(person);

    }

}
catch (err) {

    console.error(err);

    setStatus(
        "Search failed",
        "error"
    );

}
finally {

    lookupBtn.disabled = false;
    lookupBtn.textContent = "Lookup Registration";

}

});

searchText.addEventListener("keypress", function (e) {

    if (e.key === "Enter") {

        lookupBtn.click();

    }

});

// -----------------------------------------------------
// Confirm Check-In
// -----------------------------------------------------

confirmBtn.addEventListener("click", async function () {

    if (!currentToken)
        return;

    confirmBtn.disabled = true;

    setStatus("Checking in...");

    try {

        const result = await apiCheckin(currentToken);

        if (result.success) {

            setStatus(
                "Check-In Successful",
                "success"
            );

        }
        else {

            setStatus(
                result.message,
                "error"
            );

            confirmBtn.disabled = false;

        }

    }
    catch (err) {

        console.error(err);

        setStatus(
            "Check-In failed",
            "error"
        );

        confirmBtn.disabled = false;

    }

});





// -----------------------------------------------------
// Home
// -----------------------------------------------------

async function goHome() {
clearSearchResults();
    try {

        await stopScanner();

    }
    catch (e) {
    }

    currentToken = null;

    detailsDiv.classList.add("hidden");

    scannerArea.classList.add("hidden");

    manualArea.classList.add("hidden");

    homeDiv.classList.remove("hidden");

    topBar.classList.add("hidden");

    searchText.value = "";

    confirmBtn.disabled = false;

    setStatus("Select a check-in method");

}


function clearSearchResults() {

    searchText.value = "";

    resultsDiv.innerHTML = "";
    resultsDiv.classList.add("hidden");

    detailsDiv.classList.add("hidden");

    setStatus("Select a check-in method");

}

async function apiVersion(){

    const r = await fetch(
        API + "?action=version&t=" + Date.now()
    );

    window.workerVersion =
        r.headers.get("X-Worker-Version") || "?";

    window.workerTime =
        r.headers.get("X-Worker-Time") || "?";

    return await r.json();

}

async function loadDiagnostics() {

    const start = performance.now();

    const d = await apiVersion();

    const elapsed = Math.round(performance.now() - start);

    document.getElementById("dbgClient").textContent = CLIENT_VERSION;
    document.getElementById("dbgWorker").textContent = window.workerVersion || "?";
    document.getElementById("dbgServer").textContent = d.serverVersion || "?";
    document.getElementById("dbgDeployment").textContent = d.deployment || "?";
    document.getElementById("dbgRows").textContent = d.rows || "?";

    document.getElementById("dbgTime").textContent = elapsed;
    document.getElementById("dbgWorkerTime").textContent = window.workerTime || "?";
    document.getElementById("dbgServerTime").textContent = d.serverTime ?? "-";
}

function clearDiagnostics() {

    document.getElementById("dbgTime").textContent = "...";
    document.getElementById("dbgWorkerTime").textContent = "...";
    document.getElementById("dbgServerTime").textContent = "...";

}

function updateDiagnostics(response, elapsed) {

    document.getElementById("dbgClient").textContent = CLIENT_VERSION;
    document.getElementById("dbgWorker").textContent = window.workerVersion || "?";
    document.getElementById("dbgServer").textContent = response.serverVersion || "?";
    document.getElementById("dbgDeployment").textContent = response.deployment || "?";
    document.getElementById("dbgRows").textContent = response.rows || "?";

    document.getElementById("dbgTime").textContent = elapsed;
    document.getElementById("dbgWorkerTime").textContent = window.workerTime || "?";
    document.getElementById("dbgServerTime").textContent = response.serverTime ?? "-";

}
// -----------------------------------------------------
// Initial Screen
// -----------------------------------------------------

window.addEventListener("load", async function () {

    goHome();

    try {
        await loadDiagnostics();
    }
    catch (err) {
        console.error("Diagnostics failed:", err);
    }

});
backBtn.addEventListener("click", goHome);
