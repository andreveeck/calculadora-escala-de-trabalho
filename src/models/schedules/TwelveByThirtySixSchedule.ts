import { WorkSchedule } from "./WorkSchedule";

export class TwelveByThirtySixSchedule extends WorkSchedule {
  readonly type = "12x36" as const;
  readonly name = "Escala 12x36";
  readonly referenceLabel = "Data de início de um plantão";
  readonly referenceHelp =
    "Informe o dia em que o plantão começou. O próximo plantão ocorre dois dias depois.";
  protected readonly cycleLengthInDays = 2;

  protected isRestCycleIndex(cycleIndex: number): boolean {
    return cycleIndex === 1;
  }

  protected getLabel(cycleIndex: number): string {
    return cycleIndex === 0 ? "Plantão" : "Folga de 36h";
  }
}
