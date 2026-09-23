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

import type { DeviceSyncInput } from "~/device-sync-session";
import { appI18n } from "~/i18n/i18n";

import { createHomeWidgetProps, type HomeWidgetProps } from "./projection";

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

/** 준비된 입력을 저장한다. 세션 종료·쓰기 순서는 기기 동기화 세션이 보호한다. */
export function applyHomeWidget(input: DeviceSyncInput | null): void {
  const t = appI18n.t;
  homeWidget.updateSnapshot(
    input
      ? createHomeWidgetProps({
          language: input.language,
          logs: input.completionLogs,
          now: input.now,
          schedules: input.items,
          t,
          timezone: input.timezone,
        })
      : {
          emptyMessage: t("home.widget.login"),
          items: [],
          moreMedium: "",
          moreSmall: "",
        }
  );
}
