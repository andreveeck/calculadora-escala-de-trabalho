import { ScheduleFactory } from "@/src/models/schedules/ScheduleFactory";
import { ScheduleCalculatorService } from "@/src/models/services/ScheduleCalculatorService";
import { ScheduleInputValidator } from "@/src/shared/validation/ScheduleInputValidator";
import { ScheduleController } from "./ScheduleController";

export function createScheduleController(): ScheduleController {
  return new ScheduleController(
    new ScheduleInputValidator(),
    new ScheduleCalculatorService(new ScheduleFactory()),
  );
}
