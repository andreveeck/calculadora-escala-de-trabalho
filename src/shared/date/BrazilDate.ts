export class BrazilDate {
  private static readonly isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
  private static readonly millisecondsPerDay = 86_400_000;

  private constructor(private readonly value: string) {}

  static fromIso(value: string): BrazilDate {
    if (!this.isValidIsoDate(value)) {
      throw new Error("Data inválida. Use o formato YYYY-MM-DD.");
    }

    return new BrazilDate(value);
  }

  static today(): BrazilDate {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    return new BrazilDate(formatter.format(new Date()));
  }

  static isValidIsoDate(value: string): boolean {
    if (!this.isoDatePattern.test(value)) {
      return false;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }

  static positiveModulo(value: number, divisor: number): number {
    return ((value % divisor) + divisor) % divisor;
  }

  toIso(): string {
    return this.value;
  }

  addDays(days: number): BrazilDate {
    const date = this.toUtcDate();
    date.setUTCDate(date.getUTCDate() + days);
    return new BrazilDate(BrazilDate.formatUtc(date));
  }

  diffInDays(other: BrazilDate): number {
    return Math.round(
      (this.toUtcDate().getTime() - other.toUtcDate().getTime()) /
        BrazilDate.millisecondsPerDay,
    );
  }

  getMonthStart(): BrazilDate {
    const date = this.toUtcDate();
    return new BrazilDate(
      BrazilDate.formatParts(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
    );
  }

  getMonthDays(): number {
    const date = this.toUtcDate();
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    ).getUTCDate();
  }

  formatForPtBr(options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      ...options,
    }).format(this.toUtcDate());
  }

  private toUtcDate(): Date {
    const [year, month, day] = this.value.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private static formatUtc(date: Date): string {
    return this.formatParts(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
    );
  }

  private static formatParts(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(
      2,
      "0",
    )}`;
  }
}
