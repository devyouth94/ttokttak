import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";

import { AppCard } from "~/design-system/components/app-card";
import { AppScreen } from "~/design-system/components/app-screen";
import { AppText } from "~/design-system/components/app-text";
import {
  borderRadius,
  colors,
  spacing,
  typography,
} from "~/design-system/tokens";
import type { RecurringItem } from "~/features/recurring/domain/types";
import { listRecurringItems } from "~/features/recurring/repositories/recurring-items-repository";
import { LoginScreen } from "~/features/session/components/login-screen";
import { useSession } from "~/features/session/session-provider";

function getRecurrenceLabel(item: RecurringItem): string {
  switch (item.recurrenceType) {
    case "once":
      return "한 번";
    case "daily":
      return "매일";
    case "interval_days":
      return `${item.intervalValue ?? 1}일마다`;
    case "weekly":
      return "매주";
    case "interval_weeks":
      return `${item.intervalValue ?? 1}주마다`;
    case "monthly":
      return "매달";
    case "interval_months":
      return `${item.intervalValue ?? 1}달마다`;
    case "yearly":
      return "매년";
    default:
      return item.recurrenceType;
  }
}

function getAnchorLabel(item: RecurringItem): string {
  return item.anchorType === "fixed" ? "고정형" : "완료 기준";
}

export default function IndexScreen(): React.JSX.Element {
  const {
    errorMessage,
    isAuthenticated,
    isConfigured,
    isLoading,
    profile,
    signInWithApple,
    signInWithGoogle,
    signOut,
    user,
  } = useSession();

  const [items, setItems] = useState<RecurringItem[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !profile || !user) {
      setItems([]);
      setItemsError(null);
      setIsItemsLoading(false);
      return;
    }

    let isMounted = true;

    const loadItems = async () => {
      setIsItemsLoading(true);
      setItemsError(null);

      try {
        const nextItems = await listRecurringItems({
          timezone: profile.timezone,
          userId: user.id,
        });

        if (!isMounted) {
          return;
        }

        setItems(nextItems);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setItemsError(
          error instanceof Error
            ? error.message
            : "항목 목록을 불러오는 중 오류가 발생했습니다."
        );
      } finally {
        if (isMounted) {
          setIsItemsLoading(false);
        }
      }
    };

    void loadItems();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, profile, user]);

  if (!isAuthenticated) {
    return (
      <LoginScreen
        isConfigured={isConfigured}
        onApplePress={signInWithApple}
        onGooglePress={signInWithGoogle}
      />
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "로그아웃 중 오류가 발생했습니다.";

      Alert.alert("로그아웃 실패", message);
    }
  };

  return (
    <AppScreen>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <AppText style={styles.title} variant="display">
              똑딱
            </AppText>
            <AppText style={styles.subtitle}>
              10단계 항목 설정 화면과 저장 흐름이 연결된 상태입니다.
            </AppText>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={handleSignOut}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.secondaryButtonPressed,
            ]}
          >
            <AppText style={styles.secondaryButtonText}>로그아웃</AppText>
          </Pressable>
        </View>

        <AppCard>
          <AppText variant="label">프로필</AppText>
          <AppText variant="title">
            {profile
              ? `${profile.display_name ?? "사용자"} 님의 리마인더`
              : "프로필을 준비하는 중입니다."}
          </AppText>
          {user?.email ? (
            <AppText style={styles.description}>이메일: {user.email}</AppText>
          ) : null}
          {profile ? (
            <AppText style={styles.description}>
              시간대: {profile.timezone}
            </AppText>
          ) : null}
        </AppCard>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push("/items/new");
            }}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
          >
            <AppText style={styles.primaryButtonText}>새 항목 추가</AppText>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <AppText variant="title">등록된 항목</AppText>
          <AppText style={styles.sectionMeta}>
            {isItemsLoading ? "불러오는 중" : `${items.length}개`}
          </AppText>
        </View>

        {isLoading ? (
          <AppCard>
            <AppText style={styles.description}>
              세션을 확인하는 중입니다.
            </AppText>
          </AppCard>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorCard}>
            <AppText style={styles.errorTitle} variant="title">
              세션 오류
            </AppText>
            <AppText style={styles.errorText}>{errorMessage}</AppText>
          </View>
        ) : null}

        {itemsError ? (
          <View style={styles.errorCard}>
            <AppText style={styles.errorTitle} variant="title">
              목록 오류
            </AppText>
            <AppText style={styles.errorText}>{itemsError}</AppText>
          </View>
        ) : null}

        {isItemsLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={colors.primary} />
            <AppText style={styles.description}>
              항목 목록을 불러오는 중입니다.
            </AppText>
          </View>
        ) : null}

        {!isItemsLoading && items.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppText style={styles.emptyEyebrow}>시작하기</AppText>
            <AppText style={styles.emptyTitle} variant="title">
              아직 등록된 항목이 없습니다.
            </AppText>
            <AppText style={styles.description}>
              약 복용, 교체 주기, 생활 루틴을 새 항목으로 바로 추가할 수
              있습니다.
            </AppText>
          </View>
        ) : null}

        {items.map((item) => (
          <Pressable
            accessibilityRole="button"
            key={item.id}
            onPress={() => {
              router.push(`/items/${item.id}`);
            }}
            style={({ pressed }) => [
              styles.itemCard,
              pressed && styles.itemCardPressed,
            ]}
          >
            <View style={styles.itemHeader}>
              <View style={styles.itemTitleGroup}>
                <AppText style={styles.itemTitle} variant="title">
                  {item.title}
                </AppText>
                <AppText style={styles.description}>
                  {item.category ?? "카테고리 없음"}
                </AppText>
              </View>
              <View style={styles.badge}>
                <AppText style={styles.badgeText}>
                  {getAnchorLabel(item)}
                </AppText>
              </View>
            </View>

            {item.description ? (
              <AppText style={styles.itemDescription}>
                {item.description}
              </AppText>
            ) : null}

            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <AppText style={styles.metaChipText}>
                  {getRecurrenceLabel(item)}
                </AppText>
              </View>
              <View style={styles.metaChip}>
                <AppText style={styles.metaChipText}>
                  {item.startDateLocal}
                </AppText>
              </View>
              <View style={styles.metaChip}>
                <AppText style={styles.metaChipText}>
                  {item.reminderTimeLocal}
                </AppText>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    width: "100%",
  },
  badge: {
    borderRadius: borderRadius.pill,
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeText: {
    color: colors.secondaryForeground,
    fontSize: typography.label,
    fontWeight: "700",
  },
  description: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  emptyCard: {
    width: "100%",
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.tertiaryContainer,
    padding: spacing.lg,
  },
  emptyEyebrow: {
    color: colors.tertiary,
    fontSize: typography.label,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  emptyTitle: {
    color: colors.text,
  },
  errorCard: {
    width: "100%",
    gap: spacing.xs,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.errorContainer,
    padding: spacing.lg,
  },
  errorText: {
    color: colors.error,
  },
  errorTitle: {
    color: colors.error,
  },
  header: {
    width: "100%",
    gap: spacing.md,
  },
  headerCopy: {
    gap: spacing.xs,
  },
  itemCard: {
    width: "100%",
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 2,
  },
  itemCardPressed: {
    opacity: 0.9,
  },
  itemDescription: {
    color: colors.textMuted,
    lineHeight: 22,
  },
  itemHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "space-between",
  },
  itemTitle: {
    color: colors.text,
  },
  itemTitleGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  loadingCard: {
    alignItems: "center",
    gap: spacing.sm,
    width: "100%",
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    padding: spacing.lg,
  },
  metaChip: {
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  metaChipText: {
    color: colors.text,
    fontSize: typography.label,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonText: {
    color: colors.primaryForeground,
    fontSize: typography.body,
    fontWeight: "700",
  },
  scrollContent: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  sectionMeta: {
    color: colors.textMuted,
    fontSize: typography.label,
  },
  secondaryButton: {
    alignSelf: "flex-start",
    borderRadius: borderRadius.pill,
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  secondaryButtonPressed: {
    opacity: 0.85,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: "600",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 22,
  },
  title: {
    color: colors.text,
    textAlign: "left",
  },
});
