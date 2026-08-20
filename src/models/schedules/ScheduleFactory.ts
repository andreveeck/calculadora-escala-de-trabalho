import type { ScheduleType } from "./ScheduleType";
import { SixByOneSchedule } from "./SixByOneSchedule";
import { SixByTwoSchedule } from "./SixByTwoSchedule";
import { ThreeByThreeSchedule } from "./ThreeByThreeSchedule";
import { TwelveByThirtySixSchedule } from "./TwelveByThirtySixSchedule";
import type { WorkSchedule } from "./WorkSchedule";

export class ScheduleFactory {
  create(type: ScheduleType): WorkSchedule {
    switch (type) {
      case "6x1":
        return new SixByOneSchedule();
      case "12x36":
        return new TwelveByThirtySixSchedule();
      case "6x2":
        return new SixByTwoSchedule();
      case "3x3":
        return new ThreeByThreeSchedule();
    }
  }
}
