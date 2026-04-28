const STORAGE_KEY = 'daily_picker_pity';

function load() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
        return {};
    }
}

function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/**
 * Returns an array of weights (one per name, same order).
 * New members start at weight 1.
 */
export function getWeights(names) {
    const data = load();
    return names.map(name => data[name]?.weight ?? 1);
}

/**
 * Returns an array of total pick counts (one per name, same order).
 */
export function getPickCounts(names) {
    const data = load();
    return names.map(name => data[name]?.picks ?? 0);
}

/**
 * Records a win: winner resets to weight 1 and gains a pick count,
 * everyone else gains +1 weight (pity increment).
 */
export function recordWin(winner, names) {
    const data = load();

    for (const name of names) {
        if (!data[name]) {
            data[name] = { weight: 1, picks: 0 };
        }

        if (name === winner) {
            data[name].weight = 1;
            data[name].picks += 1;
        } else {
            data[name].weight += 1;
        }
    }

    save(data);
}

/**
 * Clears all pity data.
 */
export function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
}
