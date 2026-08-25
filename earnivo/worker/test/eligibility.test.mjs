import assert from "node:assert/strict";
import test from "node:test";
import { detectRequestDevice, isDeviceEligible, normaliseCompatibility, resolveMemberDevice } from "../src/eligibility.js";

const request = (headers = {}) => new Request("https://worker.example/v1/tasks", { headers });
const profile = (preferredDevice = "both") => ({ preferredDevice });

test("normalises the supported device compatibility values", () => {
  assert.deepEqual(normaliseCompatibility([" MOBILE ", "desktop", "mobile"]), ["mobile", "desktop"]);
  assert.deepEqual(normaliseCompatibility(["all", "mobile"]), ["all"]);
});

test("prefers request device detection over an account preference", () => {
  const desktopRequest = request({ "Sec-CH-UA-Mobile": "?0", "User-Agent": "Mozilla/5.0" });
  assert.equal(detectRequestDevice(desktopRequest), "desktop");
  assert.equal(resolveMemberDevice(desktopRequest, profile("mobile")), "desktop");
});

test("withholds mobile-only tasks from a detected desktop request", () => {
  const task = { deviceCompatibility: ["mobile"] };
  assert.equal(isDeviceEligible(task, profile("both"), request({ "Sec-CH-UA-Mobile": "?0", "User-Agent": "Mozilla/5.0" })), false);
});

test("allows restricted tasks only when the resolved member device matches", () => {
  const task = { deviceCompatibility: ["mobile"] };
  assert.equal(isDeviceEligible(task, profile("mobile"), request()), true);
  assert.equal(isDeviceEligible(task, profile("desktop"), request()), false);
});

