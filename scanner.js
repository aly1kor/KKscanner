const API =
"https://kkscanner-proxy.lobo-alwyn.workers.dev";

let html5QrCode;
let currentToken = "";
let scanning = false;

const homeDiv=document.getElementById("home");

const scannerArea=document.getElementById("scannerArea");

const manualArea=document.getElementById("manualArea");

const scanModeBtn=document.getElementById("scanModeBtn");

const manualModeBtn=document.getElementById("manualModeBtn");

const lookupBtn=document.getElementById("lookupBtn");

const searchText=document.getElementById("searchText");

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

async function apiSearch(search){

    const r = await fetch(

        API +
        "?action=search&search=" +
        encodeURIComponent(search)

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

confirmBtn.addEventListener("click", async function(){

    confirmBtn.disabled = true;

    setStatus("Checking In...");

    try{

        const result =
            await apiCheckin(currentToken);

        if(result.success){

            setStatus(
                "✅ Check-In Successful",
                "success"
            );

        }else{

            setStatus(
                result.message,
                "error"
            );

        }

    }

    catch(err){

        console.log(err);

        setStatus(
            "Network Error",
            "error"
        );

    }

    detailsDiv.classList.add("hidden");

    confirmBtn.disabled = false;

    currentToken = "";

    setTimeout(function(){

        startScanner();

    },1500);

});

window.addEventListener("load",function(){

    homeDiv.classList.remove("hidden");

    scannerArea.classList.add("hidden");

    manualArea.classList.add("hidden");

    setStatus("Select a check-in method");

});

scanModeBtn.onclick=async function(){

    homeDiv.classList.add("hidden");

    manualArea.classList.add("hidden");

    scannerArea.classList.remove("hidden");

    try{

        await startScanner();

    }

    catch(err){

        setStatus("Unable to access camera","error");

    }

};

manualModeBtn.onclick=function(){

    homeDiv.classList.add("hidden");

    scannerArea.classList.add("hidden");

    manualArea.classList.remove("hidden");

    searchText.focus();

};

lookupBtn.addEventListener("click", async function(){

    const text = searchText.value.trim();

    if(text===""){

        setStatus("Please enter Registration ID, Email, Name or Token","error");
        return;

    }

    setStatus("Searching...");

    try{

        const person = await apiSearch(text);

        if(!person.found){

            setStatus(person.message,"error");
            return;

        }

        currentToken = person.token;

        nameDiv.innerHTML = person.name;

        regidDiv.innerHTML =
            "Registration : " + person.regid;

        adultsDiv.innerHTML = person.adults;

        childrenDiv.innerHTML = person.children;

        bandsDiv.innerHTML = person.bands;

        detailsDiv.classList.remove("hidden");

        if(person.checked){

            confirmBtn.disabled = true;

            setStatus(
                "Already Checked In (" +
                person.checkedBy +
                ")",
                "error"
            );

        }
        else{

            confirmBtn.disabled = false;

            setStatus("Participant Found","success");

        }

    }

    catch(err){

        console.log(err);

        setStatus("Search failed","error");

    }

});

searchText.addEventListener("keypress",function(e){

    if(e.key==="Enter"){

        lookupBtn.click();

    }

});
