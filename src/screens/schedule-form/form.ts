import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";
import { router } from "expo-router";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { format } from "date-fns/format";

import { useDeviceSync } from "~/device-sync";
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
  const { syncDeviceOutputs } = useDeviceSync();
  const { profile, status: sessionStatus, user } = useSession();
  const timezone =
    profile?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const isEdit = Boolean(itemId);
  const schedule = useScheduleById(isEdit ? (itemId ?? null) : null);
  const item = schedule.data;
  const isLoading =
    isEdit &&
    (sessionStatus === "loading" ||
      (sessionStatus === "ready" && Boolean(user) && schedule.isPending));
  const hydratedItemIdRef = useRef(item?.id ?? null);

  const [openedAt] = useState(() => new Date());
  const [isDeleting, setIsDeleting] = useState(false);

  const today = format(openedAt, "yyyy-MM-dd");

  const schema = useMemo(
    () => createFormSchema({ isEdit, t, today }),
    [isEdit, t, today]
  );

  const form = useForm<ScheduleFormValues>({
    defaultValues: item ? toFormValues(item) : createFormValues(openedAt),
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
          syncDeviceOutputs,
          timezone,
          userId: user.id,
        });
      } else {
        await createSchedule({
          input,
          syncDeviceOutputs,
          timezone,
          userId: user.id,
        });
      }

      router.replace(getScheduleReturnPath(returnTo));
    } catch {
      form.setError("root", { message: t("error.tryAgain") });
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
        syncDeviceOutputs,
      });

      router.replace("/");
    } catch {
      form.setError("root", { message: t("error.tryAgain") });
    } finally {
      setIsDeleting(false);
    }
  }

  // 최초 조회와 다른 일정으로의 이동은 반영하되 같은 일정의 dirty draft는 보존한다.
  useEffect(() => {
    if (!isEdit || !item) {
      return;
    }

    const isDifferentItem = hydratedItemIdRef.current !== item.id;

    if (!isDifferentItem && isDirty) {
      return;
    }

    reset(toFormValues(item));
    hydratedItemIdRef.current = item.id;
  }, [isDirty, isEdit, reset, item]);

  const loadError =
    isEdit && !isLoading
      ? schedule.error
        ? t("scheduleForm.error.editLoadFailed")
        : sessionStatus !== "ready"
          ? t("scheduleForm.error.editLoadFailed")
          : null
      : null;

  return {
    form,
    isDeleting,
    isEdit,
    isLoading,
    loadError,
    remove,
    submit,
    today,
  } as const;
}
