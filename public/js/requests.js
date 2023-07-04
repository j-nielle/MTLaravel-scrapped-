function handleDateFilter(renderTimeout, eventData, renderData) {
    const datePicker = document.getElementById("notifs-datepicker");
    clearTimeout(renderTimeout);

    renderTimeout = setTimeout(() => {
        const selectedDate = new Date(datePicker.value);

        const filteredData = eventData ? eventData.filter((item) => {
            const eventDate = new Date(item.created_at);
            if (selectedDate.toDateString() === 'Invalid Date') {
                return true;
            }
            return eventDate.toDateString() === selectedDate.toDateString();
        }) : [];

        window.renderData(filteredData);
    }, 100);
}

function handleSSEUpdates() {
    const eventSource = new EventSource("/sse-request");
    const tbody = document.getElementById("notifs-tbody");
    const datePicker = document.getElementById("notifs-datepicker");

    let toggleStates = [];
    let previousCreatedAt = null;
    let renderTimeout = null;
    let eventData = [];
    
    function handleSSEMessage(event) {
        eventData = JSON.parse(event.data);

        if (eventData.length === 0) {
            return;
        }

        const latestCreatedAt = eventData[0].created_at;

        if (latestCreatedAt === previousCreatedAt) {
            return;
        } else {
            previousCreatedAt = latestCreatedAt;
            console.log("new event received");
        }

        clearTimeout(renderTimeout);
        renderTimeout = setTimeout(() => {
            window.renderData(eventData);
        }, 100);
    }
    
    window.renderData = function (eventData) {
        const maxRows = eventData.length;
        const newToggleStates = new Array(eventData.length).fill(true);
        toggleStates.push(...newToggleStates);

        const rowsHtml = maxRows > 0
            ? eventData
                .slice(0, maxRows)
                .map((item, index) => createRowHtml(item, index))
                .join("")
            : `<tr class="text-gray-900 border-b border-gray-300">
            <td class="px-4 py-2">Empty</td>
            <td class="px-4 py-2">Empty</td>
            <td class="px-4 py-2">Empty</td>
            <td class="px-4 py-2">Empty</td>
            </tr>`;

        tbody.innerHTML = rowsHtml;

        const toggleRows = document.querySelectorAll(".toggle-row");
        toggleRows.forEach((row, index) => {
            row.removeEventListener("click", handleToggleRowClick);
            row.addEventListener("click", () => handleToggleRowClick(index));
        });
    }

    function createRowHtml(item, index) {
        const date = new Date(item.created_at);
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date
                .toLocaleString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                })
                .toUpperCase()}`;

        const opacity = toggleStates[index] ? "1" : "0.5";
        const phoneIconClass = toggleStates[index] ? "fa-phone" : "fa-phone-slash";

        return `<tr class="text-gray-900 border-b border-indigo-300">
            <td class="px-4 py-2" style="opacity: ${opacity}">${item.Phone}</td>
            <td class="px-4 py-2" style="opacity: ${opacity}">${item.RequestType}</td>
            <td class="px-4 py-2" style="opacity: ${opacity}">${formattedDate}</td>
            <td class="px-4 py-2 text-center toggle-row" style="cursor:pointer;">
                <i class="fa-solid ${phoneIconClass}" id="toggle-notifs-phone-icon"></i>
            </td>
        </tr>`;
    }

    function handleToggleRowClick(rowIndex) {
        toggleStates[rowIndex] = !toggleStates[rowIndex];

        const row = tbody.querySelector(`tr:nth-child(${rowIndex + 1})`);
        const tds = row.getElementsByTagName("td");

        const opacityValue = toggleStates[rowIndex] ? "1" : "0.5";
        for (const td of tds) {
            td.style.opacity = opacityValue;
        }

        const phoneIcon = row.querySelector("#toggle-notifs-phone-icon");
        phoneIcon.classList.toggle("fa-phone", toggleStates[rowIndex]);
        phoneIcon.classList.toggle("fa-phone-slash", !toggleStates[rowIndex]);
    }

    let handleDateFilterListener = () => handleDateFilter(renderTimeout, eventData, window.renderData);
    eventSource.addEventListener('notifs', handleSSEMessage);

    datePicker.removeEventListener("change", handleDateFilterListener);
    datePicker.addEventListener("change", handleDateFilterListener);
}

document.addEventListener("DOMContentLoaded", handleSSEUpdates);