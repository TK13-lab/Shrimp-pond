import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { ApiError } from '../../api/httpClient';
import {
  createMaterial,
  disableMaterial,
  updateMaterial
} from '../../api/materialApi';
import { useAuth } from '../../auth/useAuth';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'MaterialForm'>;

export function MaterialFormScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const editingMaterial = route.params?.material;
  const isEditing = Boolean(editingMaterial);

  const [name, setName] = useState(editingMaterial?.name ?? '');
  const [defaultUnit, setDefaultUnit] = useState(editingMaterial?.defaultUnit ?? '');
  const [note, setNote] = useState(editingMaterial?.note ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const validationMessage = useMemo(() => {
    if (!name.trim()) {
      return 'Tên vật tư là bắt buộc';
    }

    if (!defaultUnit.trim()) {
      return 'Đơn vị tính mặc định là bắt buộc';
    }

    return null;
  }, [defaultUnit, name]);

  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? 'Chỉnh sửa vật tư' : 'Thêm vật tư'
    });
  }, [isEditing, navigation]);

  async function handleSave() {
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    try {
      const payload = {
        name,
        defaultUnit,
        note
      };

      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, payload);
      } else {
        await createMaterial(payload);
      }

      navigation.goBack();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Không thể lưu vật tư. Vui lòng thử lại.');
      }
    } finally {
      setIsSaving(false);
    }
  }

  function handleDisableConfirm() {
    if (!editingMaterial) {
      return;
    }

    Alert.alert(
      'Ngừng sử dụng vật tư',
      'Vật tư sẽ không còn hiển thị cho nhân viên khi tạo phiếu nhập. Bạn có chắc không?',
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Ngừng dùng',
          style: 'destructive',
          onPress: () => {
            void handleDisable();
          }
        }
      ]
    );
  }

  async function handleDisable() {
    if (!editingMaterial) {
      return;
    }

    setErrorMessage(null);
    setIsDisabling(true);

    try {
      await disableMaterial(editingMaterial.id);
      navigation.goBack();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Không thể ngừng sử dụng vật tư. Vui lòng thử lại.');
      }
    } finally {
      setIsDisabling(false);
    }
  }

  if (user?.role !== 'ADMIN') {
    return (
      <View style={styles.blockedContainer}>
        <Text style={styles.blockedTitle}>Không có quyền thao tác</Text>
        <Text style={styles.blockedText}>
          Chỉ quản trị viên mới có thể thêm hoặc chỉnh sửa vật tư trong giai đoạn này.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.label}>Tên vật tư</Text>
          <TextInput
            onChangeText={setName}
            placeholder="Ví dụ: Thức ăn CP 9001"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={name}
          />

          <Text style={styles.label}>Đơn vị tính mặc định</Text>
          <TextInput
            onChangeText={setDefaultUnit}
            placeholder="Ví dụ: bao"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={defaultUnit}
          />

          <Text style={styles.label}>Ghi chú</Text>
          <TextInput
            multiline
            numberOfLines={4}
            onChangeText={setNote}
            placeholder="Ví dụ: Bao 25kg"
            placeholderTextColor="#94a3b8"
            style={[styles.input, styles.noteInput]}
            textAlignVertical="top"
            value={note}
          />

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <Pressable
            disabled={isSaving || isDisabling}
            onPress={() => void handleSave()}
            style={[
              styles.primaryButton,
              (isSaving || isDisabling) && styles.primaryButtonDisabled
            ]}
          >
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isEditing ? 'Lưu thay đổi' : 'Tạo vật tư'}
              </Text>
            )}
          </Pressable>
        </View>

        {editingMaterial?.isActive ? (
          <Pressable
            disabled={isSaving || isDisabling}
            onPress={handleDisableConfirm}
            style={[
              styles.disableButton,
              (isSaving || isDisabling) && styles.disableButtonDisabled
            ]}
          >
            {isDisabling ? (
              <ActivityIndicator color="#991b1b" />
            ) : (
              <Text style={styles.disableButtonText}>Ngừng sử dụng</Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb'
  },
  content: {
    padding: 20
  },
  section: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 20
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a'
  },
  input: {
    marginBottom: 14,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a'
  },
  noteInput: {
    minHeight: 120
  },
  errorText: {
    marginBottom: 8,
    fontSize: 14,
    color: '#b91c1c'
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButtonDisabled: {
    backgroundColor: '#94a3b8'
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff'
  },
  disableButton: {
    marginTop: 16,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  disableButtonDisabled: {
    borderColor: '#cbd5e1'
  },
  disableButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#991b1b'
  },
  blockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f4f7fb'
  },
  blockedTitle: {
    marginBottom: 10,
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a'
  },
  blockedText: {
    maxWidth: 320,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#475569'
  }
});
