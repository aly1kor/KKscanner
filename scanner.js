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

const nextActions =
    document.getElementById("nextActions");

const scanNextBtn =
    document.getElementById("scanNextBtn");

const manualNextBtn =
    document.getElementById("manualNextBtn");

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

        // This makes both buttons appear.
        showNextActions();

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

function showNextActions(){

    confirmBtn.classList.add("hidden");

    nextActions.classList.remove("hidden");

}
// -----------------------------------------------------
// API
// -----------------------------------------------------
async function apiLookupByToken(token){

    const start = performance.now();

    const url =
        API +
        "?action=lookup&token=" +
        encodeURIComponent(token);

    const { response, result } =
        await fetchJsonWithRetry(url,6000);

    window.workerVersion =
        response.headers.get("X-Worker-Version") || "?";

    window.workerTime =
        response.headers.get("X-Worker-Time") || "?";

    console.log("Lookup Result:", result);

    updateDiagnostics(
        result,
        Math.round(performance.now() - start)
    );

    return result;

}

async function fetchJsonWithRetry(url, timeoutMs = 3000) {

    const MAX_RETRIES = 1;
console.log("fetchJsonWithRetry:", url);
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {

        const controller = new AbortController();
console.log("Timeout =", timeoutMs);
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            console.log("Attempt", attempt);
            const r = await fetch(url, {
                cache: "no-store",
                signal: controller.signal
            });

            clearTimeout(timeout);

            const text = await r.text();

            if (!r.ok) {
                throw new Error("HTTP " + r.status);
            }

            if (
                text.startsWith("<!DOCTYPE") ||
                text.startsWith("<html")
            ) {
                throw new Error("HTML returned instead of JSON");
            }

            return {
                response: r,
                result: JSON.parse(text)
            };

        } catch (err) {
            console.log(
    "Elapsed =",
    Math.round(performance.now() - startTime)
);
            
console.error("Attempt", attempt, err);
    clearTimeout(timeout);

    console.warn(
        "Attempt",
        attempt,
        "failed:",
        err.message
    );

    // Retry only transient errors
    if (
        err.name === "AbortError" ||
        err.message.includes("HTML") ||
        err.message.includes("404") ||
        err.message.includes("Failed to fetch") ||
        err.message.includes("Network")
    ) {

        if (attempt < MAX_RETRIES) {

            await new Promise(resolve =>
                setTimeout(resolve, attempt * 1000)
            );

            continue;
        }
    }
    console.error("FINAL FAILURE:", err);
            
    throw err;

}
    }
}

function clearCurrentPerson(){

    currentToken = "";

    document
        .getElementById("details")
        .classList.add("hidden");

    document
        .getElementById("searchResults")
        .classList.add("hidden");

    confirmBtn.classList.remove("hidden");

    nextActions.classList.add("hidden");

}

async function apiSearch(search){

    const start = performance.now();


    
 const url =
    API +
    "?action=search&search=" +
    encodeURIComponent(search);

const { response, result } =
    await fetchJsonWithRetry(url,6000);

window.workerVersion =
    response.headers.get("X-Worker-Version") || "?";

window.workerTime =
    response.headers.get("X-Worker-Time") || "?";


    
    

    updateDiagnostics(
        result,
        Math.round(performance.now() - start)
    );

    return result;

}

async function apiCheckin(token){

    const start = performance.now();

    const url =
        API +
        "?action=checkin&token=" +
        encodeURIComponent(token);

const { response, result } =
    await fetchJsonWithRetry(url, 8000);

    window.workerVersion =
        response.headers.get("X-Worker-Version") || "?";

    window.workerTime =
        response.headers.get("X-Worker-Time") || "?";

    console.log("Checkin response:", result);

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

    try {

        // If an old scanner object exists,
        // make sure it is completely cleared first.
        if (html5QrCode) {

            try {
                await html5QrCode.stop();
            }
            catch (err) {
                console.warn(
                    "Previous scanner stop:",
                    err.message
                );
            }

            try {
                await html5QrCode.clear();
            }
            catch (err) {
                console.warn(
                    "Previous scanner clear:",
                    err.message
                );
            }

            html5QrCode = null;
        }

        // Create a fresh scanner
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
    catch (err) {

        console.error(
            "startScanner failed:",
            err
        );

        html5QrCode = null;

        setStatus(
            "Unable to start scanner",
            "error"
        );

        throw err;
    }
}

 async function startNextScan() {

    // Hide current participant
    details.classList.add("hidden");

    // Hide search results
    searchResults.classList.add("hidden");

    // Hide next-action buttons
    nextActions.classList.add("hidden");

    // Reset token
    currentToken = "";

    // Show confirm button again
    confirmBtn.classList.remove("hidden");

    // Start scanner
    try {

        await startScanner();

    }
    catch (err) {

        console.error(
            "Failed to start next scan:",
            err
        );

        setStatus(
            "Unable to start scanner",
            "error"
        );
    }
}

async function stopScanner() {

    if (!html5QrCode) {
        return;
    }

    try {

        await html5QrCode.stop();

    }
    catch (err) {

        console.warn(
            "Scanner stop warning:",
            err.message
        );

    }

    try {

        await html5QrCode.clear();

    }
    catch (err) {

        console.warn(
            "Scanner clear warning:",
            err.message
        );

    }

    html5QrCode = null;
}

function startNextScan() {

    // Hide current participant details
    details.classList.add("hidden");

    // Hide search results
    searchResults.classList.add("hidden");

    // Hide next-action buttons
    nextActions.classList.add("hidden");

    // Reset current token
    currentToken = "";

    // Reset confirmation button
    confirmBtn.classList.remove("hidden");

    // Start scanner directly
    showScanner();

    setStatus("Ready to Scan", "success");
}
// -----------------------------------------------------
// QR detected
// -----------------------------------------------------

async function onScanSuccess(decodedText) {

    await stopScanner();

    setStatus("Looking up participant...");

    try {

        const person = await apiLookupByToken(decodedText);

        console.log(person);

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

scanNextBtn.addEventListener("click", async () => {

    try {

        await startNextScan();

    } catch (err) {

        console.error(
            "Failed to start next scan:",
            err
        );

        setStatus(
            "Unable to start scanner",
            "error"
        );
    }

});

manualNextBtn.addEventListener("click", () => {

    clearCurrentPerson();

    showManual();

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

        const result =
            await apiCheckin(currentToken);

        if (result.success) {

            setStatus(
                "Check-In Successful",
                "success"
            );

            confirmBtn.classList.add("hidden");

            nextActions.classList.remove("hidden");

            return;

        }

        setStatus(
            result.message,
            "error"
        );

        confirmBtn.disabled = false;

    }
    catch (err) {

        console.error(err);

        // Only verify if request timed out
        if (err.name === "AbortError") {

            setStatus(
                "Verifying check-in..."
            );

            try {

                const person =
                    await apiLookupByToken(currentToken);

                if (
                    person.found &&
                    person.checked
                ) {

                    setStatus(
                        "Check-In Successful",
                        "success"
                    );
                showNextActions();
                    return;

                }

            }
            catch (e) {

                console.error(e);

            }

        }

        setStatus(
            "Check-In Failed",
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

    const url =
        API +
        "?action=version&t=" +
        Date.now();

    const { response, result } =
        await fetchJsonWithRetry(url,6000);

    window.workerVersion =
        response.headers.get("X-Worker-Version") || "?";

    window.workerTime =
        response.headers.get("X-Worker-Time") || "?";
console.log("Version result:", result);
    return result;

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
