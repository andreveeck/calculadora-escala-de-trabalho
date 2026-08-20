export class SafeLogger {
  error(message: string, details?: Record<string, unknown>): void {
    console.error(message, this.sanitize(details));
  }

  info(message: string, details?: Record<string, unknown>): void {
    console.info(message, this.sanitize(details));
  }

  private sanitize(details?: Record<string, unknown>): Record<string, unknown> {
    if (!details) {
      return {};
    }

    const blocked = new Set(["password", "token", "secret", "accessToken"]);
    return Object.fromEntries(
      Object.entries(details).filter(([key]) => !blocked.has(key)),
    );
  }
}
