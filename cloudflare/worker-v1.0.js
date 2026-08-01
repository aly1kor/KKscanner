export default {
  async fetch(request) {

    // Handle browser CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    const url = new URL(request.url);

    const action = url.searchParams.get("action") || "";
    const token = url.searchParams.get("token") || "";
    const counter = url.searchParams.get("counter") || "";

    const APPS_SCRIPT_URL =
      "https://script.google.com/macros/s/AKfycby_K9favyDA0jelnRh0Uk98bD4m0gxDPwQ4IL0n7IuR9q5peUFDHCzAouKsmJp8A_qBkA/exec";

    const target =
      `${APPS_SCRIPT_URL}?action=${encodeURIComponent(action)}&token=${encodeURIComponent(token)}&counter=${encodeURIComponent(counter)}`;

    try {

      const response = await fetch(target, {
        method: "GET",
        redirect: "follow"
      });

      const body = await response.text();

      return new Response(body, {
        status: response.status,
        headers: {
          ...corsHeaders(),
          "Content-Type": "application/json"
        }
      });

    } catch (err) {

      return new Response(JSON.stringify({
        success: false,
        message: err.toString()
      }), {
        status: 500,
        headers: {
          ...corsHeaders(),
          "Content-Type": "application/json"
        }
      });

    }

  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "*"
  };
}
