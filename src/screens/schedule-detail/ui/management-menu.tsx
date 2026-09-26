import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import * as DropdownMenu from "@rn-primitives/dropdown-menu";
import { EllipsisVertical } from "lucide-react-native";

import { useDeviceSync } from "~/device-sync";
import { getScheduleReturnPath } from "~/route-param";
import type { Schedule } from "~/schedule/schedule";
import { archiveSchedule } from "~/schedule/write";
import { useThemeColors } from "~/theme/provider";
import { AppText } from "~/ui/app-text";
import { borderRadius, spacing } from "~/ui/tokens";

type DetailManagementMenuProps = {
  item: Schedule;
  returnTo?: string;
};

export function DetailManagementMenu({
  item,
  returnTo,
}: DetailManagementMenuProps): React.JSX.Element {
  const { t } = useTranslation();
  const { syncDeviceOutputs } = useDeviceSync();
  const themeColors = useThemeColors();

  const [isArchiving, setIsArchiving] = useState(false);

  function handleEdit(): void {
    if (isArchiving) {
      return;
    }

    router.push({
      params: {
        itemId: item.id,
        ...(returnTo ? { returnTo } : {}),
      },
      pathname: "/items/[itemId]/edit",
    });
  }

  async function handleDeleteConfirm(): Promise<void> {
    if (isArchiving) {
      return;
    }

    setIsArchiving(true);

    try {
      await archiveSchedule({ itemId: item.id, syncDeviceOutputs });
      router.replace(getScheduleReturnPath(returnTo));
    } catch {
      Alert.alert(t("scheduleDetail.inlineErrorTitle"), t("error.tryAgain"));
    } finally {
      setIsArchiving(false);
    }
  }

  function handleDelete(): void {
    if (isArchiving) {
      return;
    }

    Alert.alert(
      t("scheduleDetail.deleteAlert.title"),
      t("scheduleDetail.deleteAlert.message"),
      [
        {
          style: "cancel",
          text: t("scheduleDetail.deleteAlert.cancel"),
        },
        {
          onPress: () => {
            void handleDeleteConfirm();
          },
          style: "destructive",
          text: t("scheduleDetail.deleteAlert.confirm"),
        },
      ]
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Pressable
          accessibilityHint={t("scheduleDetail.management.menuHint")}
          accessibilityLabel={t("scheduleDetail.management.menuLabel")}
          accessibilityRole="button"
          disabled={isArchiving}
          style={({ pressed }) => [
            styles.button,
            isArchiving && styles.disabled,
            pressed && !isArchiving && styles.pressed,
          ]}
        >
          <EllipsisVertical color={themeColors.text} size={20} />
        </Pressable>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Overlay closeOnPress style={StyleSheet.absoluteFill} />
        <DropdownMenu.Content
          align="end"
          avoidCollisions
          insets={{
            bottom: spacing.lg,
            left: spacing.md,
            right: spacing.md,
            top: spacing.lg,
          }}
          side="bottom"
          sideOffset={2}
          style={StyleSheet.flatten([
            styles.content,
            { backgroundColor: themeColors.surface },
          ])}
        >
          {item.contentStatus !== "unrecoverable" && (
            <DropdownMenu.Item
              accessibilityHint={t("scheduleDetail.management.editHint")}
              closeOnPress
              onPress={handleEdit}
              style={styles.item}
            >
              <AppText
                numberOfLines={1}
                style={[styles.text, { color: themeColors.text }]}
                variant="label"
              >
                {t("scheduleDetail.management.edit")}
              </AppText>
            </DropdownMenu.Item>
          )}

          <DropdownMenu.Item
            accessibilityHint={t("scheduleDetail.management.deleteHint")}
            closeOnPress
            onPress={handleDelete}
            style={styles.item}
          >
            <AppText
              numberOfLines={1}
              style={[styles.text, { color: themeColors.error }]}
              variant="label"
            >
              {t("scheduleDetail.management.delete")}
            </AppText>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  content: {
    borderRadius: borderRadius.lg,
    padding: 4,
    width: 80,
  },
  disabled: {
    opacity: 0.4,
  },
  item: {
    alignItems: "center",
    borderRadius: borderRadius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.88,
  },
  text: {
    flex: 1,
    textAlign: "center",
  },
});
