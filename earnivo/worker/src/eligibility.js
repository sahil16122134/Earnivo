/** Device eligibility is evaluated in the Worker from the current request, with a member preference only as a conservative fallback. */
const supportedDevices = new Set(["mobile", "desktop", "tablet", "all"]);

export function normaliseDevice(value) {
  const device = String(value || "").trim().toLowerCase();
  return supportedDevices.has(device) ? device : "";
}

export function normaliseCompatibility(values) {
  const devices = [...new Set((Array.isArray(values) ? values : []).map(normaliseDevice).filter(Boolean))];
  return devices.includes("all") ? ["all"] : devices;
}

export function detectRequestDevice(request) {
  const userAgent = String(request.headers.get("User-Agent") || "").toLowerCase();
  if (/ipad|tablet|kindle|silk\/|playbook/.test(userAgent) || (/android/.test(userAgent) && !/mobile/.test(userAgent))) return "tablet";
  if (/iphone|ipod|mobile|iemobile|opera mini|android/.test(userAgent)) return "mobile";
  const clientHint = String(request.headers.get("Sec-CH-UA-Mobile") || "").trim();
  if (clientHint === "?1") return "mobile";
  if (clientHint === "?0") return "desktop";
  return userAgent ? "desktop" : null;
}

export function resolveMemberDevice(request, profile = {}) {
  const detectedDevice = detectRequestDevice(request);
  if (detectedDevice) return detectedDevice;
  const preferredDevice = String(profile.preferredDevice || "").trim().toLowerCase();
  return ["mobile", "desktop", "tablet"].includes(preferredDevice) ? preferredDevice : null;
}

export function isDeviceEligible(task, profile, request) {
  const allowedDevices = normaliseCompatibility(task.deviceCompatibility);
  if (!allowedDevices.length || allowedDevices.includes("all")) return true;
  const memberDevice = resolveMemberDevice(request, profile);
  return Boolean(memberDevice && allowedDevices.includes(memberDevice));
}
