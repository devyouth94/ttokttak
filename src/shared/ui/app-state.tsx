import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { useAppThemeColors } from "~/shared/theme/theme-context";
import { borderRadius, spacing, typography } from "~/shared/ui/tokens";

import { AppText } from "./app-text";

type AppStateAction = {
  accessibilityHint?: string;
  accessibilityLabel?: string;
  icon?: ReactNode;
  label: string;
  onPress: () => void;
};

type AppStateViewProps = {
  action?: AppStateAction;
  description?: string;
  icon?: ReactNode;
  style?: StyleProp<ViewStyle>;
  title: string;
};

type AppStatePanelVariant = "dashed" | "outline" | "surface";

type AppStatePanelProps = AppStateViewProps & {
  minHeight?: number;
  panelStyle?: StyleProp<ViewStyle>;
  variant?: AppStatePanelVariant;
};

type AppRetryStateViewProps = Omit<AppStateViewProps, "action"> & {
  retryAccessibilityHint: string;
  retryAccessibilityLabel?: string;
  retryIcon?: ReactNode;
  onRetry: () => void;
};

type AppRetryStatePanelProps = Omit<AppStatePanelProps, "action"> & {
  retryAccessibilityHint: string;
  retryAccessibilityLabel?: string;
  retryIcon?: ReactNode;
  onRetry: () => void;
};

type AppEmptyStateViewProps = {
  action?: AppStateAction;
  style?: StyleProp<ViewStyle>;
  title: string;
};

function AppStateView({
  action,
  description,
  icon,
  style,
  title,
}: AppStateViewProps): React.JSX.Element {
  const themeColors = useAppThemeColors();

  return (
    <View style={[styles.state, style]}>
      {icon ? (
        <View
          style={[styles.iconWrap, { backgroundColor: themeColors.surface }]}
        >
          {icon}
        </View>
      ) : null}

      <View style={styles.copy}>
        <AppText
          style={[styles.title, { color: themeColors.text }]}
          variant="title"
        >
          {title}
        </AppText>
        {description ? (
          <AppText
            style={[styles.description, { color: themeColors.textMuted }]}
          >
            {description}
          </AppText>
        ) : null}
      </View>

      {action ? (
        <Pressable
          accessibilityHint={action.accessibilityHint}
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.action,
            { borderColor: themeColors.border },
            pressed ? styles.pressed : undefined,
          ]}
        >
          {action.icon}
          <AppText
            style={[styles.actionText, { color: themeColors.text }]}
            variant="label"
          >
            {action.label}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function AppRetryStateView({
  description,
  icon,
  retryAccessibilityHint,
  retryAccessibilityLabel,
  retryIcon,
  onRetry,
  style,
  title,
}: AppRetryStateViewProps): React.JSX.Element {
  return (
    <AppStateView
      action={{
        accessibilityHint: retryAccessibilityHint,
        accessibilityLabel: retryAccessibilityLabel,
        icon: retryIcon,
        label: "다시 시도",
        onPress: onRetry,
      }}
      description={description}
      icon={icon}
      style={style}
      title={title}
    />
  );
}

export function AppStatePanel({
  action,
  description,
  icon,
  minHeight = 120,
  panelStyle,
  style,
  title,
  variant = "outline",
}: AppStatePanelProps): React.JSX.Element {
  const themeColors = useAppThemeColors();
  const variantStyle =
    variant === "surface"
      ? { backgroundColor: themeColors.surface }
      : variant === "dashed"
        ? {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          }
        : { borderColor: themeColors.border };

  return (
    <View style={[styles.panel, styles[variant], variantStyle, panelStyle]}>
      <AppStateView
        action={action}
        description={description}
        icon={icon}
        style={[styles.panelState, { minHeight }, style]}
        title={title}
      />
    </View>
  );
}

export function AppRetryStatePanel({
  description,
  icon,
  minHeight,
  panelStyle,
  retryAccessibilityHint,
  retryAccessibilityLabel,
  retryIcon,
  onRetry,
  style,
  title,
  variant,
}: AppRetryStatePanelProps): React.JSX.Element {
  return (
    <AppStatePanel
      action={{
        accessibilityHint: retryAccessibilityHint,
        accessibilityLabel: retryAccessibilityLabel,
        icon: retryIcon,
        label: "다시 시도",
        onPress: onRetry,
      }}
      description={description}
      icon={icon}
      minHeight={minHeight}
      panelStyle={panelStyle}
      style={style}
      title={title}
      variant={variant}
    />
  );
}

export function AppEmptyStateView({
  action,
  style,
  title,
}: AppEmptyStateViewProps): React.JSX.Element {
  const themeColors = useAppThemeColors();

  return (
    <View style={[styles.emptyState, style]}>
      <AppText
        style={[styles.emptyTitle, { color: themeColors.textMuted }]}
        variant="body"
      >
        {title}
      </AppText>

      {action ? (
        <Pressable
          accessibilityHint={action.accessibilityHint}
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          accessibilityRole="button"
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.emptyAction,
            { backgroundColor: themeColors.primary },
            pressed ? styles.pressed : undefined,
          ]}
        >
          {action.icon}
          <AppText
            style={[
              styles.emptyActionText,
              { color: themeColors.primaryForeground },
            ]}
            variant="body3"
          >
            {action.label}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionText: {
    fontSize: typography.label,
    letterSpacing: 0,
  },
  copy: {
    alignItems: "center",
    gap: spacing.xs,
  },
  dashed: {
    borderRadius: borderRadius.lg,
    borderStyle: "dashed",
    borderWidth: 1,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  emptyAction: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    flexDirection: "row",
    gap: spacing.xs,
    height: 36,
    minHeight: 36,
    paddingHorizontal: spacing.lg,
  },
  emptyActionText: {
    letterSpacing: 0,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    textAlign: "center",
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: borderRadius.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  outline: {
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  panel: {
    justifyContent: "center",
  },
  panelState: {
    flex: 0,
  },
  pressed: {
    opacity: 0.88,
  },
  state: {
    alignItems: "center",
    flex: 1,
    gap: spacing.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  surface: {},
  title: {
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
  },
});
