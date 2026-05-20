import { ScheduleFormScreen } from "~/screens/schedule-form";

type ScheduleEditScreenProps = {
  itemId?: string;
  returnTo?: string;
};

export function ScheduleEditScreen({
  itemId,
  returnTo,
}: ScheduleEditScreenProps): React.JSX.Element {
  return <ScheduleFormScreen itemId={itemId} returnTo={returnTo} />;
}
