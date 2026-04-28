import { WheelOfFortune } from './wheel.js';
import { getWeights, getPickCounts, recordWin } from './pity.js';

let wheel;

function updateStats() {
    const tbody = document.getElementById('stats-body');
    if (!tbody) return;

    const weights = getWeights(wheel.names);
    const picks = getPickCounts(wheel.names);
    const totalWeight = weights.reduce((s, w) => s + w, 0);

    tbody.innerHTML = wheel.names.map((name, i) => {
        const pct = ((weights[i] / totalWeight) * 100).toFixed(1);
        return `<tr>
            <td>${name}</td>
            <td>${picks[i]}</td>
            <td>${weights[i]}</td>
            <td>${pct}%</td>
        </tr>`;
    }).join('');
}

function refreshWeights() {
    wheel.setWeights(getWeights(wheel.names));
    wheel.drawWheel();
    updateStats();
}

document.addEventListener('DOMContentLoaded', async () => {
    wheel = new WheelOfFortune('wheel');
    await wheel.loadConfig();

    // Initialize weights from pity data
    refreshWeights();

    // Wire up spin
    const canvas = document.getElementById('wheel');
    canvas.style.cursor = 'pointer';
    canvas.addEventListener('click', () => wheel.spin());

    // Handle win: update pity data + refresh
    wheel.onWin = (winner) => {
        recordWin(winner, wheel.names);
        refreshWeights();
    };

    // Stats toggle
    document.getElementById('stats-toggle').addEventListener('click', () => {
        document.getElementById('stats-panel').classList.toggle('open');
        updateStats();
    });

});
