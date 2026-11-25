export function formatMonthYear(value: string): string {
  const label = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));

  return capitalizeFirstLetter(label);
}

export function addMonths(value: string, amount: number): string {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1 + amount, 1));

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-01`;
}

export function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function formatDayMonth(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function formatWeekdayShort(value: string): string {
  return capitalizeFirstLetter(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      weekday: "short",
    })
      .format(new Date(`${value}T00:00:00.000Z`))
      .replace(".", ""),
  );
}

export function formatWeekdayLong(value: string): string {
  return capitalizeFirstLetter(
    new Intl.DateTimeFormat("pt-BR", {
      timeZone: "UTC",
      weekday: "long",
    }).format(new Date(`${value}T00:00:00.000Z`)),
  );
}

export function capitalizeFirstLetter(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
