/**
 * The screenshots for the stores:  npm run store
 *
 * Takes pictures of the app in the browser (Playwright, no phone or simulator needed) and puts
 * them into frames with a headline, in every size the stores ask for:
 *
 *   npm run store                          all pictures, all languages
 *   npm run store -- --only=home,trip      some of them (the ids in SHOTS)
 *   npm run store -- --lang=de             one language
 *   npm run store -- --frames-only         new frames from the last pictures (to work on the headlines)
 *
 * Every picture starts from a pet of its own: a short life is played through with the core
 * (feeding, playing, trips …) up to the moment of the picture, saved, and put where the app keeps
 * its pet before the page opens. The page's clock is set to that moment, so day and night, the
 * diary and the times are what they would be on a phone. Nothing is changed in the app for it.
 *
 * The pictures show what the README may show: egg, baby, child and Angloop, and the first area.
 * The headlines are in store/<language>.json. Everything lands in dist/store/ and is uploaded
 * from there by hand:
 *
 *   dist/store/<size>/<language>/<nn>-<id>.png    the framed pictures, one folder per size
 *   dist/store/shots/<language>/<device>/<id>.png the pictures of the app alone
 *   dist/store/contact-<language>.png             all framed phone pictures side by side, to judge them as a set
 *   dist/store/play-feature-1024x500/<language>.png  the feature graphic of the Google Play listing
 *
 * Needs Chromium for Playwright once: npx playwright install chromium
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { extname, join, normalize } from "node:path";
import { parseArgs } from "node:util";

import { chromium, type Browser, type Page } from "playwright";

import { I18n } from "../core/src/i18n";
import * as model from "../core/src/model";
import { Pet, type SaveFile } from "../core/src/pet";
import { APP_BACKGROUND, PetScene, SPRITE } from "../core/src/scene";
import { readAssets } from "../pi/src/assets";
import { encodePng } from "../pi/src/png";

// What the functions handed to page.evaluate find in the page (the tools are type-checked without the DOM)
declare const document: { body: { insertAdjacentHTML(where: string, html: string): void }; fonts: { ready: Promise<unknown> } };
declare const indexedDB: { open(name: string, version: number): any };
declare const localStorage: { setItem(key: string, value: string): void };

const APP_DIR = "dist/app";
const COPY_DIR = "store";
const OUT = "dist/store";
const LANGUAGES = ["en", "de"];
const BEDTIME: model.Bedtime = ["22:30", "07:00"];
const HOUR = 3600;
const MINUTE = 60;

// ---------- Devices and sizes ----------

interface Device {
  /** Size of the page in CSS pixels and the pixels per CSS pixel: the picture is width × scale. */
  width: number;
  height: number;
  scale: number;
  /** What the system covers at the top and bottom (status bar, home indicator), in CSS pixels. */
  safeTop: number;
  safeBottom: number;
  /** Corner radius of the screen, in CSS pixels. */
  radius: number;
}

/** The devices the app is photographed on: a large iPhone, and an iPad for the iPad pictures. */
const DEVICES: Record<string, Device> = {
  phone: { width: 430, height: 932, scale: 3, safeTop: 54, safeBottom: 34, radius: 55 },
  tablet: { width: 1032, height: 1376, scale: 2, safeTop: 24, safeBottom: 20, radius: 18 },
};

interface Size {
  width: number;
  height: number;
  device: keyof typeof DEVICES;
}

/**
 * The sizes the stores take. App Store: the 6.9" iPhone and the 13" iPad (the app runs on iPads,
 * so their pictures are required); the stores scale them down for the smaller devices. Google
 * Play: a phone picture in 9:16, at least 1080 pixels wide.
 */
const SIZES: Record<string, Size> = {
  "appstore-iphone-1320x2868": { width: 1320, height: 2868, device: "phone" },
  "appstore-ipad-2064x2752": { width: 2064, height: 2752, device: "tablet" },
  "play-phone-1080x1920": { width: 1080, height: 1920, device: "phone" },
};

// ---------- The pictures ----------

/** A pet that has lived a while, and the moment it is photographed. */
interface Moment {
  save: SaveFile;
  now: number;
}

interface Shot {
  id: string;
  /** The pet and the moment of the picture. */
  moment: (t: I18n) => Moment;
  /** What is done on the page before the picture is taken. */
  show?: (page: Page) => Promise<void>;
}

/** Unix seconds of a local time written as "2026-10-12 08:00". */
function at(text: string): number {
  const [year, month, day, hour, minute] = text.split(/[- :]/).map(Number);
  return new Date(year, month - 1, day, hour, minute).getTime() / 1000;
}

const START = at("2026-10-05 08:00");

/**
 * A pet's life up to a moment: an egg that is kept warm, then a few days of care the way somebody
 * looks after it now and then over the day. `extra` runs on the day of the picture, just before it.
 */
class Life {
  now = START;
  readonly pet: Pet;

  constructor(readonly t: I18n) {
    this.pet = new Pet({ t: t.t, clock: () => this.now, bedtime: () => BEDTIME, save: () => {} });
  }

  /** Lets time pass. */
  wait(seconds: number): this {
    const end = this.now + seconds;
    while (this.now < end) {
      this.now = Math.min(end, this.now + 10 * MINUTE);
      this.pet.update(this.now);
    }
    return this;
  }

  /** Until a local time on the same day or a later one. */
  until(text: string): this {
    return this.wait(Math.max(0, at(text) - this.now));
  }

  /** Does something; a refusal (it's asleep, it isn't hungry) is part of a life too. */
  do(action: string, request: Record<string, unknown> = {}): this {
    try {
      this.pet.action(action, { ...request, now: this.now });
    } catch {
      // not possible right now
    }
    return this;
  }

  /** A day of care from the morning to the evening: meals, play, a wash, a trick, petting. */
  day(date: string, { trip = false } = {}): this {
    this.until(`${date} 07:30`).do("feed", { item: "meal" }).do("pet").wait(20 * MINUTE).do("clean");
    if (trip) {
      this.until(`${date} 09:30`).do("trip", { item: "meadow" });
    }
    this.until(`${date} 12:30`).do("feed", { item: "meal" }).wait(30 * MINUTE).do("play");
    this.until(`${date} 16:00`).do("feed", { item: "fruit_cherry" }).do("trick", { item: "bow" })
      .do("pet").do("play");
    this.until(`${date} 17:00`).do("feed", { item: "meal" }).wait(HOUR).do("clean").do("pet");
    return this.until(`${date} 22:40`);
  }

  /** The egg, kept warm until it hatches, and the first days. */
  hatch(): this {
    this.do("pet").wait(5 * MINUTE).do("pet").wait(5 * MINUTE).do("pet");
    this.wait(HOUR).do("evolve");
    this.pet.rename(this.t.t("pet.default_name"));
    return this;
  }

  moment(): Moment {
    this.pet.update(this.now);
    this.pet.state.seen_at = this.now; // somebody was just there: no "while you were away" story
    // What it refused along the way is true to life, but no picture for the store
    this.pet.state.events = this.pet.state.events.filter((event) => event.accepted);
    return { save: this.pet.toSave(), now: this.now };
  }
}

/**
 * A pet that hatched three days ago and has just grown into a child. It stays a child of less than
 * a day: from then on it carries the lure that shows which form it grows into (life.hint), and
 * that is for players to find out.
 */
function child(t: I18n): Life {
  const life = new Life(t).hatch();
  for (const date of ["2026-10-05", "2026-10-06", "2026-10-07"]) {
    life.day(date);
  }
  return life.until("2026-10-08 07:30").do("feed", { item: "meal" }).do("clean")
    .until("2026-10-08 09:30").do("evolve");
}

/** The child back from its first trip to the meadow, with what it found unpacked. */
function travelled(t: I18n): Life {
  const life = child(t).until("2026-10-08 09:50").do("feed", { item: "meal" }).until("2026-10-08 10:00")
    .do("trip", { item: "meadow" });
  while (life.pet.state.trip) {
    life.wait(10 * MINUTE);
  }
  return life.wait(5 * MINUTE).do("unpack").wait(10 * MINUTE).do("feed", { item: "meal" }).do("clean").do("pet");
}

/**
 * The pet a week later as an Angloop, the one adult form the docs show openly. Which form a child
 * grows into depends on how it was raised (docs/pets.md); here it is simply set.
 */
function grown(t: I18n): Life {
  const life = travelled(t);
  for (const date of ["2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-14"]) {
    life.day(date);
  }
  life.until("2026-10-15 09:30");
  Object.assign(life.pet.state, { stage: "adult", species: "angloop", stage_since: life.now });
  return life.do("feed", { item: "meal" }).do("clean").do("pet").until("2026-10-15 14:00").do("play").wait(20 * MINUTE)
    .do("pet");
}

/** Clicks a tab of the bottom bar. */
async function view(page: Page, name: string): Promise<void> {
  await page.click(`#tabbar [data-view="${name}"]`);
}

const SHOTS: Shot[] = [
  {
    id: "home",
    moment: (t) => travelled(t).until("2026-10-08 16:00").do("clean").do("pet").do("feed", { item: "fruit_cherry" }).wait(5 * MINUTE).moment(),
  },
  {
    id: "eat",
    moment: (t) => travelled(t).until("2026-10-08 15:30").do("feed", { item: "meal" }).wait(2).moment(),
  },
  {
    id: "night",
    moment: (t) => travelled(t).until("2026-10-08 23:10").moment(),
  },
  {
    id: "trip",
    moment: (t) => child(t).until("2026-10-08 09:50").do("feed", { item: "meal" }).until("2026-10-08 10:00")
      .do("trip", { item: "meadow" }).wait(40 * MINUTE).moment(),
  },
  {
    id: "diary",
    moment: (t) => travelled(t).until("2026-10-08 17:00").moment(),
    show: (page) => view(page, "diary"),
  },
  {
    id: "grown",
    moment: (t) => grown(t).moment(),
  },
];

// ---------- Taking the pictures ----------

/** Serves the built app, like npm run app; any other path is an empty page of the same site. */
function serve(): Promise<{ server: Server; base: string }> {
  const types: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8" };
  const server = createServer((request, response) => {
    const path = normalize(new URL(request.url ?? "/", "http://app").pathname).replace(/^([/\\])+/, "");
    if (path === "" || path === "index.html" || path === "app.js") {
      const file = join(APP_DIR, path || "index.html");
      response.writeHead(200, { "Content-Type": types[extname(file)] });
      response.end(readFileSync(file));
    } else {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end("<!doctype html><title>blank</title>");
    }
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    resolve({ server, base: `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}` });
  }));
}

/** The status bar of a phone at the top of the page: the time, signal, Wi-Fi and battery. */
function statusBar(device: Device): string {
  if (device.safeTop < 40) {
    return "";
  }
  const icons = `
    <svg width="18" height="12" viewBox="0 0 18 12" fill="#fff"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
    <svg width="16" height="12" viewBox="0 0 16 12" fill="#fff"><path d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3C13.5 1.5 10.9.4 8 .4S2.5 1.5.5 3.4l1.2 1.3C3.4 3.1 5.6 2.2 8 2.2zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3C11.6 4.7 9.9 4 8 4s-3.6.7-4.9 1.9l1.2 1.3c1-.9 2.3-1.4 3.7-1.4zM8 9.4c-.6 0-1.2.2-1.6.6L8 11.7 9.6 10c-.4-.4-1-.6-1.6-.6z"/></svg>
    <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="#fff" stroke-opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2" fill="#fff"/><path d="M25 4.5v4c.8-.3 1.5-1 1.5-2s-.7-1.7-1.5-2z" fill="#fff" fill-opacity=".4"/></svg>`;
  return `<div id="store-status" style="position:fixed;z-index:2147483647;left:0;right:0;top:0;height:${device.safeTop}px;
    display:flex;align-items:center;justify-content:space-between;padding:4px 34px 0 50px;box-sizing:border-box;pointer-events:none;
    font:600 17px/1 -apple-system,'SF Pro Text',system-ui,sans-serif;color:#fff">
    <span>9:41</span><span style="display:flex;gap:6px;align-items:center">${icons}</span></div>`;
}

async function capture(browser: Browser, base: string, shot: Shot, language: string, deviceName: string): Promise<void> {
  const device = DEVICES[deviceName];
  const t = new I18n(readLocales(), language);
  const { save, now } = shot.moment(t);
  const context = await browser.newContext({
    viewport: { width: device.width, height: device.height }, deviceScaleFactor: device.scale,
    locale: language === "de" ? "de-AT" : "en-US", timezoneId: "Europe/Vienna", hasTouch: true, isMobile: deviceName === "phone",
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => console.error(`${shot.id}: ${error.message}`));
  await page.clock.install({ time: now * 1000 });
  // The pet goes where the app keeps it (app/src/store.ts) before the app opens
  await page.goto(`${base}/blank`);
  await page.evaluate((file) => new Promise<void>((resolve, reject) => {
    const request = indexedDB.open("blobling", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("saves");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const transaction = request.result.transaction("saves", "readwrite");
      transaction.objectStore("saves").put(file, "pet");
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    };
  }), save);
  // The scuffles of the last trip count as watched: no "Watch the scuffles" button over every picture
  const lastTrip = save.pet.recent.trip?.at(-1);
  if (lastTrip !== undefined) {
    await page.evaluate((value) => localStorage.setItem("watched", value), String(lastTrip));
  }
  await page.goto(`${base}/`);
  await page.addStyleTag({ content: `:root { --safe-area-inset-top: ${device.safeTop}px; --safe-area-inset-bottom: ${device.safeBottom}px; }` });
  await page.evaluate((html) => document.body.insertAdjacentHTML("beforeend", html), statusBar(device));
  await page.waitForTimeout(1500);
  if (shot.show) {
    await shot.show(page);
    await page.waitForTimeout(500);
  }
  const file = join(OUT, "shots", language, deviceName, `${shot.id}.png`);
  mkdirSync(join(OUT, "shots", language, deviceName), { recursive: true });
  await page.screenshot({ path: file });
  await context.close();
  console.log(`  ${file}`);
}

function readLocales(): Record<string, object> {
  return Object.fromEntries(LANGUAGES.map((language) =>
    [language, JSON.parse(readFileSync(join("app/locales", `${language}.json`), "utf-8"))]));
}

// ---------- The frames ----------

interface Copy {
  title: string;
  subtitle?: string;
}

/** A few stars on the background, always in the same places (a small pseudo-random sequence). */
function stars(count: number): string {
  let seed = 7;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: count }, () => {
    const size = next() < 0.2 ? 0.6 : 0.35;
    return `<i style="left:${(next() * 100).toFixed(1)}%;top:${(next() * 100).toFixed(1)}%;width:${size}cqw;height:${size}cqw;opacity:${(0.25 + next() * 0.5).toFixed(2)}"></i>`;
  }).join("");
}

/**
 * One framed picture: the headline at the top, the device below it, whole and never cut off, on
 * the night sky of the app. Every measure is a share of the width (cqw), so the same design fits
 * the narrow iPhone, the wider Play size and the iPad.
 */
function frameHtml(size: Size, copy: Copy, shot: string): string {
  const device = DEVICES[size.device];
  const phone = size.device === "phone";
  // How wide the device may be: as wide as fits under the headline, at most this share of the width
  const room = size.height / size.width - (phone ? 0.56 : 0.3); // height left for the device, in widths
  const aspect = device.height / device.width;
  const bezel = phone ? 2.2 : 1.6; // in cqw
  const width = Math.min(phone ? 84 : 86, (room * 100 - 2 * bezel) / aspect);
  const radius = (device.radius / device.width) * width;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;800&display=block">
<style>
  html, body { margin: 0; width: ${size.width}px; height: ${size.height}px; overflow: hidden; }
  body { container-type: inline-size; position: relative; color: #eef1f8; font-family: "Nunito", system-ui, sans-serif;
    background: radial-gradient(120% 70% at 50% 100%, #24356b 0%, #141c35 55%, #0d1220 100%); }
  .stars i { position: absolute; background: #eef1f8; }
  .head { position: absolute; left: 7cqw; right: 7cqw; top: ${phone ? 11 : 5}cqw; text-align: center; }
  h1 { margin: 0; font-weight: 800; font-size: ${phone ? 8.6 : 5.6}cqw; line-height: 1.1; letter-spacing: -0.01em; text-wrap: balance; }
  p { margin: ${phone ? 2.4 : 1.4}cqw 0 0; font-weight: 600; font-size: ${phone ? 4.4 : 2.7}cqw; line-height: 1.3; color: #ffb347; text-wrap: balance; }
  .device { position: absolute; left: 50%; bottom: ${phone ? 6 : 4}cqw; transform: translateX(-50%); width: ${width}cqw;
    padding: ${bezel}cqw; border-radius: ${radius + bezel}cqw; background: #05070c;
    box-shadow: 0 0 0 0.3cqw #3a4466, 0 3cqw 8cqw rgba(0, 0, 0, .55), 0 0 12cqw rgba(95, 140, 255, .18); }
  .device img { display: block; width: 100%; border-radius: ${radius}cqw; }
  ${phone ? `.device::after { content: ""; position: absolute; top: calc(${bezel}cqw + ${(11 / device.width) * width}cqw); left: 50%;
    transform: translateX(-50%); width: ${(125 / device.width) * width}cqw; height: ${(37 / device.width) * width}cqw;
    border-radius: 99px; background: #000; }` : ""}
</style></head><body>
<div class="stars">${stars(phone ? 40 : 60)}</div>
<div class="head"><h1>${escape(copy.title)}</h1>${copy.subtitle ? `<p>${escape(copy.subtitle)}</p>` : ""}</div>
<div class="device"><img src="data:image/png;base64,${shot}"></div>
</body></html>`;
}

function escape(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

/** Puts the pictures of a language into frames, in every size, and a contact sheet of the phone pictures. */
async function frame(browser: Browser, language: string, shots: Shot[]): Promise<void> {
  const copy = JSON.parse(readFileSync(join(COPY_DIR, `${language}.json`), "utf-8")) as Record<string, Copy>;
  const page = await browser.newPage();
  for (const [name, size] of Object.entries(SIZES)) {
    const dir = join(OUT, name, language);
    mkdirSync(dir, { recursive: true });
    await page.setViewportSize({ width: size.width, height: size.height });
    for (const shot of shots) {
      const number = String(SHOTS.indexOf(shot) + 1).padStart(2, "0");
      const text = copy[shot.id];
      if (!text) {
        throw new Error(`No headline for "${shot.id}" in ${COPY_DIR}/${language}.json`);
      }
      const picture = readFileSync(join(OUT, "shots", language, size.device, `${shot.id}.png`)).toString("base64");
      await page.setContent(frameHtml(size, text, picture), { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      const file = join(dir, `${number}-${shot.id}.png`);
      await page.screenshot({ path: file });
      console.log(`  ${file}`);
    }
  }
  await page.close();
  await contactSheet(browser, language);
}

/**
 * All phone pictures of a language side by side, about as small as a store shows them: whether
 * they read as one set, and whether each headline can be read at that size, is judged here.
 */
async function contactSheet(browser: Browser, language: string): Promise<void> {
  const dir = join(OUT, Object.keys(SIZES)[0], language);
  const files = SHOTS.map((shot) => `${String(SHOTS.indexOf(shot) + 1).padStart(2, "0")}-${shot.id}.png`)
    .filter((file) => existsSync(join(dir, file)));
  const images = files.map((file) => `<img src="data:image/png;base64,${readFileSync(join(dir, file)).toString("base64")}">`);
  const page = await browser.newPage({ viewport: { width: 240 * files.length + 16 * (files.length + 1), height: 560 } });
  await page.setContent(`<body style="margin:0;padding:16px;background:#fff;display:flex;gap:16px">
    <style>img { width: 240px; border-radius: 12px; }</style>${images.join("")}</body>`);
  const file = join(OUT, `contact-${language}.png`);
  await page.screenshot({ path: file, fullPage: true });
  await page.close();
  console.log(`  ${file}`);
}

// ---------- The feature graphic ----------

/** The pet in one of its forms, as a PNG in base64: cut to its pixels, transparent around it. */
function form(scene: PetScene, stage: string, species: string): { png: string; width: number; height: number } {
  const img = scene.icon(SPRITE + 8, stage, species); // scene.icon pads the sprite by 4
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i] === APP_BACKGROUND[0] && img.data[i + 1] === APP_BACKGROUND[1] && img.data[i + 2] === APP_BACKGROUND[2]) {
      img.data[i + 3] = 0;
    }
  }
  const [x0, y0, x1, y1] = img.bbox()!;
  const pet = img.crop(x0, y0, x1, y1);
  return { png: Buffer.from(encodePng(pet)).toString("base64"), width: pet.width, height: pet.height };
}

/**
 * The feature graphic Google Play shows at the top of the listing (1024 × 500): the name and a
 * line on the left, and on the right the pet growing up, from egg to Angloop, on the meadow under
 * the night sky. Play may cover the middle with a play button and crops the edges in some places,
 * so the text keeps its distance from them. A line break in the text ("\n") is kept.
 */
async function featureGraphic(browser: Browser, language: string): Promise<void> {
  const copy = JSON.parse(readFileSync(join(COPY_DIR, `${language}.json`), "utf-8")) as Record<string, Copy>;
  const text = copy.feature;
  if (!text) {
    throw new Error(`No "feature" text in ${COPY_DIR}/${language}.json`);
  }
  const scene = new PetScene(64, 64, readAssets());
  const PIXEL = 6; // one pixel of the sprites, in pixels of the graphic
  const forms = [["egg", "blob"], ["baby", "blob"], ["child", "blob"], ["adult", "angloop"]].map(([stage, species]) => {
    const { png, width, height } = form(scene, stage, species);
    return `<img src="data:image/png;base64,${png}" style="width:${width * PIXEL}px;height:${height * PIXEL}px">`;
  });
  const page = await browser.newPage({ viewport: { width: 1024, height: 500 } });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;800&display=block">
<style>
  body { margin: 0; width: 1024px; height: 500px; overflow: hidden; position: relative; color: #eef1f8; container-type: inline-size;
    font-family: "Nunito", system-ui, sans-serif;
    background: radial-gradient(90% 120% at 72% 100%, #2c4290 0%, #172347 50%, #0d1220 100%); }
  .stars i { position: absolute; background: #eef1f8; }
  .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 70px; background: #46290f; border-top: 14px solid #2e8c34; }
  .text { position: absolute; left: 72px; top: 0; bottom: 70px; width: 420px; display: flex; flex-direction: column; justify-content: center; }
  h1 { margin: 0; font-weight: 800; font-size: 88px; line-height: 1; letter-spacing: -0.01em; }
  p { margin: 18px 0 0; font-weight: 600; font-size: 30px; line-height: 1.25; color: #ffb347; white-space: pre-line; }
  .line { position: absolute; right: 56px; bottom: 70px; display: flex; align-items: flex-end; gap: 26px; }
  .line img { image-rendering: pixelated; display: block; }
</style></head><body>
<div class="stars">${stars(28)}</div>
<div class="ground"></div>
<div class="text"><h1>${escape(text.title)}</h1>${text.subtitle ? `<p>${escape(text.subtitle)}</p>` : ""}</div>
<div class="line">${forms.join("")}</div>
</body></html>`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const dir = join(OUT, "play-feature-1024x500");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${language}.png`);
  await page.screenshot({ path: file });
  await page.close();
  console.log(`  ${file}`);
}

// ---------- Main ----------

const { values } = parseArgs({
  options: { only: { type: "string" }, lang: { type: "string" }, "frames-only": { type: "boolean", default: false } },
});
const list = (text: string | undefined) => text?.split(",").map((part) => part.trim()).filter(Boolean);
const only = list(values.only);
const languages = list(values.lang) ?? LANGUAGES;
const shots = SHOTS.filter((shot) => !only || only.includes(shot.id));
if (!shots.length) {
  console.error(`No such picture; there are: ${SHOTS.map((shot) => shot.id).join(", ")}`);
  process.exit(1);
}

if (!values["frames-only"]) {
  const built = spawnSync(process.execPath, ["tools/build.mjs"], { stdio: "ignore" });
  if (built.status !== 0) {
    console.error("The build failed: npm run build");
    process.exit(built.status ?? 1);
  }
}
const browser = await chromium.launch();
try {
  if (!values["frames-only"]) {
    const { server, base } = await serve();
    try {
      for (const language of languages) {
        for (const deviceName of Object.keys(DEVICES)) {
          for (const shot of shots) {
            await capture(browser, base, shot, language, deviceName);
          }
        }
      }
    } finally {
      server.close();
    }
  }
  for (const language of languages) {
    await frame(browser, language, shots);
    await featureGraphic(browser, language);
  }
} finally {
  await browser.close();
}
