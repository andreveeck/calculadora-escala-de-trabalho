import { ScheduleCalculatorService } from "@/src/models/services/ScheduleCalculatorService";
import type {
  CalculateScheduleInput,
  ScheduleCalculationResult,
} from "@/src/shared/dto/ScheduleDtos";
import { ScheduleInputValidator } from "@/src/shared/validation/ScheduleInputValidator";

export class ScheduleController {
  constructor(
    private readonly validator: ScheduleInputValidator,
    private readonly calculatorService: ScheduleCalculatorService,
  ) {}

  calculate(
    input: Partial<CalculateScheduleInput>,
  ): ScheduleCalculationResult {
    return this.calculatorService.calculate(this.validator.validate(input));
  }
}
