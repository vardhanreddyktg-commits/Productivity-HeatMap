// All saved days live in this object, keyed by date: "2026-09-28"
let productivityData = {};

// ---------- helpers ----------

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
}

function getToday() {
    return formatDate(new Date());
}

function showMessage(text) {
    document.getElementById("message").textContent = text;
}

// ---------- score ----------

function calculateScore(study, coding, dsa, reading, workout) {
    let score = 0;

    score += Math.min(study * 10, 30);     // max 30
    score += Math.min(coding * 10, 30);    // max 30
    score += Math.min(dsa * 5, 20);        // max 20
    score += Math.min(reading / 10, 10);   // max 10
    if (workout) {
        score += 10;                       // max 10
    }

    return Math.round(score);
}

function getLevel(score) {
    if (score === 0) return 0;
    if (score <= 25) return 1;
    if (score <= 50) return 2;
    if (score <= 75) return 3;
    return 4;
}

// ---------- local storage ----------

function saveData() {
    localStorage.setItem("productivityData", JSON.stringify(productivityData));
}

function loadData() {
    const saved = localStorage.getItem("productivityData");
    if (saved) {
        try {
            productivityData = JSON.parse(saved);
        } catch (e) {
            productivityData = {};
        }
    }
}

// ---------- form ----------

function fillForm(dateString) {
    const day = productivityData[dateString];

    document.getElementById("date").value = dateString;
    document.getElementById("study").value = day ? day.study : "";
    document.getElementById("coding").value = day ? day.coding : "";
    document.getElementById("dsa").value = day ? day.dsa : "";
    document.getElementById("reading").value = day ? day.reading : "";
    document.getElementById("workout").checked = day ? day.workout : false;
}

function saveActivity() {
    const dateString = document.getElementById("date").value;

    if (!dateString) {
        showMessage("Please pick a date.");
        return;
    }

    const study = Number(document.getElementById("study").value) || 0;
    const coding = Number(document.getElementById("coding").value) || 0;
    const dsa = Number(document.getElementById("dsa").value) || 0;
    const reading = Number(document.getElementById("reading").value) || 0;
    const workout = document.getElementById("workout").checked;

    if (study < 0 || coding < 0 || dsa < 0 || reading < 0) {
        showMessage("Values cannot be negative.");
        return;
    }

    const score = calculateScore(study, coding, dsa, reading, workout);

    productivityData[dateString] = {
        study: study,
        coding: coding,
        dsa: dsa,
        reading: reading,
        workout: workout,
        score: score
    };

    saveData();
    updateDashboard();
    showMessage("Saved " + dateString + " (score " + score + "%).");
}

function deleteDay() {
    const dateString = document.getElementById("date").value;

    if (!productivityData[dateString]) {
        showMessage("Nothing saved for that date.");
        return;
    }

    delete productivityData[dateString];
    saveData();
    fillForm(dateString);
    updateDashboard();
    showMessage("Deleted " + dateString + ".");
}

function resetAll() {
    if (!confirm("Delete all saved data? This cannot be undone.")) {
        return;
    }

    productivityData = {};
    saveData();
    fillForm(getToday());
    updateDashboard();
    showMessage("All data deleted.");
}

// ---------- heatmap ----------

function showInfo(dateString) {
    const day = productivityData[dateString];
    const info = document.getElementById("info");

    if (!day) {
        info.textContent = dateString + ": nothing saved.";
        return;
    }

    info.textContent =
        dateString + " | score " + day.score + "%" +
        " | study " + day.study + "h" +
        " | coding " + day.coding + "h" +
        " | DSA " + day.dsa +
        " | reading " + day.reading + " min" +
        " | workout " + (day.workout ? "yes" : "no");
}

function generateHeatmap() {
    const heatmap = document.getElementById("heatmap");
    heatmap.innerHTML = "";

    const today = new Date();
    const start = new Date(today);
    start.setDate(today.getDate() - 364);

    // rows go Monday..Sunday, so pad the first column
    const offset = (start.getDay() + 6) % 7;
    for (let i = 0; i < offset; i++) {
        const blank = document.createElement("div");
        blank.className = "cell empty";
        heatmap.appendChild(blank);
    }

    const selected = document.getElementById("date").value;

    for (let i = 364; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const dateString = formatDate(date);
        const day = productivityData[dateString];
        const score = day ? day.score : 0;

        const cell = document.createElement("div");
        cell.className = "cell";
        cell.dataset.level = getLevel(score);
        cell.title = dateString + " - " + score + "%";

        if (dateString === selected) {
            cell.classList.add("selected");
        }

        cell.addEventListener("click", function () {
            fillForm(dateString);
            showInfo(dateString);
            generateHeatmap();
        });

        heatmap.appendChild(cell);
    }

    // show the most recent weeks first
    heatmap.scrollLeft = heatmap.scrollWidth;
}

// ---------- statistics ----------

function calculateStreaks() {
    // current streak: count back from today
    // (if today is empty, start from yesterday so the streak isn't lost mid-day)
    let current = 0;
    let date = new Date();

    if (!hasActivity(formatDate(date))) {
        date.setDate(date.getDate() - 1);
    }

    while (hasActivity(formatDate(date))) {
        current++;
        date.setDate(date.getDate() - 1);
    }

    // best streak: go through all saved dates in order
    const dates = Object.keys(productivityData)
        .filter(hasActivity)
        .sort();

    let best = 0;
    let run = 0;
    let previous = null;

    dates.forEach(function (dateString) {
        if (previous) {
            const next = new Date(previous);
            next.setDate(next.getDate() + 1);
            run = (formatDate(next) === dateString) ? run + 1 : 1;
        } else {
            run = 1;
        }
        if (run > best) best = run;
        previous = new Date(dateString + "T00:00:00");
    });

    document.getElementById("streak").textContent = current + " days";
    document.getElementById("bestStreak").textContent = best + " days";
}

function hasActivity(dateString) {
    const day = productivityData[dateString];
    return day && day.score > 0;
}

function updateDashboard() {
    let studyTotal = 0;
    let codingTotal = 0;
    let dsaTotal = 0;
    let scoreTotal = 0;
    let days = 0;

    Object.values(productivityData).forEach(function (day) {
        studyTotal += day.study;
        codingTotal += day.coding;
        dsaTotal += day.dsa;
        scoreTotal += day.score;
        days++;
    });

    const average = days > 0 ? Math.round(scoreTotal / days) : 0;

    document.getElementById("studyTotal").textContent = studyTotal + " hrs";
    document.getElementById("codingTotal").textContent = codingTotal + " hrs";
    document.getElementById("dsaTotal").textContent = dsaTotal;
    document.getElementById("avgScore").textContent = average + "%";

    calculateStreaks();
    generateHeatmap();
}

// ---------- start ----------

document.getElementById("saveBtn").addEventListener("click", saveActivity);
document.getElementById("deleteBtn").addEventListener("click", deleteDay);
document.getElementById("resetBtn").addEventListener("click", resetAll);

document.getElementById("date").addEventListener("change", function () {
    fillForm(this.value);
    generateHeatmap();
});

loadData();
fillForm(getToday());
updateDashboard();
