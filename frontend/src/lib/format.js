export function formatKD(value, currency = "KD") {
    const n = Number(value || 0);
    return `${currency} ${n.toFixed(3)}`;
}
