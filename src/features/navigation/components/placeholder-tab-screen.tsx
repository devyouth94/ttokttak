import { StyleSheet, View } from "react-native";

import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import { colors, spacing, typography } from "~/design-system/tokens";

type PlaceholderTabScreenProps = {
  description: string;
  title: string;
};

export function PlaceholderTabScreen({
  description,
  title,
}: PlaceholderTabScreenProps): React.JSX.Element {
  return (
    <AppScreen contentStyle={styles.screenContent}>
      <View style={styles.content}>
        <AppText style={styles.title} variant="display">
          {title}
        </AppText>
        <AppText style={styles.description}>{description}</AppText>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: spacing.xxl,
  },
  screenContent: {
    paddingHorizontal: spacing.lg,
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 24,
    textAlign: "center",
  },
  title: {
    color: colors.text,
    marginBottom: spacing.sm,
  },
});
