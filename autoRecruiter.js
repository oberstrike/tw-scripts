// ==UserScript==
// @name         Auto Recruiter
// @version      0.1.2
// @description  Adds buildings to queue automatically
// @author       oberstrike
// @match        https://*/game.php?village=*&screen=barrack*
// @match        https://*/game.php?village=*&screen=stable*
// @match        https://*/game.php?village=*&screen=garage*
// @match        https://*/game.php?village=*&screen=recruit*
// @grant        none
// @namespace https://greasyfork.org/users/151096
// ==/UserScript==
'use strict';

function getScreenParam(url) {
    const urlParams = new URLSearchParams(new URL(url).search);
    return urlParams.get("screen");
}

function removeExtraSpaces(str) {
    return str.replace(/\s+/g, " ").trim();
}

function getUnitsInQueue(unitName) {
    let count = 0;
    const rows = document.querySelectorAll('.trainqueue_wrap tr');
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.querySelector('.unit_sprite') && row.querySelector('.unit_sprite').classList.contains(unitName)) {
            const unitCell = row.querySelector('td:nth-child(1)');
            const unitText = unitCell.textContent.trim().split(' ')[0];
            count += parseInt(unitText);
        }
    }
    return count;
}


class Unit {

    constructor(unitName) {
        this.unitName = unitName
        this.inputHtml = this.createInput();
    }

    createInput() {
        return removeExtraSpaces(`  
            <tr>
                <td><label for="${this.unitName}Count">${this.unitName}:</label></td>
                <td><input type="number" id="${this.unitName}Count" value="0"></td>
                <td><label for="${this.unitName}Max">Maximum:</label></td>
                <td><input type="number" id="${this.unitName}Max" value="0"></td>
                <td><span>Total units:</span> <span id="${this.unitName}Total"></span></td>
            </tr>
                `.trim())
    }


}


class AutoRecruiter {

    constructor() {
        this.units = this.createUnits();
        if (this.units.length > 0) {
            this.guiHtml = this.createGuiHtml();

            this.running = false;
            this.intervalId = null;

            this.initHtml();
            this.initListeners();
        }
    }

    initListeners() {
        this.trainButton = document.getElementById("trainButton");
        this.stopButton = document.getElementById("stopButton");
        this.intervalHoursInput = document.getElementById("intervalHours");
        this.intervalMinutesInput = document.getElementById("intervalMinutes");
        this.intervalSecondsInput = document.getElementById("intervalSeconds");
        this.nextDate = document.getElementById("nextDate");

        this.trainButton.addEventListener('click', this.startTraining.bind(this));
        this.stopButton.addEventListener('click', this.stopTraining.bind(this));
    }

    getTotal(unitName) {
        const unitRow = document.querySelector(`a[data-unit="${unitName}"]`).closest('tr');
        const totalCell = unitRow.querySelector('td:nth-of-type(3)');
        return parseInt(totalCell.textContent.split("/")[1]);
    }


    startTraining = () => {
        console.log('Start training');
        this.stopButton.disabled = false;
        this.trainButton.disabled = true;

        const totalMilliseconds = (
            (parseInt(this.intervalHoursInput.value) * 60 * 60)
            + (parseInt(this.intervalMinutesInput.value) * 60)
            + parseInt(this.intervalSecondsInput.value)
        ) * 1000;

        this.running = true;

        const nextTrainTime = new Date(Date.now() + totalMilliseconds);
        this.nextDate.textContent = `Next train is planned at ${nextTrainTime.toLocaleTimeString()}`;


        this.intervalId = setInterval(() => {


            let isOneValueSet = false;

            for (const unit of this.units) {
                const unitName = unit.unitName;
                const outputElement = document.getElementById(`${unitName}_0`);
                const inputElement = document.getElementById(`${unitName}Count`);
                const totalCount = this.getTotal(unitName) + getUnitsInQueue(unitName);
                const totalInput = parseInt(document.getElementById(`${unitName}Max`).value);
                let inputCount = parseInt(inputElement.value);

                if (totalInput !== 0 && totalCount + inputCount > totalInput) {
                    inputCount = totalInput - totalCount;
                    console.log(`The inputCount was adjusted it is now: ${inputCount}`);
                }

                if (inputCount > 0) {
                    const unitPossibleToTrainCount = parseInt(
                        document.getElementById(`${unitName}_0_a`).textContent.replace(/[()]/g, '')
                    );

                    if (inputCount > unitPossibleToTrainCount) {
                        console.error(`Could not train ${unitName} - ${inputCount} is too large max is: ${unitPossibleToTrainCount}`);
                    } else {
                        isOneValueSet = true;
                        outputElement.value = inputCount;
                    }
                }
            }

            if (isOneValueSet) {
                document.getElementsByClassName('btn btn-recruit')[0].click();
            }
            const nextTrainTime = new Date(Date.now() + totalMilliseconds);
            this.nextDate.textContent = `Next train is planned at ${nextTrainTime.toLocaleTimeString()}`;
        }, totalMilliseconds); // interval set to 1 second

    }

    stopTraining = () => {
        console.log('Stop training')
        if (!this.running) {
            return;
        }

        this.stopButton.disabled = true;
        this.trainButton.disabled = false;

        clearInterval(this.intervalId);
        this.running = false;
        this.intervalId = null;

    }

    initHtml() {
        const putEleBefore = document.getElementById("content_value");
        const newDiv = document.createElement("div");
        newDiv.innerHTML = this.guiHtml.trim();
        putEleBefore.parentElement.parentElement.insertBefore(newDiv, putEleBefore.parentElement);
        for (let i = 0; i < this.units.length; i++) {
            let unit = this.units[i];
            let unitName = unit.unitName;
            const totalElement = document.getElementById(`${unitName}Total`);
            let unitsInQueue = getUnitsInQueue(unitName);
            let total = this.getTotal(unitName);
            totalElement.textContent = `${unitsInQueue + total} (In queue: ${unitsInQueue})`;
        }

    }

    createGuiHtml() {
        let unitsHtml = "<tr><td><h4>Units:</h4></td></tr>"
        for (let i = 0; i < this.units.length; i++) {
            const unit = this.units[i];
            unitsHtml += unit.inputHtml;
        }

        return removeExtraSpaces(`<table>
        ${unitsHtml}
        ${this.intervalHtml}
                </table>`)
    }

    createUnits() {
        const unitInputs = document.getElementsByClassName("recruit_unit");
        const units = [];

        for (let i = 0; i < unitInputs.length; i++) {
            const unitInput = unitInputs[i]
            const unitName = this.extractUnitName(unitInput.name)
            const unit = new Unit(unitName)
            units.push(unit)
        }

        return units;
    }


    //Utils
    extractUnitName(str) {
        return str.split("_")[0];
    }

    intervalHtml = `<tr>
 <td><h4>Interval:</h4></td>
</tr>

  <tr>
    <td><label for="intervalHours">Hours:</label></td>
    <td><input type="number" id="intervalHours" value="0"></td>
  </tr>
  <tr>
    <td><label for="intervalMinutes">Minutes:</label></td>
    <td><input type="number" id="intervalMinutes" value="0"></td>
  </tr>
  <tr>
    <td><label for="intervalSeconds">Seconds:</label></td>
    <td><input type="number" id="intervalSeconds" value="10"></td>
  </tr>
  <tr>
    <td colspan="2">
      <button id="trainButton">Train</button>
      <button id="stopButton" disabled>Stop</button>
    </td>
  </tr>
  <tr>
    <td>
        <span>Next at </span> <span id="nextDate"></span>
    </td>
</tr>
`
}



(function () {
    "use strict";

    const autoRecruiter = new AutoRecruiter();

})();