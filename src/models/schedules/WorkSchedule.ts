import { WorkDay } from "@/src/models/entities/WorkDay";
import { BrazilDate } from "@/src/shared/date/BrazilDate";
import type { ScheduleType } from "./ScheduleType";

export abstract class WorkSchedule {
  abstract readonly type: ScheduleType;
  abstract readonly name: string;
  abstract readonly referenceLabel: string;
  abstract readonly referenceHelp: string;
  protected abstract readonly cycleLengthInDays: number;

  getDay(date: BrazilDate, referenceDate: BrazilDate): WorkDay {
    const cycleIndex = BrazilDate.positiveModulo(
      date.diffInDays(referenceDate),
      this.cycleLengthInDays,
    );

    return new WorkDay(
      date.toIso(),
      this.isRestCycleIndex(cycleIndex) ? "rest" : "work",
      this.getLabel(cycleIndex),
      cycleIndex + 1,
    );
  }

  getNextRestDay(fromDate: BrazilDate, referenceDate: BrazilDate): WorkDay {
    for (let offset = 0; offset < this.cycleLengthInDays; offset += 1) {
      const candidate = this.getDay(fromDate.addDays(offset), referenceDate);
      if (candidate.isRest) {
        return candidate;
      }
    }

    throw new Error("Nenhuma folga encontrada no ciclo da escala.");
  }

  protected abstract isRestCycleIndex(cycleIndex: number): boolean;
  protected abstract getLabel(cycleIndex: number): string;
}
