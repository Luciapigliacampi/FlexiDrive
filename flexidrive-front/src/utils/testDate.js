// flexidrive-front/src/utils/testDate.js
export const TEST_DATE = import.meta.env.VITE_TEST_DATE || "2026-03-06";
export const TEST_HOUR = import.meta.env.VITE_TEST_HOUR !== undefined
  ? parseInt(import.meta.env.VITE_TEST_HOUR, 10)
  : null;
export const USE_TEST_DATE = import.meta.env.VITE_USE_TEST_DATE === "true";

export function getTodayString(dateStr) {
  if (dateStr) return dateStr;
  if (USE_TEST_DATE) return TEST_DATE;
  return new Date().toISOString().split("T")[0];
}

export function getNowHour() {
  if (USE_TEST_DATE && TEST_HOUR !== null && !isNaN(TEST_HOUR)) return TEST_HOUR;
  return new Date().getHours();
}
