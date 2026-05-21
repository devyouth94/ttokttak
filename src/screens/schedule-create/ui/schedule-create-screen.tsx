import { ScheduleFormScreen } from "~/screens/schedule-form";

type ScheduleCreateScreenProps = {
  returnTo?: string;
};

export function ScheduleCreateScreen({
  returnTo,
}: ScheduleCreateScreenProps): React.JSX.Element {
  return <ScheduleFormScreen returnTo={returnTo} />;
}
