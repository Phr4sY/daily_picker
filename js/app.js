import { WheelOfFortune } from './wheel.js';
import { getWeights, getPickCounts, recordWin, getActiveStates, toggleActive } from './pity.js';

let wheel;
let allNames = [];

function getActiveNames() {
    const states = getActiveStates(allNames);
    return allNames.filter((_, i) => states[i]);
}

function updateStats() {
    const tbody = document.getElementById('stats-body');
    if (!tbody) return;

    const weights = getWeights(allNames);
    const picks = getPickCounts(allNames);
    const states = getActiveStates(allNames);
    const activeWeights = weights.filter((_, i) => states[i]);
    const totalActiveWeight = activeWeights.reduce((s, w) => s + w, 0);

    tbody.innerHTML = allNames.map((name, i) => {
        const active = states[i];
        const pct = active ? ((weights[i] / totalActiveWeight) * 100).toFixed(1) + '%' : '-';
        return `<tr class="${active ? '' : 'stats-row-disabled'}">
            <td>${name}</td>
            <td>${picks[i]}</td>
            <td>${pct}</td>
            <td><button class="btn-toggle-active ${active ? 'is-active' : 'is-inactive'}" data-name="${name}">${active ? 'On' : 'Off'}</button></td>
        </tr>`;
    }).join('');

    tbody.querySelectorAll('.btn-toggle-active').forEach(btn => {
        btn.addEventListener('click', () => {
            toggleActive(btn.dataset.name);
            refreshWheel();
        });
    });
}

function refreshWheel() {
    const activeNames = getActiveNames();
    wheel.setMembers(activeNames, getWeights(activeNames));
    wheel.drawWheel();
    updateStats();
}

document.addEventListener('DOMContentLoaded', async () => {
    wheel = new WheelOfFortune('wheel');
    await wheel.loadConfig();
    allNames = [...wheel.names];

    // Initialize with active members only
    refreshWheel();

    // Wire up spin
    const canvas = document.getElementById('wheel');
    canvas.style.cursor = 'pointer';
    canvas.addEventListener('click', () => wheel.spin());

    // Handle win: update pity data + refresh (pass allNames so disabled members are untouched)
    wheel.onWin = (winner) => {
        recordWin(winner, allNames);
        refreshWheel();
    };

    // Stats toggle
    document.getElementById('stats-toggle').addEventListener('click', () => {
        document.getElementById('stats-panel').classList.toggle('open');
        updateStats();
    });

});
