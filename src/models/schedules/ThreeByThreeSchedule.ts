import { WorkSchedule } from "./WorkSchedule";

export class ThreeByThreeSchedule extends WorkSchedule {
  readonly type = "3x3" as const;
  readonly name = "Escala 3x3";
  readonly referenceLabel = "Primeiro dia de trabalho do ciclo";
  readonly referenceHelp =
    "Informe o primeiro dia trabalhado antes dos três dias de trabalho e três folgas.";
  protected readonly cycleLengthInDays = 6;

  protected isRestCycleIndex(cycleIndex: number): boolean {
    return cycleIndex >= 3;
  }

  protected getLabel(cycleIndex: number): string {
    return cycleIndex >= 3
      ? `${cycleIndex - 2}ª folga`
      : `${cycleIndex + 1}º dia de trabalho`;
  }
}
