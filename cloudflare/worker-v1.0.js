const WORKER_VERSION = "1.0.0";

// =====================================================
// xPressIn CHECK-IN CONFIGURATION
// =====================================================

const CHECKIN_COUNTER = "Counter 1";

// false = development/testing: no PIN required
// true  = event day: PIN required
const REQUIRE_COUNTER_PIN = false;

// Keep the actual PIN only in the Worker.
// Do NOT put this PIN in scanner.js.
const CHECKIN_PIN = "1234";


export default {

    async fetch(request) {

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
    // PIN DISABLED
    // =================================================

    if (!REQUIRE_COUNTER_PIN) {

        return new Response(
            JSON.stringify({
                success: true,
                authorized: true,
                counter: CHECKIN_COUNTER,
                pinRequired: false
            }),
            {
                status: 200,
                headers: {
                    ...corsHeaders(),
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store, no-cache",
                    "X-Worker-Version": WORKER_VERSION
                }
            }
        );
    }


    // =================================================
    // PIN ENABLED
    // =================================================

    // No PIN supplied yet.
    //
    // Tell scanner that a PIN is required.
    // Do NOT return HTTP 403 here.

    if (!pin) {

        return new Response(
            JSON.stringify({
                success: false,
                authorized: false,
                counter: CHECKIN_COUNTER,
                pinRequired: true,
                message: "PIN required"
            }),
            {
                status: 200,
                headers: {
                    ...corsHeaders(),
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store, no-cache",
                    "X-Worker-Version": WORKER_VERSION
                }
            }
        );
    }


    // =================================================
    // VERIFY PIN
    // =================================================

    if (pin !== CHECKIN_PIN) {

        return new Response(
            JSON.stringify({
                success: false,
                authorized: false,
                counter: CHECKIN_COUNTER,
                pinRequired: true,
                message: "Invalid Check-In PIN"
            }),
            {
                status: 403,
                headers: {
                    ...corsHeaders(),
                    "Content-Type": "application/json",
                    "Cache-Control": "no-store, no-cache",
                    "X-Worker-Version": WORKER_VERSION
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
            counter: CHECKIN_COUNTER,
            pinRequired: true
        }),
        {
            status: 200,
            headers: {
                ...corsHeaders(),
                "Content-Type": "application/json",
                "Cache-Control": "no-store, no-cache",
                "X-Worker-Version": WORKER_VERSION
            }
        }
    );
}


        // =================================================
        // EXISTING APPS SCRIPT FORWARDING
        // =================================================

        const APPS_SCRIPT_URL =
            "https://script.google.com/macros/s/AKfycbx6AKGj4338vrkzFjn1wfb0uCiKKIUByF64QTnhiK-5PyAlWcCa9xpbQ1Nywf9d39r9ZA/exec";


        const target =
            `${APPS_SCRIPT_URL}?action=${encodeURIComponent(action)}` +
            `&token=${encodeURIComponent(token)}` +
            `&search=${encodeURIComponent(search)}` +
            `&counter=${encodeURIComponent(counter)}` +
            `&_=${Date.now()}-${Math.random()}`;


        try {

            let response = null;

            let body = "";

            const workerStart =
                Date.now();


            for (
                let attempt = 1;
                attempt <= 5;
                attempt++
            ) {

                const controller =
                    new AbortController();

                const timer =
                    setTimeout(
                        () => controller.abort(),
                        6000
                    );


                try {

                    response =
                        await fetch(
                            target,
                            {
                                method: "GET",
                                redirect: "follow",
                                signal: controller.signal,

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


                    body =
                        await response.text();


                }
                catch (err) {

                    clearTimeout(timer);


                    console.log(
                        `Attempt ${attempt} fetch error:`,
                        err.name,
                        err.message
                    );


                    if (attempt < 5) {

                        await new Promise(
                            r => setTimeout(r, 1000)
                        );

                        continue;

                    }


                    throw err;

                }
                finally {

                    clearTimeout(timer);

                }


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
                        target,
                        finalUrl:
                            response.url,
                        status:
                            response.status,
                        bytes:
                            body.length,
                        retry
                    })
                );


                if (!retry) {

                    break;

                }


                console.log(
                    `Attempt ${attempt}: Google returned HTML/404, retrying...`
                );


                if (attempt < 5) {

                    await new Promise(
                        r => setTimeout(r, 1000)
                    );

                }

            }


            if (!response) {

                throw new Error(
                    "No response received from Google"
                );

            }


            const totalWorkerTime =
                Date.now() - workerStart;


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
                            totalWorkerTime
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
            "X-Worker-Version, X-Worker-Time"

    };

}
