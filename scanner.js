// =====================================================
// KK Scanner - Check-In Client
// =====================================================

const CLIENT_VERSION = "1.0.0";

const API =
    "https://kkscanner-proxy.lobo-alwyn.workers.dev/";

// =====================================================
// CLIENT NETWORK / CHECK-IN BEHAVIOUR
// =====================================================
const LOOKUP_TIMEOUT_MS = 6000;

    const MAX_RETRIES = 3;

const STATISTICS_ATTEMPTS = 3;
const STATISTICS_RETRY_DELAY_MS = 1000;


// Maximum time, in milliseconds, that the browser waits
// for one Worker request.
//
// This is intentionally longer than the Worker -> Apps Script
// timeout of 6000 ms, giving the Worker enough time to finish
// and return its response before the browser aborts.
//
// Normally: NEVER CHANGE.
const FETCH_TIMEOUT_MS = 8000;

// -----------------------------------------------------
// Normal API request timeout
// -----------------------------------------------------
//
// Maximum time the browser waits for a normal API request
// before aborting it.
//
// Used for operations such as:
//   - search
//   - QR lookup
//   - configuration
//   - statistics
//   - version
//   - check-in authorization
//
// 6000 = 6 seconds.
//
// INCREASE when:
//   - normal requests legitimately take >6 seconds
//   - you have confirmed the server is still processing
//     the request and the browser is giving up too early
//
// DECREASE when:
//   - you want the UI to fail faster
//   - slow requests should be abandoned sooner
//
// IMPACT OF INCREASING:
//   + fewer false timeout errors
//   - user may wait longer before seeing an error
//
// IMPACT OF DECREASING:
//   + faster error feedback
//   - greater chance of aborting a request that would
//     have succeeded shortly afterwards
//
// IMPORTANT:
// AbortController aborts the fetch and response processing,
// producing an AbortError. :contentReference[oaicite:0]{index=0}
//
// Recommended:
// 6000 ms
//
const API_TIMEOUT_MS = 6000;



// -----------------------------------------------------
// Check-in request timeout
// -----------------------------------------------------
//
// Maximum time the browser waits for the actual CHECK-IN
// request.
//
// This is deliberately longer than API_TIMEOUT_MS because
// check-in writes data to Google Sheets and is therefore
// more important than a normal read/search request.
//
// 8000 = 8 seconds.
//
// INCREASE when:
//   - check-in occasionally takes >8 seconds
//   - diagnostics show the Worker/Apps Script is still
//     processing when the browser aborts
//
// DECREASE when:
//   - you are certain check-in should always complete
//     within a shorter period
//
// IMPACT OF INCREASING:
//   + lower chance of falsely reporting a check-in timeout
//   - user can wait longer when something is genuinely stuck
//
// IMPORTANT:
// Do NOT blindly increase this to hide the intermittent
// delay problem. A timeout may protect the browser while
// Apps Script continues processing the request.
//
// Current recommended value:
// 8000 ms
//
const CHECKIN_TIMEOUT_MS = 8000;



// -----------------------------------------------------
// Check-in verification attempts
// -----------------------------------------------------
//
// Number of times the scanner checks whether the participant
// was actually checked in after the original check-in request
// did not produce a usable response.
//
// Example:
//
//   Check-in request fails/times out
//           ↓
//   Lookup attempt 1
//           ↓
//   Lookup attempt 2
//           ↓
//   ...
//   Lookup attempt 5
//
// 5 = maximum 5 verification lookups.
//
// INCREASE when:
//   - the Sheet update is sometimes delayed
//   - Apps Script successfully processes the check-in but
//     the subsequent lookup needs more time
//
// DECREASE when:
//   - verification is consistently fast
//   - you want to stop waiting sooner after an uncertain
//     check-in
//
// IMPACT OF INCREASING:
//   + better chance of detecting a delayed successful check-in
//   - longer maximum verification period
//   - more requests sent to the Worker / Apps Script
//
// IMPORTANT:
// These are LOOKUP requests, not additional check-in writes.
// That distinction is important because we deliberately do
// not retry the actual check-in operation.
//
// Current recommended value:
// 5
//
const VERIFICATION_ATTEMPTS = 5;



// -----------------------------------------------------
// Delay between verification attempts
// -----------------------------------------------------
//
// Time to wait between unsuccessful verification lookups.
//
// 1000 = 1 second.
//
// Example with 5 attempts:
//
// Attempt 1
//    ↓ wait 1 sec
// Attempt 2
//    ↓ wait 1 sec
// Attempt 3
//    ↓ wait 1 sec
// Attempt 4
//    ↓ wait 1 sec
// Attempt 5
//
// INCREASE when:
//   - Google Sheets / Apps Script needs more time to reflect
//     the check-in
//   - repeated immediate lookups are not useful
//
// DECREASE when:
//   - the Sheet normally updates almost immediately
//   - you want verification to complete faster
//
// IMPACT OF INCREASING:
//   + gives Apps Script/Sheets more time between checks
//   - increases total check-in verification time
//
// IMPACT OF DECREASING:
//   + faster verification
//   - may perform repeated lookups before the Sheet has
//     updated, increasing the chance of temporary
//     "not checked in yet" results
//
// Current recommended value:
// 1000 ms
//
const VERIFICATION_DELAY_MS = 1000;

// =====================================================
// CHECK-IN AUTHORIZATION CONFIGURATION
// =====================================================

// Maximum time to wait for the Worker PIN authorization
// request.
//
// This is deliberately shorter than the normal API timeout
// because the user is waiting for the PIN prompt.
//
// 4000 = 4 seconds.
//
// Increase if the Worker occasionally needs longer.
// Decrease only if you want faster failure detection.
//
// Recommended: 4000.
const AUTH_TIMEOUT_MS = 4000;

let qrLookupInProgress = false;
let html5QrCode = null;
let currentToken = null;
let scanBusy = false;

let checkinAuthorized = false;

let statisticsLoading = false;

let statisticsRefreshPending = false;

// Counter is supplied dynamically by Worker
// from Apps Script EVENT_CONFIG.
let checkinCounter = "";


// Event configuration loaded from Apps Script.
let EVENT_CONFIG = {};

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





function configureDiagnostics() {

    const diagnosticsSection =
        document.getElementById(
            "diagnosticsSection"
        );

    if (!diagnosticsSection) {

        console.warn(
            "Diagnostics section not found"
        );

        return;
    }

    console.log(
        "configureDiagnostics:",
        EVENT_CONFIG
    );

    if (
        EVENT_CONFIG &&
        EVENT_CONFIG.showDiagnostics === true
    ) {

        diagnosticsSection.classList.remove(
            "hidden"
        );

        console.log(
            "Diagnostics ENABLED"
        );

    }
    else {

        diagnosticsSection.classList.add(
            "hidden"
        );

        console.log(
            "Diagnostics DISABLED"
        );

    }
}


function resetCheckinDiagnostics() {

    window.checkinBrowserTime = null;
    window.checkinWorkerTime = null;
    window.checkinServerTime = null;
    window.checkinVerificationTime = null;
    window.checkinTotalTime = null;

    const ids = [
        "diagCheckinBrowserTime",
        "diagCheckinWorkerTime",
        "diagCheckinServerTime",
        "diagCheckinVerificationTime",
        "diagCheckinTotalTime"
    ];

    ids.forEach(function (id) {

        const element =
            document.getElementById(id);

        if (element) {
            element.textContent = "-";
        }

    });
}
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
    resetCheckinDiagnostics();
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
        // Diagnostics
        // -------------------------------------------------
        
        configureDiagnostics();
        
        if (
            EVENT_CONFIG &&
            EVENT_CONFIG.showDiagnostics === true
        ) {
        
            loadDiagnostics().catch(function (err) {
        
                console.error(
                    "Diagnostics failed:",
                    err
                );
        
            });
        
        }

    // -------------------------------------------------
    // Check-in status
    // -------------------------------------------------

    if (person.checked) {

        // Already checked in

        confirmBtn.classList.add("hidden");

        confirmBtn.disabled = true;


            
        
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
                "✓ Already Checked In at " +
                (
                    checkedInTime
                        ? " - " + checkedInTime
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

function updateSearchDiagnostics() {

    const browser =
        document.getElementById(
            "diagSearchBrowserTime"
        );

    const worker =
        document.getElementById(
            "diagSearchWorkerTime"
        );

    const server =
        document.getElementById(
            "diagSearchServerTime"
        );

    const total =
        document.getElementById(
            "diagSearchTotalTime"
        );


    if (
        !browser ||
        !worker ||
        !server ||
        !total
    ) {

        console.warn(
            "Search diagnostics elements not found"
        );

        return;
    }


    browser.textContent =
        window.searchBrowserTime ?? "-";

    worker.textContent =
        window.searchWorkerTime ?? "-";

    server.textContent =
        window.searchServerTime ?? "-";

    total.textContent =
        window.searchTotalTime ?? "-";

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
                
                configureDiagnostics();
                
                if (
                    EVENT_CONFIG &&
                    EVENT_CONFIG.showDiagnostics === true
                ) {
                
                    loadDiagnostics().catch(function (err) {
                
                        console.error(
                            "Diagnostics failed:",
                            err
                        );
                
                    });
                
                }
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
async function apiLookupByToken(
    token,
    updateDiagnostics = true
) {

    const start =
        performance.now();


    const url =
        API +
        "?action=lookup&token=" +
        encodeURIComponent(token);


    const { response, result } =
        await fetchJsonWithRetry(
            url,
            API_TIMEOUT_MS
        );


    // ---------------------------------------------
    // SEARCH / LOOKUP TIMING
    // ---------------------------------------------

    window.searchBrowserTime =
        Math.round(
            performance.now() - start
        );


    window.searchWorkerTime =
        response.headers.get(
            "X-Worker-Time"
        ) || "?";

    window.searchWorkerUpstreamTime =
    response.headers.get(
        "X-Worker-Upstream-Time"
    ) || "?";

    window.searchWorkerAttempts =
    response.headers.get(
        "X-Worker-Attempts"
    ) || "?";

    window.searchServerTime =
        result?.serverTime ?? "?";


    window.searchTotalTime =
        window.searchBrowserTime;

if (updateDiagnostics) {
    updateSearchDiagnostics();
}
    // ---------------------------------------------
    // EXISTING WORKER DIAGNOSTICS
    // ---------------------------------------------

    window.workerVersion =
        response.headers.get(
            "X-Worker-Version"
        ) || "?";


    window.workerTime =
        response.headers.get(
            "X-Worker-Time"
        ) || "?";


    console.log(
        "Lookup Result:",
        result
    );


    console.log(
        "Search timing:",
        {
            browser:
                window.searchBrowserTime,

            worker:
                window.searchWorkerTime,

             upstream:
            window.searchWorkerUpstreamTime,

            server:
                window.searchServerTime,

            total:
                window.searchTotalTime
        }
    );

    console.log("FULL SEARCH RESPONSE:", JSON.stringify(result, null, 2));


    return result;

}


async function fetchJsonWithRetry(
    url,
    timeoutMs,
    maxRetries = MAX_RETRIES
) {

    for (
        let attempt = 1;
        attempt <= maxRetries + 1;
        attempt++
    ) {

        const startTime =
            performance.now();


        const controller =
            new AbortController();


        const timeout =
            setTimeout(
                () => controller.abort(),
                FETCH_TIMEOUT_MS
            );


        try {

            console.log(
                "Fetch attempt:",
                attempt,
                "of",
                maxRetries + 1,
                url
            );


            const response =
                await fetch(
                    url,
                    {
                        cache: "no-store",
                        signal:
                            controller.signal
                    }
                );


            clearTimeout(timeout);


            const text =
                await response.text();


            // -----------------------------------------
            // HTTP ERROR
            // -----------------------------------------

            if (!response.ok) {

                throw new Error(
                    "HTTP " +
                    response.status
                );

            }


            // -----------------------------------------
            // HTML INSTEAD OF JSON
            // -----------------------------------------

            if (
                text.startsWith("<!DOCTYPE") ||
                text.startsWith("<html")
            ) {

                throw new Error(
                    "HTML returned instead of JSON"
                );

            }


            // -----------------------------------------
            // PARSE JSON
            // -----------------------------------------

            const result =
                JSON.parse(text);


            // -----------------------------------------
            // SUCCESS
            // -----------------------------------------

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


            // -----------------------------------------
            // RETRY
            // -----------------------------------------

            if (
                retryable &&
                attempt <= maxRetries
            ) {

                const retryDelay =
                    attempt * 1000;


                console.log(
                    "Retrying in",
                    retryDelay,
                    "ms..."
                );


                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            retryDelay
                        )
                );


                continue;
            }


            // -----------------------------------------
            // NO MORE RETRIES
            // -----------------------------------------

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

async function apiSearch(search)  {

    console.trace(
        "apiSearch() CALLED WITH:",
        search
    );

    const start =
        performance.now();


    const url =
        API +
        "?action=search&search=" +
        encodeURIComponent(search);


    const { response, result } =
        await fetchJsonWithRetry(
            url,
            API_TIMEOUT_MS
        );


    // ---------------------------------------------
    // SEARCH TIMING
    // ---------------------------------------------

    window.searchBrowserTime =
        Math.round(
            performance.now() - start
        );


    window.searchWorkerTime =
        response.headers.get(
            "X-Worker-Time"
        ) || "?";
    
window.workerUpstreamTime =
    response.headers.get(
        "X-Worker-Upstream-Time"
    ) || "?";

    window.searchServerTime =
        result?.serverTime ?? "?";


    window.searchTotalTime =
        window.searchBrowserTime;

    updateSearchDiagnostics();
    // ---------------------------------------------
    // EXISTING DIAGNOSTIC INFORMATION
    // ---------------------------------------------

    window.workerVersion =
        response.headers.get(
            "X-Worker-Version"
        ) || "?";


    window.workerTime =
        response.headers.get(
            "X-Worker-Time"
        ) || "?";


    console.log(
        "Search timing:",
        {
            browser:
                window.searchBrowserTime,

            worker:
                window.searchWorkerTime,

            server:
                window.searchServerTime,

            total:
                window.searchTotalTime
        }
    );

    console.log(
    "Worker timing details:",
    {
        worker:
            response.headers.get(
                "X-Worker-Time"
            ),

        upstreamFetch:
            response.headers.get(
                "X-Upstream-Fetch-Time"
            ),

        upstreamTotal:
            response.headers.get(
                "X-Upstream-Total-Time"
            ),

        attempts:
            response.headers.get(
                "X-Worker-Attempts"
            )
    }
);

    console.log("FULL SEARCH RESPONSE:", JSON.stringify(result, null, 2));

    return result;

}

async function ensureCheckinAuthorized() {

    // -------------------------------------------------
    // Already authorized on this browser session
    // -------------------------------------------------

    if (checkinAuthorized) {
        return true;
    }


    try {

        // -------------------------------------------------
        // First ask Worker whether PIN is required
        // -------------------------------------------------

        const result =
            await apiCheckinAuth("");


        console.log(
            "Initial Check-In authorization:",
            result
        );


        // =================================================
        // PIN NOT REQUIRED
        // =================================================

        if (
            result &&
            result.success === true &&
            result.authorized === true &&
            result.pinRequired === false
        ) {

            if (!result.counter) {

                console.error(
                    "Worker did not provide a check-in counter."
                );

                checkinAuthorized =
                    false;

                return false;
            }


            checkinAuthorized =
                true;


            checkinCounter =
                result.counter;


            return true;
        }


        // =================================================
        // PIN REQUIRED
        // =================================================

        if (
            result &&
            result.pinRequired === true
        ) {

            const pin =
                prompt(
                    "Check-In authorization required.\n\nEnter Check-In PIN:"
                );


            // User cancelled PIN dialog
            if (pin === null) {

                return false;
            }


            // Empty PIN
            if (
                pin.trim() === ""
            ) {

                alert(
                    "Please enter the Check-In PIN."
                );

                return false;
            }


            // -------------------------------------------------
            // Verify PIN
            // -------------------------------------------------

            const pinResult =
                await apiCheckinAuth(
                    pin.trim()
                );


            console.log(
                "PIN authorization result:",
                pinResult
            );


            // =================================================
            // CORRECT PIN
            // =================================================

            if (
                pinResult &&
                pinResult.success === true &&
                pinResult.authorized === true
            ) {

                if (!pinResult.counter) {

                    console.error(
                        "Worker did not provide a check-in counter."
                    );

                    checkinAuthorized =
                        false;

                    return false;
                }


                checkinAuthorized =
                    true;


                checkinCounter =
                    pinResult.counter;


                return true;
            }


            // =================================================
            // WRONG PIN
            // =================================================

            alert(
                pinResult?.message ||
                "Invalid Check-In PIN.\n\nPlease try again."
            );


            // IMPORTANT:
            // Authorization remains false.
            //
            // The caller must call ensureCheckinAuthorized()
            // again if another attempt is required.

            checkinAuthorized =
                false;


            return false;
        }


        // =================================================
        // UNEXPECTED RESPONSE
        // =================================================

        console.error(
            "Unexpected authorization response:",
            result
        );


        return false;

    }
    catch (err) {

        console.error(
            "Check-in authorization failed:",
            err
        );


        alert(
            "Unable to verify Check-In authorization.\n\nPlease try again."
        );


        return false;
    }
}



async function apiCheckinAuth(pin = "") {

    const url =
        API +
        "?action=checkinAuth&pin=" +
        encodeURIComponent(pin);


    const { response, result } =
        await fetchJsonWithRetry(
            url,
            AUTH_TIMEOUT_MS,
            0
        );


    window.workerVersion =
        response.headers.get(
            "X-Worker-Version"
        ) || "?";


    window.workerTime =
        response.headers.get(
            "X-Worker-Time"
        ) || "?";


    console.log(
        "Check-In authorization:",
        result
    );


    return result;
}

async function apiCheckin(token) {

    const start =
        performance.now();

    const url =
        API +
        "?action=checkin" +
        "&token=" +
        encodeURIComponent(token);

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () => controller.abort(),
            CHECKIN_TIMEOUT_MS
        );

    try {

        console.log(
            "Check-In request:",
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

        const text =
            await response.text();


        if (!response.ok) {

            throw new Error(
                "HTTP " +
                response.status
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


        // -----------------------------------------
        // CHECK-IN TIMING
        // -----------------------------------------

        window.checkinBrowserTime =
            Math.round(
                performance.now() - start
            );


        window.checkinWorkerTime =
            response.headers.get(
                "X-Worker-Time"
            ) || "?";


        window.checkinServerTime =
            result?.serverTime ?? "?";


        console.log(
            "Checkin response:",
            result
        );


        console.log(
            "Check-In timing:",
            {
                browser:
                    window.checkinBrowserTime,

                worker:
                    window.checkinWorkerTime,

                server:
                    window.checkinServerTime
            }
        );


        return result;

    }
    catch (err) {

        window.checkinBrowserTime =
            Math.round(
                performance.now() - start
            );


        console.error(
            "CHECK-IN REQUEST FAILED:",
            err
        );


        // IMPORTANT:
        // Do NOT retry the check-in request.
        //
        // The request may already have reached
        // Apps Script and updated the Sheet.
        //
        // The caller must verify the token instead.


        throw err;

    }
    finally {

        clearTimeout(timeout);

    }

}

async function verifyCheckinWithRetry(token) {

    console.log(
        "Starting Check-In verification:",
        token
    );


    for (
        let attempt = 1;
        attempt <= VERIFICATION_ATTEMPTS;
        attempt++
    ) {

        try {

            const result =
                await apiLookupByToken(token);


            console.log(
                "Check-In verification attempt:",
                attempt,
                result
            );


            if (
                result &&
                result.success === true &&
                result.checked === true
            ) {

                console.log(
                    "Check-In verification successful."
                );

                return true;
            }

        }
        catch (err) {

            console.error(
                "Check-In verification attempt failed:",
                attempt,
                err
            );
        }


        // ---------------------------------------------
        // Wait before next verification attempt
        // ---------------------------------------------

        if (
            attempt <
            VERIFICATION_ATTEMPTS
        ) {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        VERIFICATION_DELAY_MS
                    )
            );
        }
    }


    console.error(
        "Check-In verification failed after " +
        VERIFICATION_ATTEMPTS +
        " attempts."
    );


    return false;
}


async function apiStatistics() {

    const start =
        performance.now();

    const url =
        API +
        "?action=statistics" +
        "&t=" + Date.now() +
        "&r=" + Math.random();

    console.log(
        "STATISTICS REQUEST:",
        url
    );

    const { response, result } =
        await fetchJsonWithRetry(
            url,
            API_TIMEOUT_MS
        );

    console.log(
        "STATISTICS HTTP RESPONSE:",
        {
            status: response.status,
            ok: response.ok,
            workerVersion:
                response.headers.get(
                    "X-Worker-Version"
                ),
            workerTime:
                response.headers.get(
                    "X-Worker-Time"
                )
        }
    );

    console.log(
        "STATISTICS RESULT:",
        result
    );


    window.workerVersion =
        response.headers.get(
            "X-Worker-Version"
        ) || "?";

    window.workerTime =
        response.headers.get(
            "X-Worker-Time"
        ) || "?";

    window.workerAttempts =
        response.headers.get(
            "X-Worker-Attempts"
        ) || "?";


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

    if (statisticsLoading) {

        console.log(
            "Statistics request already in progress. Refresh queued."
        );

        statisticsRefreshPending = true;

        return null;
    }

    statisticsLoading = true;

    console.log(
        "===== LOAD STATISTICS START ====="
    );

    try {

        const stats =
            await apiStatistics();

        console.log(
            "STATISTICS FINAL RESULT:",
            stats
        );

        if (
            stats &&
            stats.success === true
        ) {

            updateStatistics(stats);
            updateHomeStatistics(stats);

            console.log(
                "===== LOAD STATISTICS SUCCESS ====="
            );

            return stats;
        }

        console.error(
            "Statistics response is not successful:",
            stats
        );

        return null;

    }
    catch (err) {

        console.error(
            "===== LOAD STATISTICS FAILED ====="
        );

        console.error(err);

        return null;

    }
    finally {

        statisticsLoading = false;

        // If another refresh was requested
        // while this request was running,
        // run exactly one more request.
        if (statisticsRefreshPending) {

            statisticsRefreshPending = false;

            console.log(
                "Running queued statistics refresh..."
            );

            loadStatistics().catch(function (err) {

                console.error(
                    "Queued statistics refresh failed:",
                    err
                );

            });
        }
    }
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

    // -------------------------------------------------
    // Prevent duplicate QR scan callbacks
    // -------------------------------------------------

    if (qrLookupInProgress) {

        console.log(
            "QR lookup already in progress. Ignoring duplicate scan."
        );

        return;
    }


    qrLookupInProgress = true;


    try {

        await stopScanner();


        setStatus(
            "Looking up participant..."
        );


        const person =
            await apiLookupByToken(
                decodedText
            );


        console.log(
            "QR Lookup Result:",
            person
        );


        if (!person.found) {

            setStatus(
                person.message,
                "error"
            );

            return;
        }


        showParticipant(
            person
        );

    }
    catch (err) {

        console.error(
            "QR LOOKUP ERROR:",
            err
        );


        setStatus(
            "Lookup failed",
            "error"
        );

    }
    finally {

        qrLookupInProgress =
            false;
    }
}


// -----------------------------------------------------
// Home Screen Buttons
// -----------------------------------------------------

scanModeBtn.addEventListener(
    "click",
    async function () {
        const authorized =
            await ensureCheckinAuthorized();

        if (!authorized) {
            return;
        }


        
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

    console.log(
        "MANUAL CHECK-IN BUTTON CLICKED"
    );


    // ---------------------------------------------
    // CHECK-IN AUTHORIZATION
    // ---------------------------------------------

    const authorized =
        await ensureCheckinAuthorized();

    if (!authorized) {

        console.log(
            "Manual Check-In authorization failed"
        );

        return;
    }


    // ---------------------------------------------
    // STOP SCANNER
    // ---------------------------------------------

    try {

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

    if (
        typeof setManualStatus ===
        "function"
    ) {

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


        // -----------------------------------------
        // START CHECK-IN TIMER
        // -----------------------------------------

        const checkinStartTime =
            performance.now();


        confirmBtn.disabled = true;

        setParticipantStatus(
            "Checking in..."
        );


        try {

            const result =
                await apiCheckin(
                    currentToken
                );


            // -------------------------------------
            // API RESPONSE RECEIVED
            // -------------------------------------

            if (
                result &&
                result.success
            ) {

                setParticipantStatus(
                    "Verifying Check-In..."
                );
                const verificationStartTime =
                    performance.now();

                try {

                const person =
                    await apiLookupByToken(
                        currentToken,
                        false
                    );

                    window.checkinVerificationTime =
                        Math.round(
                            performance.now() -
                            verificationStartTime
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
                        
                        const checkinTotalTime =
                            Math.round(
                                performance.now() -
                                checkinStartTime
                            );

                        // ---------------------------------
                        // STORE TOTAL CHECK-IN TIME
                        // ---------------------------------

                        window.checkinTotalTime =
                            checkinTotalTime;

                        


                        updateCheckinDiagnostics();

                        currentToken = null;

                        confirmBtn.disabled = false;

                        showNextActions();



                        // Statistics in background

                        loadStatistics()
                            .catch(function (err) {

                                console.error(
                                    "Statistics refresh failed:",
                                    err
                                );

                            });


                        return;

                    }

                }
                catch (verifyErr) {


                        window.checkinVerificationTime =
                        Math.round(
                            performance.now() -
                            verificationStartTime
                        );
                    console.error(
                        "Verification error:",
                        verifyErr
                    );

                }


                setParticipantStatus(
                    "Check-In verification failed",
                    "error"
                );

                confirmBtn.disabled = false;

                return;

            }


            // -------------------------------------
            // API EXPLICITLY REPORTED FAILURE
            // -------------------------------------

            setParticipantStatus(
                result?.message ||
                "Check-In failed",
                "error"
            );

            confirmBtn.disabled = false;

        }
        catch (err) {

            // -------------------------------------
            // IMPORTANT
            // CHECK-IN REQUEST MAY HAVE SUCCEEDED
            // EVEN THOUGH RESPONSE WAS LOST
            // -------------------------------------

            console.log(
                "Check-In response unavailable."
            );

            setParticipantStatus(
                "Verifying Check-In..."
            );


            let verified = false;


            // -------------------------------------
            // VERIFY — DO NOT RETRY CHECK-IN
            // -------------------------------------
            const verificationStartTime =
                performance.now();
            for (
                let attempt = 1;
                attempt <= VERIFICATION_ATTEMPTS;
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


                if (attempt < VERIFICATION_ATTEMPTS) {

                    await new Promise(
                        resolve =>
                            setTimeout(
                                resolve,
                                VERIFICATION_DELAY_MS
                            )
                    );

                }

            }
window.checkinVerificationTime =
    Math.round(
        performance.now() -
        verificationStartTime
    );

            if (verified) {
                
                setParticipantStatus(
                    "✓ Check-In Successful",
                    "success"
                );
                
                const checkinTotalTime =
                    Math.round(
                        performance.now() -
                        checkinStartTime
                    );


                window.checkinTotalTime =
                    checkinTotalTime;


                


                updateCheckinDiagnostics();

                currentToken = null;

                confirmBtn.disabled = false;

                showNextActions();


                loadStatistics()
                    .catch(function (statsErr) {

                        console.error(
                            "Statistics refresh failed:",
                            statsErr
                        );

                    });

            }
            else {

                setParticipantStatus(
                    "Unable to verify Check-In",
                    "error"
                );


                // Keep disabled because we don't
                // know whether the Sheet was updated.

                confirmBtn.disabled = true;

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

    // Load statistics without blocking Home
loadStatistics().catch(function (err) {
    console.error(
        "Home statistics refresh failed:",
        err
    );
});
    
    topBar.classList.add("hidden");


    searchText.value = "";

    confirmBtn.disabled = false;

    confirmBtn.classList.add("hidden");


    setStatus(
        "Select Scan or Manual Check-In"
    );


    // Refresh Home statistics
    // await loadStatistics();
}


function clearSearchResults() {

    searchText.value = "";

    resultsDiv.innerHTML = "";
    resultsDiv.classList.add("hidden");

    detailsDiv.classList.add("hidden");

    setStatus("Select a check-in method");

}


function updateCheckinDiagnostics() {

    const browser =
        document.getElementById(
            "diagCheckinBrowserTime"
        );

    const worker =
        document.getElementById(
            "diagCheckinWorkerTime"
        );

    const server =
        document.getElementById(
            "diagCheckinServerTime"
        );

    const verification =
        document.getElementById(
            "diagCheckinVerificationTime"
        );

    const total =
        document.getElementById(
            "diagCheckinTotalTime"
        );


    if (
        !browser ||
        !worker ||
        !server ||
        !verification ||
        !total
    ) {

        console.warn(
            "Check-In diagnostics elements not found"
        );

        return;
    }


    browser.textContent =
        window.checkinBrowserTime ?? "-";

    worker.textContent =
        window.checkinWorkerTime ?? "-";

    server.textContent =
        window.checkinServerTime ?? "-";

    verification.textContent =
        window.checkinVerificationTime ?? "-";

    total.textContent =
        window.checkinTotalTime ?? "-";
}
async function apiVersion(){

    const url =
        API +
        "?action=version&t=" +
        Date.now();

    const { response, result } =
        await fetchJsonWithRetry(url,API_TIMEOUT_MS);

    window.workerVersion =
        response.headers.get("X-Worker-Version") || "?";

    window.workerTime =
        response.headers.get("X-Worker-Time") || "?";
console.log("Version result:", result);
    return result;

}

async function loadDiagnostics() {

    const d =
        await apiVersion();


    const diagClient =
        document.getElementById("diagClient");

    const diagWorker =
        document.getElementById("diagWorker");

    const diagServer =
        document.getElementById("diagServer");

    const diagDeployment =
        document.getElementById("diagDeployment");

    const diagRows =
        document.getElementById("diagRows");


    if (
        !diagClient ||
        !diagWorker ||
        !diagServer ||
        !diagDeployment ||
        !diagRows
    ) {

        console.error(
            "Diagnostics HTML elements missing:",
            {
                diagClient,
                diagWorker,
                diagServer,
                diagDeployment,
                diagRows
            }
        );

        return;
    }


    diagClient.textContent =
        CLIENT_VERSION;

    diagWorker.textContent =
        window.workerVersion || "?";

    diagServer.textContent =
        d.serverVersion || "?";

    diagDeployment.textContent =
        d.deployment || "?";

    diagRows.textContent =
        d.rows || "?";

}

function clearDiagnostics() {

    document.getElementById("diagBrowserTime").textContent = "...";
    document.getElementById("diagWorkerTime").textContent = "...";
    document.getElementById("diagServerTime").textContent = "...";

}


function updateDiagnostics(
    result,
    verificationTime = null
) {

    const browser =
        document.getElementById(
            "diagCheckinBrowserTime"
        );

    const worker =
        document.getElementById(
            "diagCheckinWorkerTime"
        );

    const server =
        document.getElementById(
            "diagCheckinServerTime"
        );

    const verification =
        document.getElementById(
            "diagCheckinVerificationTime"
        );

    const total =
        document.getElementById(
            "diagCheckinTotalTime"
        );


    // -------------------------------------------------
    // Diagnostics elements may not exist on every page
    // -------------------------------------------------

    if (
        !browser &&
        !worker &&
        !server &&
        !verification &&
        !total
    ) {

        console.warn(
            "Check-In diagnostics elements not found."
        );

        return;
    }


    // -------------------------------------------------
    // Browser time
    // -------------------------------------------------

    if (browser) {

        browser.textContent =
            window.checkinBrowserTime ??
            "-";

    }


    // -------------------------------------------------
    // Worker time
    // -------------------------------------------------

    if (worker) {

        worker.textContent =
            window.checkinWorkerTime ??
            "-";

    }


    // -------------------------------------------------
    // Server time
    // -------------------------------------------------

    if (server) {

        server.textContent =
            window.checkinServerTime ??
            "-";

    }


    // -------------------------------------------------
    // Verification time
    // -------------------------------------------------

    if (verification) {

        verification.textContent =
            verificationTime ??
            window.checkinVerificationTime ??
            "-";

    }


    // -------------------------------------------------
    // Total time
    // -------------------------------------------------

    if (total) {

        total.textContent =
            window.checkinTotalTime ??
            "-";

    }
}

async function loadEventConfig() {

    const url =
        API +
        "?action=config&t=" +
        Date.now();

    const { result } =
        await fetchJsonWithRetry(
            url,
            API_TIMEOUT_MS
        );

    if (
        !result ||
        !result.success
    ) {

        throw new Error(
            "Invalid event configuration"
        );
    }

    EVENT_CONFIG = result;

    console.log(
        "Event configuration loaded:",
        EVENT_CONFIG
    );

    return EVENT_CONFIG;
}
// -----------------------------------------------------
// Initial Screen
// -----------------------------------------------------

window.addEventListener(
    "load",
    async function () {

        try {

            await loadEventConfig();

        }
        catch (err) {

            console.error(
                "Event configuration failed:",
                err
            );

            return;
        }


        try {

            loadStatistics().catch(function (err) {
    console.error("Statistics failed:", err);
});

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
