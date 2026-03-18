import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useEffect, useState } from 'react';

import { PhotoOverlayEditorSurface } from '@/src/components/photo-preview';
import { ChipButton, GradientButton, OutlineButton } from '@/src/components/ui';
import { colors, fonts, radii, spacing, typography } from '@/src/theme';
import { OBSCURE_OPTIONS, type PhotoObscuration } from '@/src/types';
import {
  OVERLAY_COLOR_PRESETS,
  OVERLAY_OPACITY_PRESETS,
  OVERLAY_TYPE_OPTIONS,
  createPhotoObscuration,
  syncPhotoObscuration,
} from '@/src/utils/obscure';

export function ImageEditorModal({
  visible,
  title,
  imageUri,
  seed,
  value,
  onClose,
  onSave,
  onInteractionChange,
}: {
  visible: boolean;
  title: string;
  imageUri?: string;
  seed: string;
  value: PhotoObscuration;
  onClose: () => void;
  onSave: (value: PhotoObscuration) => void;
  onInteractionChange?: (active: boolean) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [editorInteracting, setEditorInteracting] = useState(false);

  useEffect(() => {
    if (visible) {
      setDraft(value);
      setEditorInteracting(false);
    }
  }, [value, visible]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Image Editor</Text>
            <Text style={styles.title}>{title}</Text>
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          scrollEnabled={!editorInteracting}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <PhotoOverlayEditorSurface
            uri={imageUri}
            settings={draft}
            onChange={setDraft}
            seed={seed}
            onInteractionChange={(active) => {
              setEditorInteracting(active);
              onInteractionChange?.(active);
            }}
          />

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Coverage</Text>
            <View style={styles.stack}>
              {OBSCURE_OPTIONS.map((option) => (
                <ChipButton
                  key={option.id}
                  label={`${option.icon} ${option.label}`}
                  sublabel={option.description}
                  active={draft.mode === option.id}
                  onPress={() =>
                    setDraft((current) => {
                      const next = createPhotoObscuration(option.id);
                      return {
                        ...next,
                        overlayColor: current.overlayColor,
                        opacity:
                          option.id === 'none'
                            ? 0
                            : current.opacity > 0
                              ? current.opacity
                              : next.opacity,
                      };
                    })
                  }
                />
              ))}
            </View>
          </View>

          {draft.mode !== 'none' ? (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Overlay Type</Text>
                <View style={styles.row}>
                  {OVERLAY_TYPE_OPTIONS.map((option) => (
                    <ChipButton
                      key={option.id}
                      label={option.label}
                      active={draft.overlayType === option.id}
                      onPress={() =>
                        setDraft((current) =>
                          syncPhotoObscuration(current, {
                            overlayType: option.id,
                          })
                        )
                      }
                      style={styles.half}
                    />
                  ))}
                </View>
              </View>

              {draft.overlayType === 'mask' ? (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Overlay Color</Text>
                  <View style={styles.colorRow}>
                    {OVERLAY_COLOR_PRESETS.map((colorValue) => (
                      <Pressable
                        key={colorValue}
                        onPress={() =>
                          setDraft((current) =>
                            syncPhotoObscuration(current, {
                              overlayColor: colorValue,
                            })
                          )
                        }
                        style={[
                          styles.colorSwatch,
                          { backgroundColor: colorValue },
                          draft.overlayColor === colorValue && styles.colorSwatchActive,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Opacity</Text>
                <View style={styles.row}>
                  {OVERLAY_OPACITY_PRESETS.map((valuePreset) => (
                    <ChipButton
                      key={valuePreset}
                      label={`${Math.round(valuePreset * 100)}%`}
                      active={Math.abs(draft.opacity - valuePreset) < 0.01}
                      onPress={() =>
                        setDraft((current) =>
                          syncPhotoObscuration(current, {
                            opacity: valuePreset,
                          })
                        )
                      }
                      style={styles.third}
                    />
                  ))}
                </View>
              </View>
            </>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <OutlineButton label="Cancel" onPress={onClose} style={styles.footerButton} />
          <GradientButton
            label="Save Changes"
            onPress={() => {
              onSave(draft);
              onClose();
            }}
            style={styles.footerButton}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  eyebrow: {
    ...typography.label,
    color: colors.textLight,
  },
  title: {
    fontFamily: fonts.display.light,
    fontSize: 26,
    color: colors.text,
    marginTop: 4,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textLight,
  },
  stack: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  half: {
    flex: 1,
    minWidth: 0,
  },
  third: {
    flex: 1,
    minWidth: 0,
  },
  colorRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSwatchActive: {
    borderColor: colors.copper,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.bg,
  },
  footerButton: {
    flex: 1,
  },
});
