// Central API base URL — uses Vite env variable for production, falls back to localhost for dev
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const API_AUTH = `${BASE}/api/auth`;
export const API_ADMIN = `${BASE}/api/admin`;
export const API_EVENTS = `${BASE}/api/events`;
export const API_REGISTRATIONS = `${BASE}/api/registrations`;
export const API_PREFERENCES = `${BASE}/api/preferences`;
export const API_FEEDBACK = `${BASE}/api/feedback`;
export const API_DISCUSSIONS = `${BASE}/api/discussions`;
export const API_TEAMS = `${BASE}/api/teams`;

export default BASE;
