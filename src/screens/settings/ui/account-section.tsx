import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert } from "react-native";

import {
  getEditableProfileDisplayName,
  type ProfileDisplayNameError,
  validateProfileDisplayName,
} from "~/screens/settings/profile-display-name";
import { useSession } from "~/session/provider";

import { NameEditor } from "./name-editor";
import { SettingsSectionCard, SettingsValueRow } from "./settings-screen-rows";

export function AccountSection(): React.JSX.Element {
  const { t } = useTranslation();
  const { profile, updateName, user } = useSession();

  const [isEditorVisible, setIsEditorVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState<ProfileDisplayNameError | null>(
    null
  );

  const profileName = profile?.display_name?.trim();
  const metadataName = user?.user_metadata?.full_name;
  const normalizedMetadataName =
    typeof metadataName === "string" ? metadataName.trim() : "";
  const displayName =
    profileName ||
    normalizedMetadataName ||
    user?.email ||
    t("settings.account.name");
  const email = user?.email ?? t("settings.account.missingEmail");
  const errorMessage =
    nameError === "empty"
      ? t("settings.nameEditor.emptyError")
      : nameError === "tooLong"
        ? t("settings.nameEditor.tooLongError")
        : null;

  function openEditor(): void {
    setNameDraft(
      getEditableProfileDisplayName({
        email: user?.email,
        metadataName:
          typeof metadataName === "string" ? metadataName : undefined,
        profileName,
      })
    );
    setNameError(null);
    setIsEditorVisible(true);
  }

  function closeEditor(): void {
    if (isSaving) {
      return;
    }

    setIsEditorVisible(false);
    setNameError(null);
  }

  async function saveName(): Promise<void> {
    const result = validateProfileDisplayName(nameDraft);

    if (result.value === null) {
      setNameError(result.errorMessage);
      return;
    }

    setIsSaving(true);

    try {
      await updateName(result.value);
      setIsEditorVisible(false);
      setNameError(null);
    } catch {
      Alert.alert(
        t("settings.nameEditor.saveErrorTitle"),
        t("settings.nameEditor.saveErrorMessage")
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <SettingsSectionCard title={t("settings.account.section")}>
        <SettingsValueRow
          isDisabled={isSaving}
          isFirst
          onPress={openEditor}
          title={t("settings.account.name")}
          value={displayName}
        />
        <SettingsValueRow title={t("settings.account.email")} value={email} />
      </SettingsSectionCard>

      <NameEditor
        errorMessage={errorMessage}
        isSaving={isSaving}
        onChange={(value) => {
          setNameDraft(value);
          setNameError(null);
        }}
        onClose={closeEditor}
        onSave={saveName}
        value={nameDraft}
        visible={isEditorVisible}
      />
    </>
  );
}
