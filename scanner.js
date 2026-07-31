const API =
"https://kkscanner-proxy.lobo-alwyn.workers.dev";

let html5QrCode;
let currentToken = "";
let scanning = false;

const statusDiv = document.getElementById("status");
const detailsDiv = document.getElementById("details");

const nameDiv = document.getElementById("name");
const regidDiv = document.getElementById("regid");

const adultsDiv = document.getElementById("adults");
const childrenDiv = document.getElementById("children");
const bandsDiv = document.getElementById("bandsCount");

const confirmBtn = document.getElementById("confirmBtn");

function setStatus(text, cls = "") {

    statusDiv.className = "status " + cls;
    statusDiv.innerHTML = text;

}

async function apiLookup(token){

    const r = await fetch(

        API +
        "?action=lookup&token=" +
        encodeURIComponent(token)

    );

    return await r.json();

}

async function apiCheckin(token){

    const r = await fetch(

        API +
        "?action=checkin&token=" +
        encodeURIComponent(token) +
        "&counter=Counter 1"

    );

    return await r.json();

}

async function startScanner(){

    if(scanning) return;

    scanning = true;

    html5QrCode = new Html5Qrcode("reader");

    const cameras =
        await Html5Qrcode.getCameras();

    let cameraId = cameras[0].id;

    for(const cam of cameras){

        const n = cam.label.toLowerCase();

        if(
            n.includes("back") ||
            n.includes("rear") ||
            n.includes("environment")
        ){

            cameraId = cam.id;

        }

    }

    await html5QrCode.start(

        cameraId,

        {

            fps:10,

            qrbox:{
                width:250,
                height:250
            }

        },

        onScan,

        function(){}

    );

    setStatus("Point camera at QR Code");

}

async function stopScanner(){

    if(!scanning) return;

    scanning = false;

    try{

        await html5QrCode.stop();

    }catch(e){}

}
