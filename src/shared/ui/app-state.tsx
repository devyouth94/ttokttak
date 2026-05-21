import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { borderRadius, colors, spacing, typography } from "~/shared/ui/tokens";

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
  return (
    <View style={[styles.state, style]}>
      {icon ? <View style={styles.iconWrap}>{icon}</View> : null}

      <View style={styles.copy}>
        <AppText style={styles.title} variant="title">
          {title}
        </AppText>
        {description ? (
          <AppText style={styles.description}>{description}</AppText>
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
            pressed ? styles.pressed : undefined,
          ]}
        >
          {action.icon}
          <AppText style={styles.actionText} variant="label">
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
  return (
    <View style={[styles.panel, styles[variant], panelStyle]}>
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
  return (
    <View style={[styles.emptyState, style]}>
      <AppText style={styles.emptyTitle} variant="body">
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
            pressed ? styles.pressed : undefined,
          ]}
        >
          {action.icon}
          <AppText style={styles.emptyActionText} variant="body3">
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
    borderColor: colors.dividerOnPrimary,
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  actionText: {
    color: colors.text,
    fontSize: typography.label,
    letterSpacing: 0,
  },
  copy: {
    alignItems: "center",
    gap: spacing.xs,
  },
  dashed: {
    backgroundColor: colors.surface,
    borderColor: colors.dividerOnPrimary,
    borderRadius: borderRadius.lg,
    borderStyle: "dashed",
    borderWidth: 1,
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  emptyAction: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    flexDirection: "row",
    gap: spacing.xs,
    height: 36,
    minHeight: 36,
    paddingHorizontal: spacing.lg,
  },
  emptyActionText: {
    color: colors.primaryForeground,
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
    color: colors.textMuted,
    textAlign: "center",
  },
  iconWrap: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.pill,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  outline: {
    borderColor: colors.dividerOnPrimary,
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
  surface: {
    backgroundColor: colors.surface,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    lineHeight: 24,
    textAlign: "center",
  },
});
