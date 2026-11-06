#!/usr/bin/env node
/**
 * Guards the native app config against drift. The universal-link domain is
 * declared in three places that the platforms require separately; if they
 * disagree, password-reset links silently stop opening the app.
 *   .env.native                         VITE_PUBLIC_APP_URL
 *   android/app/build.gradle            appLinkHost
 *   ios/App/App/App.entitlements        applinks:<host>
 * Also asserts the app id is identical on both platforms.
 */
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const fail = (msg) => { console.error(`native-config: ${msg}`); process.exitCode = 1; };

const env = Object.fromEntries(
  read(".env.native").split("\n").filter((l) => /^\w+=/.test(l)).map((l) => l.split(/=(.*)/s).slice(0, 2)),
);
const webHost = new URL(env.VITE_PUBLIC_APP_URL).host;
const androidHost = read("android/app/build.gradle").match(/appLinkHost:\s*"([^"]+)"/)?.[1];
const iosHosts = [...read("ios/App/App/App.entitlements").matchAll(/applinks:([^<\s]+)/g)].map((m) => m[1]);

if (androidHost !== webHost) fail(`Android appLinkHost "${androidHost}" != VITE_PUBLIC_APP_URL host "${webHost}"`);
if (iosHosts.length !== 1 || iosHosts[0] !== webHost) fail(`iOS applinks ${JSON.stringify(iosHosts)} != ["${webHost}"]`);

const capId = read("capacitor.config.ts").match(/appId:\s*"([^"]+)"/)?.[1];
const androidId = read("android/app/build.gradle").match(/applicationId\s+"([^"]+)"/)?.[1];
const iosIds = [...new Set([...read("ios/App/App.xcodeproj/project.pbxproj").matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((m) => m[1]))];
if (androidId !== capId) fail(`Android applicationId "${androidId}" != appId "${capId}"`);
if (iosIds.length !== 1 || iosIds[0] !== capId) fail(`iOS bundle ids ${JSON.stringify(iosIds)} != "${capId}"`);

if (!process.exitCode) console.log(`native-config: ok (app ${capId}, links ${webHost})`);
