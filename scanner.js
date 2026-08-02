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
async function onScan(decodedText){

    await stopScanner();

    currentToken = decodedText;

    setStatus("Looking up registration...");

    try{

        const person = await apiLookup(decodedText);

        if(!person.found){

            setStatus("❌ Invalid QR Code","error");

            setTimeout(function(){

                startScanner();

            },2000);

            return;

        }

        if(person.checked){

            setStatus("⚠ Already Checked In","error");

            detailsDiv.classList.add("hidden");

            setTimeout(function(){

                startScanner();

            },2500);

            return;

        }

        nameDiv.innerHTML = person.name;

        regidDiv.innerHTML =
            "Registration : " + person.regid;

        adultsDiv.innerHTML = person.adults;

        childrenDiv.innerHTML = person.children;

        bandsDiv.innerHTML = person.bands;

        detailsDiv.classList.remove("hidden");

        setStatus("Registration Found","success");

    }

    catch(err){

        console.log(err);

        setStatus("Connection Error","error");

        setTimeout(function(){

            startScanner();

        },2000);

    }

}
confirmBtn.addEventListener("click", async function () { 
    if (!currentToken) return; confirmBtn.disabled = true;
    setStatus("Checking in..."); 
    
    try { 
        const result = await apiCheckin(currentToken);
        if (result.success) { setStatus( "Check-In Successful", "success" );
                            }
        else { 
            setStatus( result.message, "error" ); 
            confirmBtn.disabled = false; 
        } }
    
 catch (err) {

    console.error(err);

    setStatus("Verifying check-in...");

    try {

        const person = await apiLookup(currentToken);

        if (person.found && person.checked) {

            setStatus(
                "Check-In Successful",
                "success"
            );

            confirmBtn.disabled = true;

            return;

        }

    }
    catch (e) {

        console.error(e);

    }

    setStatus(
        "Check-In Failed",
        "error"
    );

    confirmBtn.disabled = false;

}
});

window.addEventListener("load", async function(){

    try{

        await startScanner();

    }

    catch(err){

        console.log(err);

        setStatus(
            "Unable to access camera",
            "error"
        );

    }

});


// -----------------------------------------------------
// Home Screen Buttons
// -----------------------------------------------------

scanModeBtn.addEventListener("click", async function () {

    homeDiv.classList.add("hidden");

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

    scannerArea.classList.add("hidden");

    manualArea.classList.remove("hidden");

    detailsDiv.classList.add("hidden");

    searchText.value = "";

    searchText.focus();

    setStatus(
        "Enter Registration ID, Email, Name or Token"
    );

});


