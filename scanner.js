// =====================================================
// Monthi Fest Check-In V1.1
// =====================================================

const CLIENT_VERSION = "1.0.0";
const API = "https://kkscanner-proxy.lobo-alwyn.workers.dev/";

let html5QrCode = null;
let currentToken = null;
let scanBusy = false;

let checkinAuthorized = false;
let checkinCounter = "Counter 1";

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

const manualNextBtn = document.getElementById("manualNextBtn");

const nextActions =  document.getElementById("nextActions");

const scanNextBtn = document.getElementById("scanNextBtn");

const scanModeBtn = document.getElementById("scanModeBtn");
const manualModeBtn = document.getElementById("manualModeBtn");

const lookupBtn = document.getElementById("lookupBtn");
const searchText = document.getElementById("searchText");

const resultsDiv = document.getElementById("results");


// -----------------------------------------------------
// Status
// -----------------------------------------------------

function setStatus(text, css = "") {
    const el = document.getElementById("status");

    if (!el) return;

    el.className = "status";

    if (css !== "") {
        el.classList.add(css);
    }

    el.textContent = text;
}

function setManualStatus(text, css = "") {

    const el =
        document.getElementById("manualStatus");

    if (!el) return;

    el.className = "status";

    if (css !== "") {
        el.classList.add(css);
    }

    el.textContent = text;
}


function setParticipantStatus(text, css = "") {

    const el =
        document.getElementById("participantStatus");

    if (!el) return;

    el.className = "status";

    if (css !== "") {
        el.classList.add(css);
    }

    el.textContent = text;
}

// -----------------------------------------------------
// Show Participant
// -----------------------------------------------------
function showParticipant(person) {

    searchText.value = "";

    currentToken = person.token;

    nameDiv.textContent =
        person.name || "";

    regidDiv.textContent =
        "Registration : " +
        (person.regid || "");

    adultsDiv.textContent =
        person.adults ?? 0;


    // -------------------------------------------------
    // Children
    // Hide the complete Children row when zero
    // -------------------------------------------------

    const childCount =
        Number(person.children) || 0;

    if (childCount > 0) {

        childrenDiv.textContent =
            childCount;

        childrenDiv.parentElement.style.display =
            "";

    }
    else {

        childrenDiv.textContent = "";

        childrenDiv.parentElement.style.display =
            "none";

    }


    bandsDiv.textContent =
        person.bands ?? 0;


    // -------------------------------------------------
    // Participant details are now the main screen
    // -------------------------------------------------

    scannerArea.classList.add("hidden");

    manualArea.classList.add("hidden");

    resultsDiv.classList.add("hidden");

    detailsDiv.classList.remove("hidden");

    nextActions.classList.add("hidden");


    // -------------------------------------------------
    // Check-in status
    // -------------------------------------------------

    if (person.checked) {

        // Already checked in

        confirmBtn.classList.add("hidden");

        confirmBtn.disabled = true;


                
        const checkedInCounter =
            person.checkedBy || "Counter 1";
        
        let checkedInTime = "";
        
        if (
            person.checkedAt ||
            person.checkinTime
        ) {
        
            const rawCheckedInTime =
                person.checkedAt ||
                person.checkinTime;
        
            const checkedDate =
                new Date(rawCheckedInTime);
        
            if (!isNaN(checkedDate.getTime())) {
        
                checkedInTime =
                    new Intl.DateTimeFormat(
                        "en-GB",
                        {
                            timeZone: "Europe/Berlin",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false
                        }
                    ).format(checkedDate);
        
            }
        }
        
        setParticipantStatus(
            "✓ Checked In at " +
            checkedInCounter +
            (
                checkedInTime
                    ? " · " + checkedInTime
                    : ""
            ),
            "error"
        );

        // Allow Scan Next

        nextActions.classList.remove("hidden");

    }
    else {

        // New participant

        confirmBtn.classList.remove("hidden");

        confirmBtn.disabled = false;

        setParticipantStatus(
            "Ready for Check-In"
        );

    }


    // -------------------------------------------------
    // Always show participant screen from the top
    // -------------------------------------------------

    window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant"
    });

}



function showSearchResults(results) {

    detailsDiv.classList.add("hidden");

    resultsDiv.innerHTML = "";

    resultsDiv.classList.remove("hidden");

    setStatus(
        results.length +
        " participants found. Please select one."
    );

    results.forEach(function(person) {

        const card =
            document.createElement("div");


        console.log(
    "SEARCH PERSON:",
    person,
    "CHILDREN:",
    person.children,
    "TYPE:",
    typeof person.children
);
        /*
         * Convert the children value to a number.
         */
        const childrenCount =
            Number(person.children);

        /*
         * Build the counts separately.
         * Children is added ONLY when greater than zero.
         */
        let countsHTML =
            `Adults: <b>${person.adults}</b>`;

        if (
            Number.isFinite(childrenCount) &&
            childrenCount > 0
        ) {

            countsHTML +=
                `&nbsp;&nbsp;&nbsp;
                 Children: <b>${childrenCount}</b>`;

        }

        card.className =
            person.checked
                ? "resultCard checkedIn"
                : "resultCard";

        card.innerHTML = `

            <div class="resultName">
                👤 ${person.name}
            </div>

            <div class="resultRegid">
                Registration: ${person.regid}
            </div>

            <div class="resultCounts">
                ${countsHTML}
            </div>

            <div class="${
                person.checked
                    ? "resultChecked"
                    : "resultNotChecked"
            }">

                ${
                    person.checked
                        ? "✓ Already Checked-In"
                        : "● Not Checked-In"
                }

            </div>

        `;

        card.addEventListener(
            "click",
            function() {

                resultsDiv.innerHTML = "";

                resultsDiv.classList.add("hidden");

                searchText.value = "";

                showParticipant(person);

            }
        );

        resultsDiv.appendChild(card);

    });

    window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant"
    });

}

function showNextActions() {

    confirmBtn.classList.add("hidden");

    nextActions.classList.remove("hidden");

    scannerArea.classList.add("hidden");

    manualArea.classList.add("hidden");

    resultsDiv.classList.add("hidden");

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

async function fetchJsonWithRetry(url, timeoutMs = 6000) {

    const MAX_RETRIES = 3;

    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {

        const startTime = performance.now();

        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () => controller.abort(),
                timeoutMs
            );

        try {

            console.log(
                "Fetch attempt:",
                attempt,
                url
            );

            const response =
                await fetch(
                    url,
                    {
                        cache: "no-store",
                        signal: controller.signal
                    }
                );

            clearTimeout(timeout);

            const text =
                await response.text();


            if (!response.ok) {

                throw new Error(
                    "HTTP " + response.status
                );

            }


            if (
                text.startsWith("<!DOCTYPE") ||
                text.startsWith("<html")
            ) {

                throw new Error(
                    "HTML returned instead of JSON"
                );

            }


            const result =
                JSON.parse(text);


            return {
                response: response,
                result: result
            };

        }
        catch (err) {

            clearTimeout(timeout);

            console.error(
                "Attempt " +
                attempt +
                " failed:",
                err
            );


            console.log(
                "Elapsed:",
                Math.round(
                    performance.now() -
                    startTime
                ),
                "ms"
            );


            const retryable =
                err.name === "AbortError" ||
                err.message.includes("HTML") ||
                err.message.includes("404") ||
                err.message.includes("Failed to fetch") ||
                err.message.includes("Network");


            if (
                retryable &&
                attempt < MAX_RETRIES
            ) {

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            attempt * 1000
                        )
                );

                continue;
            }


            throw err;
        }
    }


    throw new Error(
        "Request failed"
    );
}


function clearCurrentPerson(){

    currentToken = "";

    document
        .getElementById("details")
        .classList.add("hidden");

    document
        .getElementById("results")
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


async function ensureCheckinAuthorized() {

    if (checkinAuthorized) {
        return true;
    }

    const pin = prompt("Enter Check-In PIN");

    if (pin === null) {
        return false;
    }

    try {

        const result =
            await apiCheckinAuth(pin);

        console.log(
            "PIN authorization result:",
            result
        );

        if (
            result &&
            result.success === true &&
            result.authorized === true
        ) {

            checkinAuthorized = true;

            checkinCounter =
                result.counter || "Counter 1";

            return true;
        }

        alert(
            result?.message ||
            "Invalid Check-In PIN"
        );

        return false;

    }
    catch (err) {

        console.error(
            "Check-in authorization failed:",
            err
        );

        alert(
            "Unable to verify PIN"
        );

        return false;
    }
}

async function authorizeCheckin() {

    if (checkinAuthorized) {
        return true;
    }

    // PIN disabled in Worker
    const result =
        await apiCheckinAuth("");

    if (
        result &&
        result.success &&
        result.authorized
    ) {

        checkinAuthorized = true;

        checkinCounter =
            result.counter || "Counter 1";

        return true;
    }

    return false;
}
async function apiCheckinAuth(pin = "") {

    const url =
        API +
        "?action=checkinAuth&pin=" +
        encodeURIComponent(pin);

    const { response, result } =
        await fetchJsonWithRetry(url, 6000);

    window.workerVersion =
        response.headers.get("X-Worker-Version") || "?";

    window.workerTime =
        response.headers.get("X-Worker-Time") || "?";

    console.log(
        "Check-in authorization:",
        result
    );

    updateDiagnostics(
        result,
        0
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

async function apiStatistics() {

    const start = performance.now();

    const url =
        API +
        "?action=statistics" +
        "&t=" + Date.now() +
        "&r=" + Math.random();

    const { response, result } =
        await fetchJsonWithRetry(
            url,
            6000
        );

    window.workerVersion =
        response.headers.get("X-Worker-Version") || "?";

    window.workerTime =
        response.headers.get("X-Worker-Time") || "?";

    updateDiagnostics(
        result,
        Math.round(
            performance.now() - start
        )
    );

    return result;
}
function updateStatistics(stats) {

    if (!stats || !stats.success) {
        return;
    }

    document.getElementById(
        "statParticipants"
    ).textContent =
        stats.totalParticipants;

    document.getElementById(
        "statCheckedParticipants"
    ).textContent =
        stats.checkedInParticipants;

    document.getElementById(
        "statParticipantPercent"
    ).textContent =
        "(" +
        Number(
            stats.participantCheckInPercent
        ).toFixed(1) +
        "%)";

    document.getElementById(
        "statEntries"
    ).textContent =
        stats.totalEntries;

    document.getElementById(
        "statCheckedEntries"
    ).textContent =
        stats.checkedInEntries;

    document.getElementById(
        "statEntryPercent"
    ).textContent =
        "(" +
        Number(
            stats.entryCheckInPercent
        ).toFixed(1) +
        "%)";
}


function updateHomeStatistics(stats) {

    if (!stats || !stats.success) {
        return;
    }

    document.getElementById(
        "homeStatTotalParticipants"
    ).textContent =
        stats.totalParticipants;

    document.getElementById(
        "homeStatCheckedInParticipants"
    ).textContent =
        stats.checkedInParticipants;

    document.getElementById(
        "homeStatParticipantPercent"
    ).textContent =
        "(" +
        Number(
            stats.participantCheckInPercent
        ).toFixed(1) +
        "%)";

    document.getElementById(
        "homeStatTotalEntries"
    ).textContent =
        stats.totalEntries;

    document.getElementById(
        "homeStatCheckedInEntries"
    ).textContent =
        stats.checkedInEntries;

    document.getElementById(
        "homeStatEntryPercent"
    ).textContent =
        "(" +
        Number(
            stats.entryCheckInPercent
        ).toFixed(1) +
        "%)";
}




async function loadStatistics() {

    const maxAttempts = 3;


    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        try {

            console.log(
                "Loading statistics, attempt:",
                attempt
            );


            const stats =
                await apiStatistics();


            console.log(
                "Statistics result:",
                stats
            );


            if (
                stats &&
                stats.success
            ) {

                updateStatistics(stats);

                updateHomeStatistics(stats);

                return stats;
            }


            console.warn(
                "Invalid statistics response:",
                stats
            );

        }
        catch (err) {

            console.error(
                "Statistics attempt failed:",
                attempt,
                err
            );

        }


        if (
            attempt < maxAttempts
        ) {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        1000
                    )
            );

        }

    }


    console.error(
        "Statistics failed after all attempts"
    );


    return null;
}
// -----------------------------------------------------
// QR Scanner
// -----------------------------------------------------

async function startScanner() {

    try {

        // Stop previous scanner if it exists
        if (html5QrCode) {

            try {
                await html5QrCode.stop();
            }
            catch (err) {
                console.warn(
                    "Previous scanner stop:",
                    err
                );
            }

            try {
                await html5QrCode.clear();
            }
            catch (err) {
                console.warn(
                    "Previous scanner clear:",
                    err
                );
            }

            html5QrCode = null;
        }


        html5QrCode =
            new Html5Qrcode("reader");


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
            "START SCANNER FAILED:",
            err
        );

        html5QrCode = null;

        throw err;
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


async function startNextScan() {

    // Hide participant

    detailsDiv.classList.add("hidden");

    // Hide manual search

    manualArea.classList.add("hidden");

    // Hide search results

    resultsDiv.classList.add("hidden");

    // Hide next actions

    nextActions.classList.add("hidden");

    // Confirm hidden until participant is found

    confirmBtn.classList.add("hidden");

    confirmBtn.disabled = false;

    // Reset token

    currentToken = "";

    // Show scanner

    scannerArea.classList.remove("hidden");

    setStatus(
        "Starting camera..."
    );

    try {

        await startScanner();

        setStatus(
            "Point the camera at a QR Code"
        );

    }
    catch (err) {

        console.error(
            "START NEXT SCAN FAILED:",
            err
        );

        setStatus(
            "Unable to start scanner",
            "error"
        );

    }
}
// -----------------------------------------------------
// QR detected
// -----------------------------------------------------

async function onScanSuccess(decodedText) {

    await stopScanner();

    setStatus(
        "Looking up participant..."
    );

    try {

        const person =
            await apiLookupByToken(decodedText);

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

scanModeBtn.addEventListener(
    "click",
    async function () {

        searchText.value = "";

        resultsDiv.innerHTML = "";

        resultsDiv.classList.add("hidden");

        manualArea.classList.add("hidden");

        detailsDiv.classList.add("hidden");

        nextActions.classList.add("hidden");

        currentToken = "";

        homeDiv.classList.add("hidden");

        topBar.classList.remove("hidden");

        scannerArea.classList.remove("hidden");

        confirmBtn.classList.add("hidden");


        setStatus(
            "Point the camera at a QR Code"
        );


        try {

            await startScanner();

        }
        catch (err) {

            console.error(
                "Unable to start camera:",
                err
            );

            setStatus(
                "Unable to start camera",
                "error"
            );

        }

    }
);

manualModeBtn.onclick = async function (event) {

    event.preventDefault();
    event.stopPropagation();

    console.log("MANUAL CHECK-IN BUTTON CLICKED");

    try {

        // Stop scanner if it happens to be running
        await stopScanner();

    }
    catch (err) {

        console.warn(
            "Scanner stop warning:",
            err
        );

    }


    // ---------------------------------------------
    // HOME OFF
    // ---------------------------------------------

    homeDiv.classList.add("hidden");


    // ---------------------------------------------
    // TOP BAR ON
    // ---------------------------------------------

    topBar.classList.remove("hidden");


    // ---------------------------------------------
    // QR SCANNER OFF
    // ---------------------------------------------

    scannerArea.classList.add("hidden");


    // ---------------------------------------------
    // PARTICIPANT DETAILS OFF
    // ---------------------------------------------

    detailsDiv.classList.add("hidden");


    // ---------------------------------------------
    // NEXT ACTIONS OFF
    // ---------------------------------------------

    nextActions.classList.add("hidden");


    // ---------------------------------------------
    // SEARCH RESULTS OFF
    // ---------------------------------------------

    resultsDiv.classList.add("hidden");

    resultsDiv.innerHTML = "";


    // ---------------------------------------------
    // MANUAL SEARCH ON
    // ---------------------------------------------

    manualArea.classList.remove("hidden");


    // ---------------------------------------------
    // RESET SEARCH
    // ---------------------------------------------

    searchText.value = "";

    currentToken = "";


    // ---------------------------------------------
    // CONFIRM BUTTON OFF
    // ---------------------------------------------

    confirmBtn.classList.add("hidden");

    confirmBtn.disabled = false;


    // ---------------------------------------------
    // STATUS
    // ---------------------------------------------

    if (typeof setManualStatus === "function") {

        setManualStatus(
            "Enter Registration ID, Email, Name or Token"
        );

    }
    else {

        setStatus(
            "Enter Registration ID, Email, Name or Token"
        );

    }


    // ---------------------------------------------
    // FOCUS SEARCH FIELD
    // ---------------------------------------------

    setTimeout(function () {

        searchText.focus();

    }, 100);

};


manualNextBtn.addEventListener("click", async function () {

    console.log("MANUAL NEXT BUTTON CLICKED");

    try {

        await stopScanner();

    }
    catch (err) {

        console.warn(
            "Scanner stop warning:",
            err
        );

    }

    currentToken = "";

    detailsDiv.classList.add("hidden");

    scannerArea.classList.add("hidden");

    nextActions.classList.add("hidden");

    manualArea.classList.remove("hidden");

    resultsDiv.classList.add("hidden");
    resultsDiv.innerHTML = "";

    searchText.value = "";

    confirmBtn.classList.add("hidden");
    confirmBtn.disabled = false;

    setManualStatus(
        "Enter Registration ID, Email, Name or Token"
    );

    setTimeout(function () {

        searchText.focus();

    }, 100);

});

scanNextBtn.addEventListener("click", async () => {

    try {

        await startNextScan();

    }
    catch (err) {

        console.error(
            "SCAN NEXT ERROR:",
            err
        );

        const message =
            "Scanner error: " +
            (err?.message || err);

        setStatus(
            message,
            "error"
        );

        // Also show the real error on the phone
        alert(
            "SCAN NEXT ERROR\n\n" +
            "Name: " + (err?.name || "?") +
            "\n\nMessage: " +
            (err?.message || err)
        );
    }

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
    nextActions.classList.add("hidden");

    if (text === "") {

        setManualStatus(
            "Please enter Registration ID, Email, Name or Token",
            "error"
        );

        return;
    }

    setManualStatus(
        "Looking up participant..."
    );

    lookupBtn.disabled = true;
    lookupBtn.textContent = "Searching...";

    try {

        const person = await apiSearch(text);

        if (!person.found) {

            setManualStatus(
                person.message || "Participant not found",
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

    } catch (err) {

        console.error(
            "MANUAL SEARCH ERROR:",
            err
        );

        setManualStatus(
            "Search failed",
            "error"
        );

    } finally {

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

confirmBtn.addEventListener(
    "click",
    async function () {

        if (!currentToken) {
            return;
        }


        // ---------------------------------------------
        // CHECK-IN AUTHORIZATION
        // ---------------------------------------------

        const authorized =
            await ensureCheckinAuthorized();

        if (!authorized) {

            setParticipantStatus(
                "Check-In not authorized",
                "error"
            );

            return;
        }

        confirmBtn.disabled = true;

        setParticipantStatus(
            "Checking in..."
        );

        confirmBtn.disabled = true;

        setParticipantStatus(
            "Checking in..."
        );

        try {

            const result =
                await apiCheckin(currentToken);


            if (result && result.success) {

                setParticipantStatus(
                    "Verifying Check-In..."
                );


                try {

                    const person =
                        await apiLookupByToken(
                            currentToken
                        );


                    if (
                        person &&
                        person.found &&
                        person.checked
                    ) {

                        setParticipantStatus(
                            "✓ Check-In Successful",
                            "success"
                        );

                        currentToken = null;
                    
                        confirmBtn.disabled = false;
                        showNextActions();

                        // Refresh statistics

                        await loadStatistics();

                        return;
                    }

                }
                catch (verifyErr) {

                    console.error(
                        "Verification error:",
                        verifyErr
                    );

                }


                // API said success but Sheet
                // has not reflected it yet.

                setParticipantStatus(
                    "Check-In verification failed",
                    "error"
                );

                confirmBtn.disabled = false;

                return;
            }


            // API explicitly reported failure

            setParticipantStatus(
                result?.message ||
                "Check-In failed",
                "error"
            );

            confirmBtn.disabled = false;

        }
        catch (err) {

            console.error(
                "CHECK-IN REQUEST FAILED:",
                err
            );


            // Important because your Sheet can
            // already be updated even when the
            // request response is lost.

            setParticipantStatus(
                "Verifying Check-In..."
            );


            let verified = false;


            for (
                let attempt = 1;
                attempt <= 5;
                attempt++
            ) {

                try {

                    const person =
                        await apiLookupByToken(
                            currentToken
                        );


                    if (
                        person &&
                        person.found &&
                        person.checked
                    ) {

                        verified = true;

                        break;

                    }

                }
                catch (verifyErr) {

                    console.error(
                        "Verification attempt " +
                        attempt +
                        " failed:",
                        verifyErr
                    );

                }


                if (attempt < 5) {

                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                1000
                            )
                    );

                }

            }


            if (verified) {

                setParticipantStatus(
                    "Check-In Successful",
                    "success"
                );

                showNextActions();

            }
            else {

                setParticipantStatus(
                    "Unable to verify Check-In",
                    "error"
                );

                // Keep disabled because we don't know
                // whether Google Sheet was actually updated.

                confirmBtn.disabled = true;

            }


            // Statistics are refreshed regardless.

            try {

                await loadStatistics();

            }
            catch (statsErr) {

                console.error(
                    "Statistics refresh failed:",
                    statsErr
                );

            }

        }

    }
);



// -----------------------------------------------------
// Home
// -----------------------------------------------------

async function goHome() {

    clearSearchResults();


    try {

        await stopScanner();

    }
    catch (err) {

        console.warn(
            "Home scanner stop:",
            err
        );

    }


    currentToken = "";


    detailsDiv.classList.add("hidden");

    scannerArea.classList.add("hidden");

    manualArea.classList.add("hidden");

    resultsDiv.classList.add("hidden");

    nextActions.classList.add("hidden");


    homeDiv.classList.remove("hidden");

    topBar.classList.add("hidden");


    searchText.value = "";

    confirmBtn.disabled = false;

    confirmBtn.classList.add("hidden");


    setStatus(
        "Select Scan or Manual Check-In"
    );


    // Refresh Home statistics
    await loadStatistics();
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

    const elapsed =
        Math.round(
            performance.now() - start
        );


    document.getElementById(
        "diagClient"
    ).textContent =
        CLIENT_VERSION;


    document.getElementById(
        "diagWorker"
    ).textContent =
        window.workerVersion || "?";


    document.getElementById(
        "diagServer"
    ).textContent =
        d.serverVersion || "?";


    document.getElementById(
        "diagDeployment"
    ).textContent =
        d.deployment || "?";


    document.getElementById(
        "diagRows"
    ).textContent =
        d.rows || "?";


    document.getElementById(
        "diagBrowserTime"
    ).textContent =
        elapsed;


    document.getElementById(
        "diagWorkerTime"
    ).textContent =
        window.workerTime || "?";


    document.getElementById(
        "diagServerTime"
    ).textContent =
        d.serverTime ?? "-";
}

function clearDiagnostics() {

    document.getElementById("diagBrowserTime").textContent = "...";
    document.getElementById("diagWorkerTime").textContent = "...";
    document.getElementById("diagServerTime").textContent = "...";

}

function updateDiagnostics(response, elapsed) {

    document.getElementById(
        "diagClient"
    ).textContent =
        CLIENT_VERSION;


    document.getElementById(
        "diagWorker"
    ).textContent =
        window.workerVersion || "?";


    document.getElementById(
        "diagServer"
    ).textContent =
        response.serverVersion || "?";


    document.getElementById(
        "diagDeployment"
    ).textContent =
        response.deployment || "?";


    document.getElementById(
        "diagRows"
    ).textContent =
        response.rows || "?";


    document.getElementById(
        "diagBrowserTime"
    ).textContent =
        elapsed;


    document.getElementById(
        "diagWorkerTime"
    ).textContent =
        window.workerTime || "?";


    document.getElementById(
        "diagServerTime"
    ).textContent =
        response.serverTime ?? "-";
}


// -----------------------------------------------------
// Initial Screen
// -----------------------------------------------------

window.addEventListener(
    "load",
    async function () {

        goHome();


        try {

            await loadDiagnostics();

        }
        catch (err) {

            console.error(
                "Diagnostics failed:",
                err
            );

        }


        try {

            await loadStatistics();

        }
        catch (err) {

            console.error(
                "Statistics failed:",
                err
            );

        }

    }
);


backBtn.addEventListener("click", goHome);
