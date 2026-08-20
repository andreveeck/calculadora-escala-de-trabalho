import { WorkSchedule } from "./WorkSchedule";

export class SixByTwoSchedule extends WorkSchedule {
  readonly type = "6x2" as const;
  readonly name = "Escala 6x2";
  readonly referenceLabel = "Primeiro dia de trabalho após duas folgas";
  readonly referenceHelp =
    "Informe o primeiro dia trabalhado depois de completar as duas folgas.";
  protected readonly cycleLengthInDays = 8;

  protected isRestCycleIndex(cycleIndex: number): boolean {
    return cycleIndex >= 6;
  }

  protected getLabel(cycleIndex: number): string {
    return cycleIndex >= 6
      ? `${cycleIndex - 5}ª folga`
      : `${cycleIndex + 1}º dia de trabalho`;
  }
}
