import type { ScheduleType } from "@/src/models/schedules/ScheduleType";
import { ScheduleCalculator } from "@/src/views/components/ScheduleCalculator";

interface ScaleCalculatorPageProps {
  scheduleType: ScheduleType;
  title: string;
  description: string;
  bullets: string[];
}

export function ScaleCalculatorPage({
  scheduleType,
  title,
  description,
  bullets,
}: ScaleCalculatorPageProps) {
  return (
    <main>
      <ScheduleCalculator initialScheduleType={scheduleType} />
      <section className="bottom-banner" aria-label="Banner informativo">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <ul>
          {bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
