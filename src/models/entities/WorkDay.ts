export type WorkDayStatus = "work" | "rest";

export class WorkDay {
  constructor(
    public readonly date: string,
    public readonly status: WorkDayStatus,
    public readonly label: string,
    public readonly cycleDay: number,
  ) {}

  get isRest(): boolean {
    return this.status === "rest";
  }
}
