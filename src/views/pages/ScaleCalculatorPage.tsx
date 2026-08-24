import type { ScheduleType } from "@/src/models/schedules/ScheduleType";
import { ScheduleCalculator } from "@/src/views/components/ScheduleCalculator";
import { DeveloperContactFooter } from "@/src/views/components/DeveloperContactFooter";

interface ScaleCalculatorPageProps {
  scheduleType: ScheduleType;
  title: string;
  description: string;
  bullets: string[];
  showDeveloperContact?: boolean;
}

export function ScaleCalculatorPage({
  scheduleType,
  title,
  description,
  bullets,
  showDeveloperContact = false,
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
      {showDeveloperContact ? (
        <DeveloperContactFooter appName="Minha Escala" />
      ) : null}
    </main>
  );
}
