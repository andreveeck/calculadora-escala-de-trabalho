import { WorkSchedule } from "./WorkSchedule";

export class SixByOneSchedule extends WorkSchedule {
  readonly type = "6x1" as const;
  readonly name = "Escala 6x1";
  readonly referenceLabel = "Data de uma folga conhecida";
  readonly referenceHelp =
    "Informe um dia em que você tem certeza que foi ou será folga.";
  protected readonly cycleLengthInDays = 7;

  protected isRestCycleIndex(cycleIndex: number): boolean {
    return cycleIndex === 0;
  }

  protected getLabel(cycleIndex: number): string {
    return cycleIndex === 0 ? "Folga" : `${cycleIndex}º dia de trabalho`;
  }
}
