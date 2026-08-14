

// =====================================================
// WORKER TECHNICAL CONFIGURATION
// =====================================================

const WORKER_VERSION = "1.0.0";

// =====================================================
// WORKER ENVIRONMENT / SECRET NAMES
// =====================================================

// Name of the Cloudflare Worker environment variable
// containing the deployed Google Apps Script Web App URL.
//
// CHANGE THIS ONLY if the environment variable itself
// is renamed in Cloudflare Worker settings.
// Normally: NEVER CHANGE.
const APPS_SCRIPT_URL_ENV = "APPS_SCRIPT_URL";


// Name of the Cloudflare Worker secret/environment variable
// containing the Check-In PIN.
//
// CHANGE THIS ONLY if the secret variable is renamed
// in Cloudflare Worker settings.
// The actual PIN value is NOT stored in this source code.
// Normally: NEVER CHANGE.
const CHECKIN_PIN_ENV = "CHECKIN_PIN";



// =====================================================
// APPS SCRIPT REQUEST BEHAVIOUR
// =====================================================

// Maximum time, in milliseconds, that the Worker waits
// for ONE request to Google Apps Script.
//
// 6000 = 6 seconds.
//
// Increase this only if Apps Script normally needs more
// than 6 seconds to respond.
//
// Decrease it only if you want faster failure detection.
//
// IMPORTANT:
// This affects the Worker -> Apps Script request only.
// It does NOT represent the total time seen by the user.
//
// Recommended starting value: 6000.
const APPS_SCRIPT_TIMEOUT_MS = 6000;




// =====================================================
// APPS SCRIPT FORWARDING / RETRY CONFIGURATION
// =====================================================

// Delay, in milliseconds, between retry attempts.
//
// 1000 = wait 1 second before the next attempt.
//
// This value is used only when a request is configured
// to allow more than one forwarding attempt.
//
// Normally: NEVER CHANGE.
const RETRY_DELAY_MS = 1000;


// Number of forwarding attempts for NORMAL requests.
//
// 4 = maximum 4 attempts.
//
// Normal requests may be retried when:
// - the Apps Script request fails, or
// - Google returns a response identified as retryable.
//
// Increase only if temporary Google / Apps Script
// availability problems require additional retries.
//
// Decrease if retries are causing unnecessary delays.
//
// Normally: NEVER CHANGE.
const NORMAL_FORWARD_ATTEMPTS = 4;


// Number of forwarding attempts for CHECK-IN requests.
//
// 1 = exactly one attempt.
//
// IMPORTANT:
// Check-in requests can modify the Google Sheet.
// Therefore, automatic retries are intentionally disabled.
//
// This prevents the Worker from sending the same check-in
// operation to Apps Script multiple times if the first
// request reached Apps Script but the response was delayed
// or returned an unexpected response.
//
// Normally: NEVER CHANGE.
const CHECKIN_FORWARD_ATTEMPTS = 1;

// =====================================================
// EVENT CONFIGURATION KV
// =====================================================

const EVENT_CONFIG_KV_KEY = "event-config";

async function fetchEventConfigFromAppsScript(
    APPS_SCRIPT_URL
) {

    const response =
        await fetch(
            APPS_SCRIPT_URL +
            "?action=config&_" +
            Date.now(),
            {
                method: "GET",
                redirect: "follow",

                signal:
                    AbortSignal.timeout(
                        APPS_SCRIPT_TIMEOUT_MS
                    ),

                cf: {
                    cacheTtl: 0,
                    cacheEverything: false
                },

                headers: {
                    "Cache-Control":
                        "no-cache",

                    "Pragma":
                        "no-cache"
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            "Config request failed: HTTP " +
            response.status
        );
    }


    const data =
        await response.json();


    if (
        !data ||
        data.success !== true
    ) {

        throw new Error(
            data?.message ||
            "Invalid event configuration"
        );
    }


    console.log(
        "Apps Script Event Config:",
        JSON.stringify(data)
    );


    return data;
}

export default {



    async fetch(request, env) {

        const APPS_SCRIPT_URL =
            env[APPS_SCRIPT_URL_ENV];

        const CHECKIN_PIN =
            env[CHECKIN_PIN_ENV];

        const EVENT_CONFIG_KV =
            env.EVENT_CONFIG_KV;

        // -------------------------------------------------
        // Handle browser CORS preflight
        // -------------------------------------------------

        if (request.method === "OPTIONS") {

            return new Response(null, {
                headers: corsHeaders()
            });

        }


        const url =
            new URL(request.url);


        const action =
            url.searchParams.get("action") || "";

        const token =
            url.searchParams.get("token") || "";

        const counter =
            url.searchParams.get("counter") || "";

        const search =
            url.searchParams.get("search") || "";

        const pin =
            url.searchParams.get("pin") || "";

// =====================================================
// EVENT CONFIGURATION
// =====================================================
//
// Browser calls this once when the page loads/refreshed.
//
// Worker fetches Apps Script configuration and stores it
// permanently in KV.
//
// This is NOT time-expiring.
//
// =====================================================

if (action === "config") {

    try {

        const eventConfig =
            await fetchEventConfigFromAppsScript(
                APPS_SCRIPT_URL
            );


        // ---------------------------------------------
        // Store latest configuration in KV
        // ---------------------------------------------

        if (EVENT_CONFIG_KV) {

            try {

                await EVENT_CONFIG_KV.put(
                    EVENT_CONFIG_KV_KEY,
                    JSON.stringify(eventConfig)
                );

                console.log(
                    "Event configuration stored in KV."
                );

            }
            catch (kvErr) {

                console.error(
                    "Failed to store Event Config in KV:",
                    kvErr
                );

                // Do not fail the config request.
            }

        }


        return new Response(
            JSON.stringify(eventConfig),
            {
                status: 200,

                headers: {
                    ...corsHeaders(),

                    "Content-Type":
                        "application/json",

                    "Cache-Control":
                        "no-store, no-cache",

                    "X-Worker-Version":
                        WORKER_VERSION
                }
            }
        );

    }
    catch (err) {

        console.error(
            "EVENT CONFIG ERROR:",
            err
        );


        return new Response(
            JSON.stringify({
                success: false,
                message:
                    err.toString()
            }),
            {
                status: 500,

                headers: {
                    ...corsHeaders(),

                    "Content-Type":
                        "application/json",

                    "X-Worker-Version":
                        WORKER_VERSION
                }
            }
        );
    }
}
        // =================================================
        // CHECK-IN AUTHORIZATION
        // =================================================
        //
        // This is handled entirely by the Worker.
        // It is NOT forwarded to Apps Script.
        //
        // =================================================

if (action === "checkinAuth") {

    // =================================================
    // READ EVENT CONFIG FROM KV
    // =================================================

    let eventConfig = null;


    if (EVENT_CONFIG_KV) {

        try {

            eventConfig =
                await EVENT_CONFIG_KV.get(
                    EVENT_CONFIG_KV_KEY,
                    {
                        type: "json"
                    }
                );

        }
        catch (kvErr) {

            console.error(
                "Event Config KV read failed:",
                kvErr
            );

        }

    }


    // =================================================
    // FALLBACK
    // =================================================
    //
    // Normally this should NOT happen because the browser
    // loads /config when the page starts.
    //
    // It protects against:
    // - first-ever use
    // - cleared KV
    // - KV propagation delay
    // - a new Worker location/instance
    //
    // =================================================

    if (!eventConfig) {

        try {

            console.log(
                "Event configuration not available in KV. Fetching from Apps Script..."
            );


            eventConfig =
                await fetchEventConfigFromAppsScript(
                    APPS_SCRIPT_URL
                );


            // Store it for subsequent requests.

            if (EVENT_CONFIG_KV) {

                try {

                    await EVENT_CONFIG_KV.put(
                        EVENT_CONFIG_KV_KEY,
                        JSON.stringify(eventConfig)
                    );

                }
                catch (kvErr) {

                    console.error(
                        "Failed to store fallback Event Config:",
                        kvErr
                    );

                }

            }

        }
        catch (configErr) {

            console.error(
                "Unable to obtain Event Config:",
                configErr
            );


            return new Response(
                JSON.stringify({
                    success: false,
                    authorized: false,
                    code: "CONFIG_NOT_AVAILABLE",
                    message:
                        "Event configuration unavailable"
                }),
                {
                    status: 503,

                    headers: {
                        ...corsHeaders(),

                        "Content-Type":
                            "application/json",

                        "Cache-Control":
                            "no-store, no-cache",

                        "X-Worker-Version":
                            WORKER_VERSION
                    }
                }
            );

        }

    }


    // =================================================
    // EVENT CONFIGURATION
    // =================================================

    const checkinCounter =
        eventConfig.counters?.[0] || "";


    const requireCounterPin =
        eventConfig.requireCounterPin === true;


    console.log(
        "Check-In using Event Config:",
        JSON.stringify({
            requireCounterPin,
            counter: checkinCounter
        })
    );


    // =================================================
    // PIN NOT REQUIRED
    // =================================================

    if (!requireCounterPin) {

        return new Response(
            JSON.stringify({
                success: true,
                authorized: true,
                counter: checkinCounter,
                pinRequired: false
            }),
            {
                status: 200,

                headers: {
                    ...corsHeaders(),

                    "Content-Type":
                        "application/json",

                    "Cache-Control":
                        "no-store, no-cache",

                    "X-Worker-Version":
                        WORKER_VERSION
                }
            }
        );

    }


    // =================================================
    // PIN REQUIRED — NO PIN PROVIDED
    // =================================================

    if (!pin) {

        return new Response(
            JSON.stringify({
                success: false,
                authorized: false,
                counter: checkinCounter,
                pinRequired: true,
                message: "PIN required"
            }),
            {
                status: 200,

                headers: {
                    ...corsHeaders(),

                    "Content-Type":
                        "application/json",

                    "Cache-Control":
                        "no-store, no-cache",

                    "X-Worker-Version":
                        WORKER_VERSION
                }
            }
        );

    }


    // =================================================
    // VERIFY PIN
    // =================================================

    if (
        !CHECKIN_PIN ||
        pin !== CHECKIN_PIN
    ) {

        return new Response(
            JSON.stringify({
                success: false,
                authorized: false,
                counter: checkinCounter,
                pinRequired: true,
                message: "Invalid Check-In PIN"
            }),
            {
                status: 403,

                headers: {
                    ...corsHeaders(),

                    "Content-Type":
                        "application/json",

                    "Cache-Control":
                        "no-store, no-cache",

                    "X-Worker-Version":
                        WORKER_VERSION
                }
            }
        );

    }


    // =================================================
    // CORRECT PIN
    // =================================================

    return new Response(
        JSON.stringify({
            success: true,
            authorized: true,
            counter: checkinCounter,
            pinRequired: true
        }),
        {
            status: 200,

            headers: {
                ...corsHeaders(),

                "Content-Type":
                    "application/json",

                "Cache-Control":
                    "no-store, no-cache",

                "X-Worker-Version":
                    WORKER_VERSION
            }
        }
    );

}



        // =================================================
        // EXISTING APPS SCRIPT FORWARDING
        // =================================================

       // const APPS_SCRIPT_URL =
      //      "https://script.google.com/macros/s/AKfycby9LoqLt8gtR2XzC7VhMvWKIMcwgJ0ti6B61NWA6n2EpwCCiuhflNFlpQ0sOt8UqAGYjw/exec";


        const target =
            `${APPS_SCRIPT_URL}?action=${encodeURIComponent(action)}` +
            `&token=${encodeURIComponent(token)}` +
            `&search=${encodeURIComponent(search)}` +
            `&counter=${encodeURIComponent(counter)}` +
            `&_=${Date.now()}-${Math.random()}`;


// =====================================================
// APPS SCRIPT FORWARDING
// =====================================================

const maxAttempts =
    action === "checkin"
        ? CHECKIN_FORWARD_ATTEMPTS
        : NORMAL_FORWARD_ATTEMPTS;

try {

    let response = null;
    let body = "";

    let forwardAttempts = 0;

    let upstreamFetchTime = 0; 
    let upstreamTotalTime = 0;

    const workerStart = Date.now();

    for (
        let attempt = 1;
        attempt <= maxAttempts;
        attempt++
    ) {

        forwardAttempts = attempt;

        const controller =
            new AbortController();

        const timer =
            setTimeout(
                () => controller.abort(),
                APPS_SCRIPT_TIMEOUT_MS
            );

        try {

            const upstreamStart =
                Date.now();

            // ---------------------------------------------
            // WORKER -> APPS SCRIPT
            // ---------------------------------------------

            response =
                await fetch(
                    target,
                    {
                        method: "GET",
                        redirect: "follow",

                        signal:
                            controller.signal,

                        cf: {
                            cacheTtl: 0,
                            cacheEverything: false
                        },

                        headers: {
                            "Cache-Control":
                                "no-cache",

                            "Pragma":
                                "no-cache"
                        }
                    }
                );

            // ---------------------------------------------
            // TIME UNTIL APPS SCRIPT RESPONSE HEADERS
            // ---------------------------------------------

            upstreamFetchTime =
                Date.now() - upstreamStart;

            // ---------------------------------------------
            // READ RESPONSE BODY
            // ---------------------------------------------

            body =
                await response.text();

            // ---------------------------------------------
            // TOTAL WORKER -> APPS SCRIPT TIME
            // INCLUDING RESPONSE BODY
            // ---------------------------------------------

            upstreamTotalTime =
                Date.now() - upstreamStart;

        }
        catch (err) {

            console.log(
                `Attempt ${attempt} fetch error:`,
                err.name,
                err.message
            );

            if (
                attempt < maxAttempts
            ) {

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            RETRY_DELAY_MS
                        )
                );

                continue;
            }

            throw err;

        }
        finally {

            clearTimeout(timer);

        }


        // ---------------------------------------------
        // CHECK RETRYABLE GOOGLE RESPONSE
        // ---------------------------------------------

        const retry =
            response.status === 404 ||
            body.startsWith("<!DOCTYPE") ||
            body.startsWith("<html") ||
            body.includes(
                "Datei kann derzeit nicht geöffnet"
            ) ||
            body.includes(
                "Sorry, unable"
            ) ||
            body.includes(
                "We're sorry"
            );


        console.log(
            JSON.stringify({
                attempt,
                status:
                    response.status,
                bytes:
                    body.length,
                retry,
                upstreamFetchTime,
                upstreamTotalTime
            })
        );


        // ---------------------------------------------
        // SUCCESS / NON-RETRYABLE RESPONSE
        // ---------------------------------------------

        if (!retry) {

            break;

        }


        console.log(
            `Attempt ${attempt}: Google returned HTML/404, retrying...`
        );


        if (
            attempt < maxAttempts
        ) {

            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        RETRY_DELAY_MS
                    )
            );

        }

    }


    // ---------------------------------------------
    // NO RESPONSE
    // ---------------------------------------------

    if (!response) {

        throw new Error(
            "No response received from Google"
        );

    }


    // ---------------------------------------------
    // TOTAL WORKER TIME
    // ---------------------------------------------

    const totalWorkerTime =
        Date.now() - workerStart;


    // ---------------------------------------------
    // RETURN TO BROWSER
    // ---------------------------------------------

    return new Response(
        body,
        {
            status:
                response.status,

            headers: {

                ...corsHeaders(),

                "Content-Type":
                    "application/json",

                "Cache-Control":
                    "no-store, no-cache, must-revalidate",

                "X-Worker-Version":
                    WORKER_VERSION,

                "X-Worker-Time":
                    totalWorkerTime,

                "X-Worker-Attempts":
                    forwardAttempts,

                "X-Worker-Upstream-Time":
                    upstreamFetchTime,

                "X-Upstream-Fetch-Time":
                    upstreamFetchTime,

                "X-Upstream-Total-Time":
                    upstreamTotalTime

            }
        }
    );

}
catch (err) {

    console.error(
        "WORKER ERROR"
    );

    console.error(err);

    console.error(err.stack);


    return new Response(
        JSON.stringify({
            success: false,
            message:
                err.toString()
        }),
        {
            status: 500,

            headers: {
                ...corsHeaders(),

                "Content-Type":
                    "application/json"
            }
        }
    );

}

    }

};


function corsHeaders() {

    return {

        "Access-Control-Allow-Origin":
            "*",

        "Access-Control-Allow-Methods":
            "GET, POST, OPTIONS",

        "Access-Control-Allow-Headers":
            "*",

        "Access-Control-Expose-Headers":
            "X-Worker-Version, X-Worker-Time, X-Worker-Attempts, X-Worker-Upstream-Time, X-Upstream-Fetch-Time, X-Upstream-Total-Time"

    };

}
