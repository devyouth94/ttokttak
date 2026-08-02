import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Pencil } from "lucide-react-native";

import { AppText } from "~/ui/app-text";

import type { SettingsScreenStyles } from "./settings-screen-styles";

type SectionTitleProps = {
  styles: SettingsScreenStyles;
  title: string;
};

type SettingsSectionCardProps = {
  children: ReactNode;
  styles: SettingsScreenStyles;
  title: string;
};

type SettingsRowProps = {
  accessory?: ReactNode;
  description?: string;
  isDisabled?: boolean;
  isFirst?: boolean;
  isPressable?: boolean;
  styles: SettingsScreenStyles;
  onPress?: () => void;
  tone?: "default" | "danger";
  title: string;
};

type SettingsValueRowProps = {
  iconColor: string;
  isFirst?: boolean;
  isPressable?: boolean;
  styles: SettingsScreenStyles;
  onPress?: () => void;
  title: string;
  value: string;
};

type SettingsControlRowProps = {
  accessory: ReactNode;
  description?: string;
  isFirst?: boolean;
  styles: SettingsScreenStyles;
  title: string;
};

function SectionTitle({ styles, title }: SectionTitleProps): React.JSX.Element {
  return (
    <AppText style={styles.sectionTitle} variant="caption">
      {title}
    </AppText>
  );
}

export function SettingsSectionCard({
  children,
  styles,
  title,
}: SettingsSectionCardProps): React.JSX.Element {
  return (
    <View style={styles.sectionCard}>
      <SectionTitle styles={styles} title={title} />

      <View>{children}</View>
    </View>
  );
}

export function SettingsRow({
  accessory,
  description,
  isDisabled = false,
  isFirst = false,
  isPressable = false,
  styles,
  onPress,
  tone = "default",
  title,
}: SettingsRowProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole={isPressable ? "button" : undefined}
      disabled={!isPressable || isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isFirst ? styles.rowDivider : undefined,
        isDisabled ? styles.rowDisabled : undefined,
        isPressable && !isDisabled && pressed ? styles.rowPressed : undefined,
      ]}
    >
      <View style={styles.rowContent}>
        <AppText
          style={[
            styles.rowTitle,
            tone === "danger" ? styles.dangerText : null,
          ]}
          variant="body3"
        >
          {title}
        </AppText>
        {description && (
          <AppText style={styles.rowDescription} variant="body3">
            {description}
          </AppText>
        )}
      </View>

      {accessory && <View style={styles.rowAccessory}>{accessory}</View>}
    </Pressable>
  );
}

export function SettingsControlRow({
  accessory,
  description,
  isFirst = false,
  styles,
  title,
}: SettingsControlRowProps): React.JSX.Element {
  return (
    <View style={[styles.row, !isFirst ? styles.rowDivider : undefined]}>
      <View style={styles.rowContent}>
        <AppText style={styles.rowTitle} variant="body3">
          {title}
        </AppText>
        {description && (
          <AppText style={styles.rowDescription} variant="body3">
            {description}
          </AppText>
        )}
      </View>

      <View style={styles.rowAccessory}>{accessory}</View>
    </View>
  );
}

export function SettingsValueRow({
  iconColor,
  isFirst = false,
  isPressable = false,
  styles,
  onPress,
  title,
  value,
}: SettingsValueRowProps): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole={isPressable ? "button" : undefined}
      disabled={!isPressable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !isFirst ? styles.rowDivider : undefined,
        isPressable && pressed ? styles.rowPressed : undefined,
      ]}
    >
      <AppText style={styles.rowTitle} variant="body3">
        {title}
      </AppText>
      <View style={styles.valueWithIcon}>
        <AppText style={styles.rowValue} variant="body3">
          {value}
        </AppText>
        {isPressable && <Pencil color={iconColor} size={14} />}
      </View>
    </Pressable>
  );
}
