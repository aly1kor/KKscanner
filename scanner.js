// =====================================================
// Monthi Fest Check-In V1.1
// =====================================================

const API = "https://kkscanner-proxy.lobo-alwyn.workers.dev/";

let html5QrCode = null;
let currentToken = null;

// -----------------------------------------------------
// Controls
// -----------------------------------------------------

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

// -----------------------------------------------------
// API
// -----------------------------------------------------

async function apiLookup(token) {

    const r = await fetch(
        API +
        "?action=lookup&token=" +
        encodeURIComponent(token)
    );

    return await r.json();

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
