// Saved tasks are stored by date.
// Example:
// productivityData["2026-10-01"] = {
//     tasks: [
//         {
//             id: 1,
//             name: "Java DSA",
//             targetMinutes: 120,
//             completedMinutes: 90
//         }
//     ]
// };

let productivityData = {};
let selectedDate = "";

let timerState = {
    taskId: null,
    interval: null,
    startedAt: null
};


// ======================================================
// HELPERS
// ======================================================

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


function getTasks(dateString) {

    if (!productivityData[dateString]) {
        productivityData[dateString] = {
            tasks: []
        };
    }

    if (!Array.isArray(productivityData[dateString].tasks)) {
        productivityData[dateString].tasks = [];
    }

    return productivityData[dateString].tasks;
}


function formatMinutes(minutes) {

    minutes = Math.max(
        0,
        Math.round(Number(minutes) || 0)
    );

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0 && mins > 0) {
        return hours + "h " + mins + "m";
    }

    if (hours > 0) {
        return hours + "h";
    }

    return mins + "m";
}


// ======================================================
// CALCULATIONS
// ======================================================

function calculateTaskPercentage(task) {

    if (!task.targetMinutes || task.targetMinutes <= 0) {
        return 0;
    }

    return Math.min(
        100,
        Math.round(
            (task.completedMinutes / task.targetMinutes) * 100
        )
    );
}


function calculateDayStats(dateString) {

    const tasks = getTasks(dateString);

    let target = 0;
    let completed = 0;

    tasks.forEach(function(task) {

        target += Number(task.targetMinutes) || 0;

        completed += Number(task.completedMinutes) || 0;

    });

    let score = 0;

    if (target > 0) {

        score = Math.min(
            100,
            Math.round(
                (completed / target) * 100
            )
        );

    }

    return {
        target: target,
        completed: completed,
        score: score,
        taskCount: tasks.length
    };
}


// ======================================================
// HEATMAP LEVEL
// ======================================================

function getLevel(score) {

    if (score === 0) {
        return 0;
    }

    if (score <= 25) {
        return 1;
    }

    if (score <= 50) {
        return 2;
    }

    if (score <= 75) {
        return 3;
    }

    return 4;
}


// ======================================================
// LOCAL STORAGE
// ======================================================

function saveData() {

    localStorage.setItem(
        "productivityData",
        JSON.stringify(productivityData)
    );

}


function loadData() {

    const saved =
        localStorage.getItem("productivityData");

    if (!saved) {

        productivityData = {};

        return;
    }

    try {

        productivityData = JSON.parse(saved);

        migrateOldData();

    } catch (error) {

        productivityData = {};

    }

}


// ======================================================
// MIGRATE OLD DATA
// ======================================================

function migrateOldData() {

    Object.keys(productivityData).forEach(function(dateString) {

        const day = productivityData[dateString];

        if (!day) {
            return;
        }

        // Already using new task format
        if (Array.isArray(day.tasks)) {
            return;
        }

        const tasks = [];


        function addOldTask(
            name,
            targetMinutes,
            completedMinutes
        ) {

            if (
                targetMinutes > 0 ||
                completedMinutes > 0
            ) {

                tasks.push({

                    id: Date.now() + Math.random(),

                    name: name,

                    targetMinutes:
                        targetMinutes,

                    completedMinutes:
                        completedMinutes

                });

            }

        }


        // Old Study field
        addOldTask(
            "Study",
            (Number(day.study) || 0) * 60,
            (Number(day.study) || 0) * 60
        );


        // Old Coding field
        addOldTask(
            "Coding",
            (Number(day.coding) || 0) * 60,
            (Number(day.coding) || 0) * 60
        );


        // Old DSA field
        addOldTask(
            "DSA",
            (Number(day.dsa) || 0) * 30,
            (Number(day.dsa) || 0) * 30
        );


        // Old Reading field
        addOldTask(
            "Reading",
            Number(day.reading) || 0,
            Number(day.reading) || 0
        );


        // Old workout
        if (day.workout) {

            addOldTask(
                "Workout",
                60,
                60
            );

        }


        productivityData[dateString] = {

            tasks: tasks

        };

    });


    saveData();

}


// ======================================================
// DATE / FORM
// ======================================================

function fillForm(dateString) {

    selectedDate = dateString;

    document.getElementById("date").value =
        dateString;

    renderTasks();

    updateDaySummary();

    generateHeatmap();

}


function selectDate(dateString) {

    if (dateString > getToday()) {

        return;

    }

    fillForm(dateString);

    showInfo(dateString);

}


// ======================================================
// ADD TASK
// ======================================================

function addTask() {

    const dateString =
        document.getElementById("date").value;

    const nameInput =
        document.getElementById("taskName");

    const targetInput =
        document.getElementById("targetMinutes");


    const name =
        nameInput.value.trim();


    const targetMinutes =
        Number(targetInput.value);


    if (!dateString) {

        showMessage(
            "Please pick a date."
        );

        return;
    }


    if (!name) {

        showMessage(
            "Please enter a task name."
        );

        nameInput.focus();

        return;
    }


    if (
        !Number.isFinite(targetMinutes) ||
        targetMinutes <= 0
    ) {

        showMessage(
            "Target time must be greater than 0 minutes."
        );

        targetInput.focus();

        return;
    }


    const tasks =
        getTasks(dateString);


    tasks.push({

        id:
            Date.now() + Math.random(),

        name:
            name,

        targetMinutes:
            Math.round(targetMinutes),

        completedMinutes:
            0

    });


    saveData();


    nameInput.value = "";

    targetInput.value = "";


    renderTasks();

    updateDaySummary();

    updateDashboard();

    showInfo(dateString);


    showMessage(
        'Added "' +
        name +
        '" for ' +
        dateString +
        "."
    );

}


// ======================================================
// ADD COMPLETED TIME
// ======================================================

function addTime(taskId) {

    const dateString =
        document.getElementById("date").value;


    const tasks =
        getTasks(dateString);


    const task =
        tasks.find(function(item) {

            return item.id === taskId;

        });


    if (!task) {

        return;

    }


    const amount =
        prompt(
            'How many minutes did you spend on "' +
            task.name +
            '"?',
            "30"
        );


    if (amount === null) {

        return;

    }


    const minutes =
        Number(amount);


    if (
        !Number.isFinite(minutes) ||
        minutes <= 0
    ) {

        showMessage(
            "Please enter a valid number of minutes."
        );

        return;

    }


    task.completedMinutes +=
        Math.round(minutes);


    saveData();


    renderTasks();

    updateDaySummary();

    updateDashboard();

    showInfo(dateString);


    showMessage(

        task.name +
        ": added " +
        Math.round(minutes) +
        " minutes. Completion: " +
        calculateTaskPercentage(task) +
        "%."

    );

}


// ======================================================
// EDIT TASK
// ======================================================

function editTask(taskId) {

    const dateString =
        document.getElementById("date").value;


    const tasks =
        getTasks(dateString);


    const task =
        tasks.find(function(item) {

            return item.id === taskId;

        });


    if (!task) {

        return;

    }


    const newName =
        prompt(
            "Task name:",
            task.name
        );


    if (newName === null) {

        return;

    }


    const cleanName =
        newName.trim();


    if (!cleanName) {

        showMessage(
            "Task name cannot be empty."
        );

        return;

    }


    const newTarget =
        prompt(
            "Target time in minutes:",
            String(task.targetMinutes)
        );


    if (newTarget === null) {

        return;

    }


    const targetMinutes =
        Number(newTarget);


    if (
        !Number.isFinite(targetMinutes) ||
        targetMinutes <= 0
    ) {

        showMessage(
            "Target time must be greater than 0 minutes."
        );

        return;

    }


    task.name =
        cleanName;


    task.targetMinutes =
        Math.round(targetMinutes);


    saveData();


    renderTasks();

    updateDaySummary();

    updateDashboard();

    showInfo(dateString);


    showMessage(
        "Task updated."
    );

}


// ======================================================
// DELETE TASK
// ======================================================

function deleteTask(taskId) {

    const dateString =
        document.getElementById("date").value;


    const tasks =
        getTasks(dateString);


    const task =
        tasks.find(function(item) {

            return item.id === taskId;

        });


    if (!task) {

        return;

    }


    if (
        !confirm(
            'Delete "' +
            task.name +
            '"?'
        )
    ) {

        return;

    }


    if (
        timerState.taskId === taskId
    ) {

        stopTimer();

    }


    productivityData[dateString].tasks =
        tasks.filter(function(item) {

            return item.id !== taskId;

        });


    if (
        productivityData[dateString]
            .tasks.length === 0
    ) {

        delete productivityData[dateString];

    }


    saveData();


    renderTasks();

    updateDaySummary();

    updateDashboard();

    showInfo(dateString);


    showMessage(
        "Task deleted."
    );

}


// ======================================================
// TIMER
// ======================================================

function startTimer(taskId) {

    if (
        timerState.taskId !== null
    ) {

        showMessage(
            "Stop the current timer before starting another task."
        );

        return;

    }


    timerState.taskId =
        taskId;


    timerState.startedAt =
        Date.now();


    timerState.interval =
        setInterval(function() {

            renderTasks();

        }, 1000);


    renderTasks();


    showMessage(
        "Timer started."
    );

}


function stopTimer() {

    if (
        timerState.taskId === null
    ) {

        return;

    }


    const taskId =
        timerState.taskId;


    const elapsedMinutes =
        (
            Date.now() -
            timerState.startedAt
        ) / 60000;


    const dateString =
        document.getElementById("date").value;


    const tasks =
        getTasks(dateString);


    const task =
        tasks.find(function(item) {

            return item.id === taskId;

        });


    if (task) {

        task.completedMinutes +=
            Math.max(
                0,
                Math.round(elapsedMinutes)
            );

    }


    clearInterval(
        timerState.interval
    );


    timerState.taskId =
        null;


    timerState.interval =
        null;


    timerState.startedAt =
        null;


    saveData();


    renderTasks();

    updateDaySummary();

    updateDashboard();

    showInfo(dateString);


    if (task) {

        showMessage(

            task.name +
            " timer stopped. Completion: " +
            calculateTaskPercentage(task) +
            "%."

        );

    }

}


function getRunningSeconds(taskId) {

    if (
        timerState.taskId !== taskId ||
        !timerState.startedAt
    ) {

        return 0;

    }


    return Math.floor(

        (
            Date.now() -
            timerState.startedAt
        ) / 1000

    );

}


function formatTimer(seconds) {

    const hours =
        Math.floor(
            seconds / 3600
        );


    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );


    const secs =
        seconds % 60;


    return (

        String(hours).padStart(2, "0") +
        ":" +
        String(minutes).padStart(2, "0") +
        ":" +
        String(secs).padStart(2, "0")

    );

}


// ======================================================
// DISPLAY TASKS
// ======================================================

function renderTasks() {

    const dateString =
        document.getElementById("date").value;


    const list =
        document.getElementById("tasksList");


    const tasks =
        getTasks(dateString);


    list.innerHTML = "";


    document.getElementById(
        "tasksTitle"
    ).textContent =
        "Tasks for " + dateString;


    if (tasks.length === 0) {

        list.innerHTML =
            '<div class="no-tasks">' +
            'No tasks added for this day yet. ' +
            'Add your first task above.' +
            '</div>';

        return;

    }


    tasks.forEach(function(task) {

        const percent =
            calculateTaskPercentage(task);


        const runningSeconds =
            getRunningSeconds(task.id);


        const card =
            document.createElement("div");


        card.className =
            "task-card";


        // ---------------------------
        // TOP
        // ---------------------------

        const top =
            document.createElement("div");


        top.className =
            "task-top";


        const name =
            document.createElement("div");


        name.className =
            "task-name";


        name.textContent =
            task.name;


        const percentage =
            document.createElement("div");


        percentage.className =
            "task-percent";


        percentage.textContent =
            percent + "%";


        top.appendChild(name);

        top.appendChild(percentage);


        // ---------------------------
        // TIME
        // ---------------------------

        const times =
            document.createElement("div");


        times.className =
            "task-times";


        times.textContent =

            "Completed: " +
            formatMinutes(
                task.completedMinutes
            ) +

            " / Target: " +

            formatMinutes(
                task.targetMinutes
            );


        // ---------------------------
        // PROGRESS BAR
        // ---------------------------

        const progressTrack =
            document.createElement("div");


        progressTrack.className =
            "progress-track";


        const progressBar =
            document.createElement("div");


        progressBar.className =
            "progress-bar";


        progressBar.style.width =
            percent + "%";


        progressTrack.appendChild(
            progressBar
        );


        // ---------------------------
        // BUTTONS
        // ---------------------------

        const buttons =
            document.createElement("div");


        buttons.className =
            "task-buttons";


        const timerButton =
            document.createElement("button");


        if (
            timerState.taskId ===
            task.id
        ) {

            timerButton.textContent =
                "Stop timer";


            timerButton.onclick =
                stopTimer;

        } else {

            timerButton.textContent =
                "Start timer";


            timerButton.onclick =
                function() {

                    startTimer(
                        task.id
                    );

                };

        }


        const addButton =
            document.createElement("button");


        addButton.textContent =
            "Add time";


        addButton.onclick =
            function() {

                addTime(
                    task.id
                );

            };


        const editButton =
            document.createElement("button");


        editButton.textContent =
            "Edit";


        editButton.className =
            "secondary";


        editButton.onclick =
            function() {

                editTask(
                    task.id
                );

            };


        const deleteButton =
            document.createElement("button");


        deleteButton.textContent =
            "Delete";


        deleteButton.className =
            "danger";


        deleteButton.onclick =
            function() {

                deleteTask(
                    task.id
                );

            };


        buttons.appendChild(
            timerButton
        );


        buttons.appendChild(
            addButton
        );


        buttons.appendChild(
            editButton
        );


        buttons.appendChild(
            deleteButton
        );


        // ---------------------------
        // RUNNING TIMER
        // ---------------------------

        card.appendChild(top);

        card.appendChild(times);

        card.appendChild(
            progressTrack
        );

        card.appendChild(buttons);


        if (
            timerState.taskId ===
            task.id
        ) {

            const running =
                document.createElement("div");


            running.className =
                "timer-running";


            running.textContent =
                "Running: " +
                formatTimer(
                    runningSeconds
                );


            card.appendChild(
                running
            );

        }


        list.appendChild(card);

    });

}


// ======================================================
// DAY INFORMATION
// ======================================================

function showInfo(dateString) {

    const day =
        productivityData[dateString];


    const info =
        document.getElementById("info");


    if (
        !day ||
        !Array.isArray(day.tasks) ||
        day.tasks.length === 0
    ) {

        info.textContent =
            dateString +
            ": no tasks saved.";

        return;

    }


    const stats =
        calculateDayStats(
            dateString
        );


    info.textContent =

        dateString +

        " | productivity " +
        stats.score +
        "%" +

        " | " +
        stats.taskCount +
        " task" +
        (
            stats.taskCount === 1
                ? ""
                : "s"
        ) +

        " | completed " +

        formatMinutes(
            stats.completed
        ) +

        " of " +

        formatMinutes(
            stats.target
        );

}


// ======================================================
// HEATMAP
// ======================================================

function generateHeatmap() {

    const heatmap =
        document.getElementById(
            "heatmap"
        );


    heatmap.innerHTML = "";


    const today =
        new Date();


    const todayString =
        formatDate(today);


    const year =
        today.getFullYear();


    document.getElementById(
        "heatmapTitle"
    ).textContent =
        year;


    const start =
        new Date(
            year,
            0,
            1
        );


    const end =
        new Date(
            year,
            11,
            31
        );


    const offset =
        (
            start.getDay() +
            6
        ) % 7;


    for (
        let i = 0;
        i < offset;
        i++
    ) {

        const blank =
            document.createElement(
                "div"
            );


        blank.className =
            "cell empty";


        heatmap.appendChild(
            blank
        );

    }


    const selected =
        document.getElementById(
            "date"
        ).value;


    for (
        let d = new Date(start);
        d <= end;
        d.setDate(
            d.getDate() + 1
        )
    ) {

        const dateString =
            formatDate(d);


        const stats =
            calculateDayStats(
                dateString
            );


        const score =
            stats.score;


        const cell =
            document.createElement(
                "div"
            );


        cell.className =
            "cell";


        cell.dataset.level =
            getLevel(score);


        cell.title =

            dateString +
            " - " +
            score +
            "% productivity";


        if (
            dateString >
            todayString
        ) {

            cell.classList.add(
                "future"
            );

        } else {

            cell.addEventListener(
                "click",
                function() {

                    selectDate(
                        dateString
                    );

                }
            );

        }


        if (
            dateString ===
            selected
        ) {

            cell.classList.add(
                "selected"
            );

        }


        heatmap.appendChild(
            cell
        );

    }

}


// ======================================================
// STREAKS
// ======================================================

function hasActivity(dateString) {

    return (
        calculateDayStats(
            dateString
        ).score > 0
    );

}


function calculateStreaks() {

    let current = 0;

    let date =
        new Date();


    if (
        !hasActivity(
            formatDate(date)
        )
    ) {

        date.setDate(
            date.getDate() - 1
        );

    }


    while (
        hasActivity(
            formatDate(date)
        )
    ) {

        current++;

        date.setDate(
            date.getDate() - 1
        );

    }


    const dates =
        Object.keys(
            productivityData
        )
        .filter(
            hasActivity
        )
        .sort();


    let best = 0;

    let run = 0;

    let previous = null;


    dates.forEach(
        function(dateString) {

            if (previous) {

                const next =
                    new Date(
                        previous
                    );


                next.setDate(
                    next.getDate() + 1
                );


                run =
                    formatDate(next) ===
                    dateString
                        ? run + 1
                        : 1;

            } else {

                run = 1;

            }


            if (run > best) {

                best = run;

            }


            previous =
                new Date(
                    dateString +
                    "T00:00:00"
                );

        }
    );


    document.getElementById(
        "streak"
    ).textContent =
        current + " days";


    document.getElementById(
        "bestStreak"
    ).textContent =
        best + " days";

}


// ======================================================
// DASHBOARD
// ======================================================

function updateDashboard() {

    let targetTotal = 0;

    let completedTotal = 0;

    let taskTotal = 0;

    let scoreTotal = 0;

    let days = 0;


    Object.keys(
        productivityData
    ).forEach(
        function(dateString) {

            const stats =
                calculateDayStats(
                    dateString
                );


            if (
                stats.taskCount > 0
            ) {

                targetTotal +=
                    stats.target;


                completedTotal +=
                    stats.completed;


                taskTotal +=
                    stats.taskCount;


                scoreTotal +=
                    stats.score;


                days++;

            }

        }
    );


    const average =
        days > 0
            ? Math.round(
                scoreTotal / days
            )
            : 0;


    document.getElementById(
        "targetTotal"
    ).textContent =
        formatMinutes(
            targetTotal
        );


    document.getElementById(
        "completedTotal"
    ).textContent =
        formatMinutes(
            completedTotal
        );


    document.getElementById(
        "taskTotal"
    ).textContent =
        taskTotal;


    document.getElementById(
        "avgScore"
    ).textContent =
        average + "%";


    calculateStreaks();

    generateHeatmap();

}


// ======================================================
// SELECTED DAY SUMMARY
// ======================================================

function updateDaySummary() {

    const dateString =
        document.getElementById(
            "date"
        ).value;


    const stats =
        calculateDayStats(
            dateString
        );


    document.getElementById(
        "dayTarget"
    ).textContent =
        formatMinutes(
            stats.target
        );


    document.getElementById(
        "dayCompleted"
    ).textContent =
        formatMinutes(
            stats.completed
        );


    document.getElementById(
        "dayScore"
    ).textContent =
        stats.score + "%";

}


// ======================================================
// DELETE WHOLE DAY
// ======================================================

function deleteDay() {

    const dateString =
        document.getElementById(
            "date"
        ).value;


    if (
        !productivityData[
            dateString
        ]
    ) {

        showMessage(
            "Nothing saved for that date."
        );

        return;

    }


    if (
        timerState.taskId !== null
    ) {

        stopTimer();

    }


    if (
        !confirm(
            "Delete all tasks for " +
            dateString +
            "?"
        )
    ) {

        return;

    }


    delete productivityData[
        dateString
    ];


    saveData();


    renderTasks();

    updateDaySummary();

    updateDashboard();

    showInfo(
        dateString
    );


    showMessage(
        "Deleted " +
        dateString +
        "."
    );

}


// ======================================================
// RESET EVERYTHING
// ======================================================

function resetAll() {

    if (
        !confirm(
            "Delete all saved data? This cannot be undone."
        )
    ) {

        return;

    }


    if (
        timerState.taskId !== null
    ) {

        clearInterval(
            timerState.interval
        );

    }


    timerState = {

        taskId: null,

        interval: null,

        startedAt: null

    };


    productivityData = {};


    saveData();


    fillForm(
        getToday()
    );


    updateDashboard();


    showMessage(
        "All data deleted."
    );

}


// ======================================================
// START APPLICATION
// ======================================================

document
    .getElementById("addTaskBtn")
    .addEventListener(
        "click",
        addTask
    );


document
    .getElementById("deleteBtn")
    .addEventListener(
        "click",
        deleteDay
    );


document
    .getElementById("resetBtn")
    .addEventListener(
        "click",
        resetAll
    );


document
    .getElementById("date")
    .addEventListener(
        "change",
        function() {

            selectDate(
                this.value
            );

        }
    );


document
    .getElementById("taskName")
    .addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter"
            ) {

                addTask();

            }

        }
    );


document
    .getElementById("targetMinutes")
    .addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter"
            ) {

                addTask();

            }

        }
    );


// ======================================================
// LOAD
// ======================================================

loadData();


const initialDate =
    getToday();


fillForm(
    initialDate
);


updateDashboard();


showInfo(
    initialDate
);
