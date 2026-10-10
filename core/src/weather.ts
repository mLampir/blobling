/**
 * Current weather from Open-Meteo (no API key needed).
 *
 * Data: Open-Meteo.com, CC BY 4.0. Free for non-commercial use only.
 * The weather is a WMO code (sky.ts sorts those out for the pet).
 *
 * The only part of the core that goes on the network: the Pi and the app both ask Open-Meteo
 * themselves, with the `fetch` they are handed (the global one by default).
 */

const API_URL = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT = 5;
// Don't ask again straight after an error.
const RETRY_SECONDS = 60;
// Older data counts as stale and is no longer shown.
const MAX_AGE_SECONDS = 3 * 3600;

export interface WeatherData {
  /** °C */
  temp: number;
  /** WMO code */
  code: number;
}

const now = (): number => Date.now() / 1000;

export class Weather {
  readonly refreshSeconds: number;
  data: WeatherData | null = null;
  fetchedAt = 0.0;
  lastAttempt = 0.0;
  error: string | null = null;
  private refreshing = false;

  /** `warn`: where a failed request is reported. */
  constructor(public latitude: number | null, public longitude: number | null, refreshMinutes: number,
      private readonly request: typeof fetch = (...args) => fetch(...args),
      private readonly warn: (message: string) => void = console.warn) {
    this.refreshSeconds = refreshMinutes * 60;
  }

  /** A new place: the weather from the old one is dropped and fetched again soon. */
  setLocation(location: readonly [number, number] | null): void {
    [this.latitude, this.longitude] = location ?? [null, null];
    this.data = null;
    this.fetchedAt = 0.0;
    this.lastAttempt = 0.0;
    this.error = null;
  }

  get configured(): boolean {
    return this.latitude !== null && this.longitude !== null;
  }

  needsRefresh(): boolean {
    if (this.refreshing || now() - this.lastAttempt < RETRY_SECONDS) {
      return false;
    }
    return this.data === null || now() - this.fetchedAt >= this.refreshSeconds;
  }

  /** Takes a few seconds at most (timeout). Never throws. */
  async refresh(): Promise<void> {
    this.lastAttempt = now();
    this.refreshing = true;
    let invalid = false;
    try {
      const url = `${API_URL}?latitude=${this.latitude}&longitude=${this.longitude}`
        + "&current=temperature_2m,weather_code";
      const response = await this.request(url, { signal: AbortSignal.timeout(TIMEOUT * 1000) });
      if (response.status === 400) {
        invalid = true;
        throw new Error((await response.json() as { reason?: string }).reason || "invalid location");
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const { current } = await response.json() as { current: Record<string, unknown> };
      const data = { temp: Number(current.temperature_2m), code: Math.trunc(Number(current.weather_code)) };
      if (Number.isNaN(data.temp) || Number.isNaN(data.code)) {
        throw new Error("unexpected answer");
      }
      this.data = data;
      this.fetchedAt = now();
      this.error = null;
    } catch (error) {
      const why = error instanceof Error ? error.message : String(error);
      this.warn(`Weather request failed: ${why}`);
      this.error = invalid ? why : "no connection";
    } finally {
      this.refreshing = false;
    }
  }

  /** {temp: °C, code: WMO code}, or null if there is no current data. */
  current(): WeatherData | null {
    return this.data && now() - this.fetchedAt < MAX_AGE_SECONDS ? this.data : null;
  }
}
