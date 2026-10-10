/**
 * Log lines: "WARNING weather: …".
 *
 * Under systemd a line starts with its priority instead ("<4>weather: …"), which the journal
 * takes off and keeps, so that `journalctl -u led-matrix -p warning` shows what matters.
 */

const JOURNAL = Boolean(process.env.JOURNAL_STREAM);
const head = (priority: number, level: string, name: string): string =>
  JOURNAL ? `<${priority}>${name}:` : `${level} ${name}:`;

export interface Log {
  info(message: string): void;
  warning(message: string): void;
  /** `error`: what went wrong, written out below the message. */
  error(message: string, error?: unknown): void;
}

export function getLog(name: string): Log {
  return {
    info: (message) => console.log(`${head(6, "INFO", name)} ${message}`),
    warning: (message) => console.warn(`${head(4, "WARNING", name)} ${message}`),
    error: (message, error) =>
      console.error(`${head(3, "ERROR", name)} ${message}`, ...(error === undefined ? [] : [error])),
  };
}

/** What went wrong, as one line. */
export function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
