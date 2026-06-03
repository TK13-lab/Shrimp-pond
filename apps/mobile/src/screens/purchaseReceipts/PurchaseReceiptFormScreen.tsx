import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { listMaterials } from '../../api/materialApi';
import {
  createPurchaseReceipt,
  submitPurchaseReceipt
} from '../../api/receiptApi';
import { ROLE_LABELS } from '../../auth/roles';
import { useAuth } from '../../auth/useAuth';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { Material } from '../../types/materials';
import { PurchaseReceiptDetail } from '../../types/purchaseReceipts';
import { generateUuid } from '../../utils/uuid';

type Props = NativeStackScreenProps<RootStackParamList, 'PurchaseReceiptForm'>;

type DraftItem = {
  id: string;
  materialId: string | null;
  materialName: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};

const RECEIPT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function PurchaseReceiptFormScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [receiptDate, setReceiptDate] = useState(createTodayInputValue());
  const [supplierName, setSupplierName] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<DraftItem[]>([createEmptyItem()]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [savedDraft, setSavedDraft] = useState<PurchaseReceiptDetail | null>(null);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: 'Tạo phiếu nhập'
    });
  }, [navigation]);

  const loadMaterials = useCallback(async () => {
    setIsLoadingMaterials(true);

    try {
      const response = await listMaterials({
        active: true
      });

      setMaterials(response.items);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Không thể tải danh mục vật tư');
      }
    } finally {
      setIsLoadingMaterials(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadMaterials();
    }, [loadMaterials])
  );

  const currentSignature = useMemo(
    () =>
      JSON.stringify({
        receiptDate: receiptDate.trim(),
        supplierName: supplierName.trim(),
        note: note.trim(),
        items: items.map((item) => ({
          materialId: item.materialId,
          materialName: item.materialName.trim(),
          quantity: normalizeNumericInput(item.quantity),
          unit: item.unit.trim(),
          unitPrice: normalizeNumericInput(item.unitPrice)
        }))
      }),
    [items, note, receiptDate, supplierName]
  );

  const validationMessage = useMemo(() => {
    if (!RECEIPT_DATE_PATTERN.test(receiptDate.trim())) {
      return 'Ngày nhập phải có định dạng YYYY-MM-DD';
    }

    if (items.length === 0) {
      return 'Phiếu nhập phải có ít nhất 1 dòng vật tư';
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const rowLabel = `Dòng ${index + 1}`;

      if (!item.materialName.trim()) {
        return `${rowLabel}: Tên hàng hóa là bắt buộc`;
      }

      if (!item.unit.trim()) {
        return `${rowLabel}: Đơn vị tính là bắt buộc`;
      }

      const quantity = parseInputNumber(item.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return `${rowLabel}: Số lượng phải lớn hơn 0`;
      }

      const unitPrice = parseInputNumber(item.unitPrice);

      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        return `${rowLabel}: Giá nhập phải từ 0 trở lên`;
      }
    }

    return null;
  }, [items, receiptDate]);

  const totalAmount = useMemo(
    () =>
      items.reduce((sum, item) => {
        const quantity = parseInputNumber(item.quantity);
        const unitPrice = parseInputNumber(item.unitPrice);

        if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
          return sum;
        }

        return sum + quantity * unitPrice;
      }, 0),
    [items]
  );

  const isBusy = isSavingDraft || isSubmitting;
  const hasSavedDraftForCurrentForm =
    savedDraft?.status === 'DRAFT' && savedSignature === currentSignature;
  const hasChangedSinceSave = Boolean(savedDraft && savedSignature !== currentSignature);

  function handleChangeField(
    itemId: string,
    field: keyof Omit<DraftItem, 'id'>,
    value: string | null
  ) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              [field]: value
            }
          : item
      )
    );
    setErrorMessage(null);
    setStatusMessage(null);
  }

  function handleAddEmptyRow() {
    setItems((currentItems) => [...currentItems, createEmptyItem()]);
    setErrorMessage(null);
    setStatusMessage(null);
  }

  function handleAddMaterialRow(material: Material) {
    setItems((currentItems) => [
      ...currentItems,
      {
        id: generateUuid(),
        materialId: material.id,
        materialName: material.name,
        quantity: '',
        unit: material.defaultUnit,
        unitPrice: ''
      }
    ]);
    setErrorMessage(null);
    setStatusMessage(null);
  }

  function handleRemoveRow(itemId: string) {
    setItems((currentItems) => {
      if (currentItems.length === 1) {
        return [createEmptyItem()];
      }

      return currentItems.filter((item) => item.id !== itemId);
    });
    setErrorMessage(null);
    setStatusMessage(null);
  }

  async function handleSaveDraft() {
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    if (hasSavedDraftForCurrentForm) {
      setStatusMessage(`Phiếu nháp ${savedDraft.receiptCode} đã được lưu trước đó.`);
      setErrorMessage(null);
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsSavingDraft(true);

    try {
      const createdReceipt = await createPurchaseReceipt(buildPayload());
      setSavedDraft(createdReceipt);
      setSavedSignature(currentSignature);
      setStatusMessage(`Đã lưu nháp ${createdReceipt.receiptCode}.`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Không thể lưu nháp phiếu nhập. Vui lòng thử lại.');
      }
    } finally {
      setIsSavingDraft(false);
    }
  }

  async function handleSubmit() {
    if (validationMessage) {
      setErrorMessage(validationMessage);
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const draftReceipt =
        hasSavedDraftForCurrentForm && savedDraft
          ? savedDraft
          : await createPurchaseReceipt(buildPayload());

      if (!hasSavedDraftForCurrentForm) {
        setSavedDraft(draftReceipt);
        setSavedSignature(currentSignature);
      }

      const submittedReceipt = await submitPurchaseReceipt(draftReceipt.id);

      setSavedDraft(null);
      setSavedSignature(null);
      resetForm();

      Alert.alert(
        'Gửi duyệt thành công',
        `Phiếu ${submittedReceipt.receiptCode} đã được gửi duyệt.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Không thể gửi duyệt phiếu nhập. Vui lòng thử lại.');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetForm() {
    setReceiptDate(createTodayInputValue());
    setSupplierName('');
    setNote('');
    setItems([createEmptyItem()]);
    setStatusMessage(null);
    setErrorMessage(null);
  }

  function buildPayload() {
    return {
      clientRequestId: generateUuid(),
      receiptDate: receiptDate.trim(),
      supplierName,
      note,
      items: items.map((item) => ({
        materialId: item.materialId,
        materialName: item.materialName.trim(),
        quantity: parseInputNumber(item.quantity),
        unit: item.unit.trim(),
        unitPrice: parseInputNumber(item.unitPrice)
      }))
    };
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
        <View style={styles.header}>
          <Text style={styles.title}>Phiếu nhập vật tư</Text>
          <Text style={styles.subtitle}>
            {user ? `Vai trò: ${ROLE_LABELS[user.role]}` : 'Đang tải người dùng'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin chung</Text>

          <Text style={styles.label}>Ngày nhập</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={(value) => {
              setReceiptDate(value);
              setErrorMessage(null);
              setStatusMessage(null);
            }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={receiptDate}
          />

          <Text style={styles.label}>Nhà cung cấp</Text>
          <TextInput
            onChangeText={(value) => {
              setSupplierName(value);
              setErrorMessage(null);
              setStatusMessage(null);
            }}
            placeholder="Ví dụ: Đại lý vật tư A"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={supplierName}
          />

          <Text style={styles.label}>Ghi chú</Text>
          <TextInput
            multiline
            numberOfLines={4}
            onChangeText={(value) => {
              setNote(value);
              setErrorMessage(null);
              setStatusMessage(null);
            }}
            placeholder="Ghi chú thêm cho phiếu nhập"
            placeholderTextColor="#94a3b8"
            style={[styles.input, styles.noteInput]}
            textAlignVertical="top"
            value={note}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thêm nhanh từ danh mục vật tư</Text>
          {isLoadingMaterials ? (
            <View style={styles.materialStateRow}>
              <ActivityIndicator color="#0f766e" />
              <Text style={styles.materialStateText}>Đang tải vật tư đang dùng...</Text>
            </View>
          ) : materials.length > 0 ? (
            <View style={styles.quickMaterialList}>
              {materials.map((material) => (
                <Pressable
                  key={material.id}
                  disabled={isBusy}
                  onPress={() => handleAddMaterialRow(material)}
                  style={[
                    styles.quickMaterialChip,
                    isBusy && styles.quickMaterialChipDisabled
                  ]}
                >
                  <Text style={styles.quickMaterialName}>{material.name}</Text>
                  <Text style={styles.quickMaterialUnit}>{material.defaultUnit}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.materialStateText}>
              Chưa có vật tư đang hoạt động. Bạn vẫn có thể nhập thủ công từng dòng.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Danh sách hàng hóa</Text>
            <Pressable
              disabled={isBusy}
              onPress={handleAddEmptyRow}
              style={[styles.addRowButton, isBusy && styles.addRowButtonDisabled]}
            >
              <Text style={styles.addRowButtonText}>+ Thêm dòng</Text>
            </Pressable>
          </View>

          {items.map((item, index) => {
            const lineTotal = computeLineTotal(item.quantity, item.unitPrice);

            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>Dòng {index + 1}</Text>
                  <Pressable
                    disabled={isBusy}
                    onPress={() => handleRemoveRow(item.id)}
                    style={[styles.removeButton, isBusy && styles.removeButtonDisabled]}
                  >
                    <Text style={styles.removeButtonText}>Xóa</Text>
                  </Pressable>
                </View>

                <Text style={styles.label}>Tên hàng hóa</Text>
                <TextInput
                  onChangeText={(value) =>
                    handleChangeField(item.id, 'materialName', value)
                  }
                  placeholder="Ví dụ: Thức ăn CP 9001"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  value={item.materialName}
                />

                <View style={styles.row}>
                  <View style={styles.flexColumn}>
                    <Text style={styles.label}>Số lượng</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      onChangeText={(value) =>
                        handleChangeField(item.id, 'quantity', value)
                      }
                      placeholder="0"
                      placeholderTextColor="#94a3b8"
                      style={styles.input}
                      value={item.quantity}
                    />
                  </View>

                  <View style={styles.flexColumn}>
                    <Text style={styles.label}>Đơn vị tính</Text>
                    <TextInput
                      onChangeText={(value) =>
                        handleChangeField(item.id, 'unit', value)
                      }
                      placeholder="Ví dụ: bao"
                      placeholderTextColor="#94a3b8"
                      style={styles.input}
                      value={item.unit}
                    />
                  </View>
                </View>

                <Text style={styles.label}>Giá nhập</Text>
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={(value) =>
                    handleChangeField(item.id, 'unitPrice', value)
                  }
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                  style={styles.input}
                  value={item.unitPrice}
                />

                <View style={styles.lineTotalRow}>
                  <Text style={styles.lineTotalLabel}>Thành tiền</Text>
                  <Text style={styles.lineTotalValue}>
                    {formatMoney(lineTotal)}
                  </Text>
                </View>
              </View>
            );
          })}

          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Tổng tiền</Text>
            <Text style={styles.totalValue}>{formatMoney(totalAmount)}</Text>
          </View>

          {statusMessage ? (
            <Text style={styles.successText}>{statusMessage}</Text>
          ) : null}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          {hasChangedSinceSave ? (
            <Text style={styles.warningText}>
              Biểu mẫu đã thay đổi sau khi lưu nháp. Nếu gửi duyệt bây giờ, hệ thống
              sẽ tạo phiếu mới vì sprint hiện tại chưa hỗ trợ sửa nháp.
            </Text>
          ) : null}

          <View style={styles.actionRow}>
            <Pressable
              disabled={isBusy}
              onPress={() => void handleSaveDraft()}
              style={[
                styles.secondaryButton,
                isBusy && styles.secondaryButtonDisabled
              ]}
            >
              {isSavingDraft ? (
                <ActivityIndicator color="#0f766e" />
              ) : (
                <Text style={styles.secondaryButtonText}>Lưu nháp</Text>
              )}
            </Pressable>

            <Pressable
              disabled={isBusy}
              onPress={() => void handleSubmit()}
              style={[styles.primaryButton, isBusy && styles.primaryButtonDisabled]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Gửi duyệt</Text>
              )}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createEmptyItem(): DraftItem {
  return {
    id: generateUuid(),
    materialId: null,
    materialName: '',
    quantity: '',
    unit: '',
    unitPrice: ''
  };
}

function createTodayInputValue(): string {
  const date = new Date();
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function normalizeNumericInput(value: string): string {
  return value.trim().replace(',', '.');
}

function parseInputNumber(value: string): number {
  return Number(normalizeNumericInput(value));
}

function computeLineTotal(quantityText: string, unitPriceText: string): number {
  const quantity = parseInputNumber(quantityText);
  const unitPrice = parseInputNumber(unitPriceText);

  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
    return 0;
  }

  return quantity * unitPrice;
}

function formatMoney(value: number): string {
  return `${value.toLocaleString('vi-VN')} đ`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef6f4'
  },
  content: {
    padding: 20,
    gap: 16
  },
  header: {
    paddingBottom: 4
  },
  title: {
    marginBottom: 6,
    fontSize: 26,
    fontWeight: '700',
    color: '#134e4a'
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563'
  },
  section: {
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 16
  },
  sectionTitle: {
    marginBottom: 14,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a'
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
    minHeight: 110
  },
  materialStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  materialStateText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569'
  },
  quickMaterialList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  quickMaterialChip: {
    minWidth: '48%',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#99f6e4',
    backgroundColor: '#ecfeff',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  quickMaterialChipDisabled: {
    opacity: 0.6
  },
  quickMaterialName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#155e75'
  },
  quickMaterialUnit: {
    marginTop: 4,
    fontSize: 13,
    color: '#0f766e'
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  addRowButton: {
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addRowButtonDisabled: {
    opacity: 0.6
  },
  addRowButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065f46'
  },
  itemCard: {
    marginBottom: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f8fafc',
    padding: 14
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  removeButton: {
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  removeButtonDisabled: {
    opacity: 0.6
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b'
  },
  row: {
    flexDirection: 'row',
    gap: 12
  },
  flexColumn: {
    flex: 1
  },
  lineTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  lineTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155'
  },
  lineTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  totalCard: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#134e4a',
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  totalLabel: {
    fontSize: 14,
    color: '#ccfbf1'
  },
  totalValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff'
  },
  successText: {
    marginBottom: 8,
    fontSize: 14,
    color: '#047857'
  },
  errorText: {
    marginBottom: 8,
    fontSize: 14,
    color: '#b91c1c'
  },
  warningText: {
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#9a3412'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12
  },
  secondaryButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0f766e',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryButtonDisabled: {
    opacity: 0.6
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f766e'
  },
  primaryButton: {
    flex: 1,
    minHeight: 50,
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
    fontWeight: '700',
    color: '#ffffff'
  }
});
