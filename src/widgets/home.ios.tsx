import { createWidget, type WidgetEnvironment } from "expo-widgets";
import { Circle, HStack, Text, VStack } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  frame,
  lineLimit,
  widgetAccentedRenderingMode,
  widgetURL,
} from "@expo/ui/swift-ui/modifiers";

import { appI18n } from "~/i18n/i18n";
import type { AppLanguage } from "~/i18n/language";
import { listItems } from "~/schedule/db/items";
import { listLogs } from "~/schedule/db/logs";

import { createHomeWidgetProps, type HomeWidgetProps } from "./projection";

let syncGeneration = 0;

function HomeWidget(
  props: HomeWidgetProps,
  environment: WidgetEnvironment
): React.JSX.Element {
  "widget";

  const isMedium = environment.widgetFamily === "systemMedium";
  const items = props.items.slice(0, isMedium ? 6 : 3);
  const firstColumn = items.slice(0, 3);
  const secondColumn = isMedium ? items.slice(3, 6) : [];
  const moreLabel = isMedium ? props.moreMedium : props.moreSmall;
  const rootModifiers = [
    frame({ maxHeight: 1000, maxWidth: 1000, alignment: "topLeading" }),
    widgetURL("ttokttak://home"),
  ];
  const renderItem = (item: HomeWidgetProps["items"][number]) => (
    <HStack
      key={`${item.title}:${item.detail}`}
      alignment="center"
      modifiers={[frame({ maxWidth: 1000, alignment: "leading" })]}
      spacing={6}
    >
      <Circle
        modifiers={[
          frame({ height: 8, width: 8 }),
          foregroundStyle(item.color),
          widgetAccentedRenderingMode("fullColor"),
        ]}
      />
      <VStack alignment="leading" spacing={1}>
        <Text
          modifiers={[font({ size: 13, weight: "semibold" }), lineLimit(1)]}
        >
          {item.title}
        </Text>
        <Text
          modifiers={[
            font({ size: 10 }),
            foregroundStyle({ type: "hierarchical", style: "secondary" }),
            lineLimit(1),
          ]}
        >
          {item.detail}
        </Text>
      </VStack>
    </HStack>
  );
  const renderColumn = (column: HomeWidgetProps["items"]) => (
    <VStack
      alignment="leading"
      modifiers={[frame({ maxWidth: 1000, alignment: "topLeading" })]}
      spacing={5}
    >
      {column.map(renderItem)}
    </VStack>
  );

  if (items.length === 0) {
    return (
      <VStack
        alignment="center"
        modifiers={[
          frame({ maxHeight: 1000, maxWidth: 1000, alignment: "center" }),
          widgetURL("ttokttak://home"),
        ]}
      >
        <Text
          modifiers={[
            font({ size: 13, weight: "medium" }),
            foregroundStyle({ type: "hierarchical", style: "secondary" }),
          ]}
        >
          {props.emptyMessage}
        </Text>
      </VStack>
    );
  }

  return (
    <VStack alignment="leading" modifiers={rootModifiers} spacing={5}>
      {isMedium ? (
        <HStack
          alignment="top"
          modifiers={[frame({ maxWidth: 1000, alignment: "topLeading" })]}
          spacing={12}
        >
          {renderColumn(firstColumn)}
          {renderColumn(secondColumn)}
        </HStack>
      ) : (
        renderColumn(firstColumn)
      )}
      {moreLabel ? (
        <Text
          modifiers={[
            font({ size: 10, weight: "medium" }),
            foregroundStyle({ type: "hierarchical", style: "secondary" }),
          ]}
        >
          {moreLabel}
        </Text>
      ) : null}
    </VStack>
  );
}

const homeWidget = createWidget<HomeWidgetProps>("HomeWidget", HomeWidget);

/** 현재 계정의 지난 일정과 오늘 occurrence를 iOS 위젯 snapshot으로 저장한다. */
export async function syncHomeWidget({
  language,
  timezone,
  userId,
}: {
  language: AppLanguage;
  timezone: string;
  userId?: string;
}): Promise<void> {
  const t = appI18n.t;
  const generation = ++syncGeneration;

  if (!userId) {
    homeWidget.updateSnapshot({
      emptyMessage: t("home.widget.login"),
      items: [],
      moreMedium: "",
      moreSmall: "",
    });
    return;
  }

  const schedules = await listItems({ userId });
  const itemIds = schedules.map((schedule) => schedule.id);
  const logs = itemIds.length ? await listLogs({ itemIds, userId }) : [];

  if (generation !== syncGeneration) {
    return;
  }

  homeWidget.updateSnapshot(
    createHomeWidgetProps({
      language,
      logs,
      now: new Date(),
      schedules,
      t,
      timezone,
    })
  );
}
