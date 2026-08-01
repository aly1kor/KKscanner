// =====================================================
// Monthi Fest Check-In V1.1
// =====================================================
let scanBusy = false;

const API = "https://kkscanner-proxy.lobo-alwyn.workers.dev/";

let html5QrCode = null;
let currentToken = null;

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

async function onScanSuccess(decodedText){

    if(scanBusy)
        return;

    scanBusy = true;

    html5QrCode.pause(true);

    try{
    console.time("QR Total");

    console.time("Lookup");
        const person = await apiLookup(decodedText);

            console.timeEnd("Lookup");

    console.timeEnd("QR Total");

        if(!person.found){

            scanBusy=false;

            html5QrCode.resume();

            setStatus(person.message,"error");

            return;

        }

        await stopScanner();

        showParticipant(person);

    }
    catch(err){

        scanBusy=false;

        html5QrCode.resume();

        setStatus("Lookup failed","error");

    }

}
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
            <strong>${person.name}</strong><br>
            ${person.regid}<br>
            Adults: ${person.adults} &nbsp;
            Children: ${person.children}
        `;

        card.addEventListener("click", function(){

            resultsDiv.classList.add("hidden");

            showParticipant(person);

        });

        resultsDiv.appendChild(card);

    });

}
// -----------------------------------------------------
// API
// -----------------------------------------------------
async function apiLookup(token) {

    const start = Date.now();

    const r = await fetch(
        API +
        "?action=lookup&token=" +
        encodeURIComponent(token)
    );

    const json = await r.json();

    setStatus(
        "Lookup took " +
        (Date.now() - start) +
        " ms"
    );

    return json;

}

async function apiSearch(search) {

    const r = await fetch(
        API +
        "?action=search&search=" +
        encodeURIComponent(search)
    );

    return await r.json();

}

async function apiCheckin(token) {

    const r = await fetch(
        API +
        "?action=checkin&token=" +
        encodeURIComponent(token)
    );

    return await r.json();

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

        console.log(err);

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

// -----------------------------------------------------
// Initial Screen
// -----------------------------------------------------

window.addEventListener("load", function () {

    goHome();

});

backBtn.addEventListener("click", goHome);
