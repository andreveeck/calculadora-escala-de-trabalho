import {
  scheduleTypes,
  type ScheduleType,
} from "@/src/models/schedules/ScheduleType";
import { BrazilDate } from "@/src/shared/date/BrazilDate";
import type { CalculateScheduleInput } from "@/src/shared/dto/ScheduleDtos";

export class ScheduleInputValidator {
  validate(input: Partial<CalculateScheduleInput>): CalculateScheduleInput {
    if (!input.scheduleType || !this.isScheduleType(input.scheduleType)) {
      throw new Error("Escolha uma escala válida.");
    }

    if (!input.referenceDate || !BrazilDate.isValidIsoDate(input.referenceDate)) {
      throw new Error("Informe uma data de referência válida.");
    }

    if (input.today && !BrazilDate.isValidIsoDate(input.today)) {
      throw new Error("A data de hoje informada para teste é inválida.");
    }

    return {
      scheduleType: input.scheduleType,
      referenceDate: input.referenceDate,
      today: input.today,
      upcomingDays: input.upcomingDays,
    };
  }

  private isScheduleType(value: string): value is ScheduleType {
    return scheduleTypes.includes(value as ScheduleType);
  }
}
