import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { router } from "expo-router";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { format } from "date-fns/format";

import { useAppLanguage } from "~/i18n/provider";
import { useNotifications } from "~/notifications/provider";
import { getScheduleReturnPath } from "~/route-param";
import { useScheduleById } from "~/schedule/query";
import {
  archiveSchedule,
  createSchedule,
  updateSchedule,
} from "~/schedule/write";
import { useSession } from "~/session/provider";

import {
  createFormSchema,
  createFormValues,
  type ScheduleFormValues,
  toFormValues,
  toScheduleInput,
} from "./form-values";

type Params = {
  itemId?: string;
  returnTo?: string;
};

/** 일정 생성·수정 화면의 초기화와 저장·삭제를 관리한다. */
export function useScheduleForm({ itemId, returnTo }: Params) {
  const { t } = useTranslation();
  const { language } = useAppLanguage();
  const { syncNotifications } = useNotifications();
  const { profile, user } = useSession();

  const isEdit = Boolean(itemId);
  const schedule = useScheduleById(isEdit ? (itemId ?? null) : null);
  const hydratedItemIdRef = useRef(schedule.item?.id ?? null);

  const [openedAt] = useState(() => new Date());
  const [isDeleting, setIsDeleting] = useState(false);

  const today = format(openedAt, "yyyy-MM-dd");

  const schema = useMemo(
    () => createFormSchema({ isEdit, language, today }),
    [isEdit, language, today]
  );

  const form = useForm<ScheduleFormValues>({
    defaultValues: schedule.item
      ? toFormValues(schedule.item)
      : createFormValues(openedAt),
    mode: "onSubmit",
    reValidateMode: "onChange",
    resolver: standardSchemaResolver(schema),
  });
  const { isDirty, isSubmitting } = form.formState;
  const reset = form.reset;

  async function save(formValues: ScheduleFormValues): Promise<void> {
    if (!profile || !user) {
      Alert.alert(
        t("scheduleForm.saveUnavailable.title"),
        t("scheduleForm.saveUnavailable.message")
      );
      return;
    }

    const input = toScheduleInput(formValues);

    form.clearErrors("root");

    try {
      if (isEdit && itemId) {
        await updateSchedule({
          itemId,
          patch: {
            anchorType: input.anchorType,
            colorHex: input.colorHex,
            description: input.description,
            endDateLocal: input.endDateLocal,
            intervalValue: input.intervalValue,
            notificationsEnabled: input.notificationsEnabled,
            recurrenceType: input.recurrenceType,
            reminderTimeLocal: input.reminderTimeLocal,
            title: input.title,
            weekdayMask: input.weekdayMask,
          },
          syncNotifications,
          timezone: schedule.timezone,
          userId: user.id,
        });
      } else {
        await createSchedule({
          input,
          syncNotifications,
          timezone: schedule.timezone,
          userId: user.id,
        });
      }

      router.replace(getScheduleReturnPath(returnTo));
    } catch (saveError) {
      form.setError("root", { message: errorMessage(saveError) });
    }
  }

  function submit(): void {
    if (isDeleting || isSubmitting) {
      return;
    }

    void form.handleSubmit(save, () => {
      form.setError("root", {
        message: t("scheduleForm.error.checkInput"),
      });
    })();
  }

  function remove(): void {
    if (!isEdit || !itemId || !user || isDeleting || isSubmitting) {
      return;
    }

    Alert.alert(
      t("scheduleForm.deleteAlert.title"),
      t("scheduleForm.deleteAlert.message"),
      [
        {
          style: "cancel",
          text: t("scheduleForm.deleteAlert.cancel"),
        },
        {
          style: "destructive",
          text: t("scheduleForm.deleteAlert.confirm"),
          onPress: () => void confirmRemove(itemId),
        },
      ]
    );
  }

  async function confirmRemove(currentItemId: string): Promise<void> {
    setIsDeleting(true);
    form.clearErrors("root");

    try {
      await archiveSchedule({
        itemId: currentItemId,
        syncNotifications,
      });

      router.replace("/");
    } catch (removeError) {
      form.setError("root", { message: errorMessage(removeError) });
    } finally {
      setIsDeleting(false);
    }
  }

  // 최초 조회와 다른 일정으로의 이동은 반영하되 같은 일정의 dirty draft는 보존한다.
  useEffect(() => {
    if (!isEdit || !schedule.item) {
      return;
    }

    const isDifferentItem = hydratedItemIdRef.current !== schedule.item.id;

    if (!isDifferentItem && isDirty) {
      return;
    }

    reset(toFormValues(schedule.item));
    hydratedItemIdRef.current = schedule.item.id;
  }, [isDirty, isEdit, reset, schedule.item]);

  const loadError =
    isEdit && !schedule.isLoading
      ? schedule.error
        ? errorMessage(schedule.error)
        : !schedule.isReady
          ? t("scheduleForm.error.editLoadFailed")
          : null
      : null;

  return {
    form,
    isDeleting,
    isEdit,
    isLoading: isEdit && schedule.isLoading,
    loadError,
    remove,
    submit,
    today,
  } as const;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
