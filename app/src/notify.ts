/**
 * The pet on the phone calls when it needs somebody: when the app goes into the background, it
 * leaves one local notification for the next need the core sees coming (core/src/notify.ts).
 * Nothing goes over the network: the phone itself shows it at that time.
 *
 * Only the app from the stores, and only for the pet on the phone: with a Pi the app can't know
 * what happens there in the meantime. Back in the app, the pet is right there and the
 * notification goes away.
 */

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { I18n } from "../../core/src/i18n";
import type { Pet } from "../../core/src/pet";
import { native } from "./native";

const ID = 1; // one at a time: the next need
const CHANNEL = "pet";
const ICON = "ic_stat_pet"; // drawn by tools/app_icons.ts
const ASKED_KEY = "notify.asked"; // "1": it has asked once whether it may call

export class Reminders {
  private queue: Promise<void> = Promise.resolve();
  private channel = false;

  constructor(private readonly i18n: I18n) {}

  /** The app goes into the background: a notification for the next need, if it may call. */
  leave(pet: Pet): void {
    const reminder = pet.nextReminder();
    const name = pet.state.name;
    this.run(async () => {
      await LocalNotifications.cancel({ notifications: [{ id: ID }] });
      if (!reminder || (await LocalNotifications.checkPermissions()).display !== "granted") {
        return;
      }
      if (!this.channel && Capacitor.getPlatform() === "android") {
        await LocalNotifications.createChannel({ id: CHANNEL, name: this.i18n.t("pet.notify.channel"), importance: 3 });
        this.channel = true;
      }
      await LocalNotifications.schedule({
        notifications: [{
          id: ID, title: name, body: this.i18n.t(`pet.notify.${reminder.need}`, { name }),
          schedule: { at: new Date(reminder.at * 1000), allowWhileIdle: true },
          channelId: CHANNEL, smallIcon: ICON, autoCancel: true,
          isExactNotification: false, // a few minutes late is fine, and needs no special permission
        }],
      });
    });
  }

  /** Back in the app (or the pet lives on a Pi now): no notification is needed any more. */
  clear(): void {
    this.run(async () => {
      await LocalNotifications.cancel({ notifications: [{ id: ID }] });
      await LocalNotifications.removeAllDeliveredNotifications();
    });
  }

  /** Asks once whether it may call: after it has been fed for the first time, so it is clear why. */
  ask(): void {
    try {
      if (localStorage.getItem(ASKED_KEY)) {
        return;
      }
      localStorage.setItem(ASKED_KEY, "1");
    } catch {
      return; // without storage it would ask every time
    }
    this.run(async () => {
      const { display } = await LocalNotifications.checkPermissions();
      if (display === "prompt" || display === "prompt-with-rationale") {
        await LocalNotifications.requestPermissions();
      }
    });
  }

  private run(step: () => Promise<void>): void {
    this.queue = this.queue.then(step).catch((error) => console.warn("Notifications", error));
  }
}

/** The reminders, in the app from the stores; null in a browser. */
export function reminders(i18n: I18n): Reminders | null {
  return native ? new Reminders(i18n) : null;
}
