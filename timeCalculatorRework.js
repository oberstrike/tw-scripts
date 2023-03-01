// ==UserScript==
// @name         Time calculator.
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://*/game.php?village=*&screen=place&try=confirm
// @icon         https://www.google.com/s2/favicons?sz=64&domain=die-staemme.de
// @grant        none
// ==/UserScript==
'use strict';

//utils
function extractTime(str) {
    const [hours, minutes, seconds] = str.split(':').map(Number);
    return { hours, minutes, seconds };
}

function createStartTimeElement(timeDiff){
    const days = Math.floor(timeDiff / (1000 * 3600 * 24));
    const hours = Math.floor((timeDiff / (1000 * 3600)) % 24);
    const minutes = Math.floor((timeDiff / (1000 * 60)) % 60);
    const seconds = Math.floor((timeDiff / 1000) % 60);

    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

const guiHtml = `
<table>
  <tr>
    <td><label for="destination-time">Destination Time:</label></td>
    <input type="datetime-local" id="destination-time" name="destination-time" step="1">
  </tr>
  <tr>
    <td><label for="duration">Duration:</label></td>
    <td>
      <input type="number" id="duration-hours" name="duration-hours" min="0" max="999" step="1" value="0">h
      <input type="number" id="duration-minutes" name="duration-minutes" min="0" max="59" step="1" value="0">m
      <input type="number" id="duration-seconds" name="duration-seconds" min="0" max="59" step="1" value="0">s
    </td>
  </tr>
  <tr>
    <td></td>
    <td><button id="calculate-button">Calculate</button></td>
  </tr>
  <tr>
    <td><label for="start-time">Start Time:</label></td>
    <td><span id="start-time"></span></td>
  </tr>
</table>

`;


class TimeCalculator {
    constructor() {
        this.destinationTime = null;
        this.duration = 0;
        this.startTimeElement = document.getElementById("start-time");
        this.calculateButton = document.getElementById("calculate-button");
        this.timerIntervalId = null;

        this.initDuration();

        this.calculateButton.addEventListener("click", this.calculate.bind(this));
    }

    initDuration(){
        this.durationHoursInput = document.getElementById("duration-hours");
        this.durationMinutesInput = document.getElementById("duration-minutes");
        this.durationSecondsInput = document.getElementById("duration-seconds");

        let durationText = document.querySelector("#command-data-form table tbody tr:nth-child(4) td:nth-child(2)").textContent;
        let time = extractTime(durationText);

        this.durationHoursInput.value = time.hours;
        this.durationMinutesInput.value = time.minutes;
        this.durationSecondsInput.value = time.seconds;
    }


    calculate() {
        const destinationTimeInput = document.getElementById("destination-time");

        this.destinationTime = new Date(destinationTimeInput.value);
        this.duration =
            parseInt(this.durationHoursInput.value) * 3600 +
            parseInt(this.durationMinutesInput.value) * 60 +
            parseInt(this.durationSecondsInput.value);

        const now = new Date();
        const startTime = new Date(this.destinationTime - this.duration * 1000);

        const timeDiff = Math.abs(startTime.getTime() - now.getTime());

        this.startTimeElement.textContent = createStartTimeElement(timeDiff)

        this.startTimer(startTime);
    }




    startTimer(startTime) {
        if (this.timerIntervalId) {
            clearInterval(this.timerIntervalId);
        }

        this.timerIntervalId = setInterval(() => {
            const now = new Date().getTime();
            const timeDiff = Math.max(startTime.getTime() - now, 0);

            this.startTimeElement.textContent = createStartTimeElement(timeDiff);

            if (timeDiff <= 0) {
                clearInterval(this.timerIntervalId);
                const submitButton = document.getElementById("troop_confirm_submit");
                submitButton.click();
            }
        }, 900);
    }
}




(function () {
    "use strict";

    const contentValue = document.getElementById("content_value");
    const container = document.createElement("div");
    container.innerHTML = guiHtml.trim();
    contentValue.appendChild(container);

    const timerCalculator = new TimeCalculator();

})();

