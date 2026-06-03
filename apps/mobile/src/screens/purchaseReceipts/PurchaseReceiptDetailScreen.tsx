import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable
} from 'react-native';

import { ApiError } from '../../api/httpClient';
import {
  approvePurchaseReceipt,
  getPurchaseReceipt,
  rejectPurchaseReceipt,
  voidPurchaseReceipt
} from '../../api/receiptApi';
import { ROLE_LABELS } from '../../auth/roles';
import { useAuth } from '../../auth/useAuth';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { PurchaseReceiptDetail } from '../../types/purchaseReceipts';
import {
  formatReceiptDate,
  formatReceiptDateTime,
  formatReceiptMoney,
  getReceiptStatusColors,
  RECEIPT_STATUS_LABELS
} from '../../utils/purchaseReceipts';

type Props = NativeStackScreenProps<RootStackParamList, 'PurchaseReceiptDetail'>;
type ActionComposerMode = 'reject' | 'void' | null;

export function PurchaseReceiptDetailScreen({ route }: Props) {
  const { user } = useAuth();
  const { receiptId } = route.params;
  const [receipt, setReceipt] = useState<PurchaseReceiptDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionComposerMode, setActionComposerMode] =
    useState<ActionComposerMode>(null);
  const [actionReason, setActionReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const canManageReceipt = Boolean(
    user && (user.role === 'MANAGER' || user.role === 'ADMIN')
  );

  const canReviewActions = useMemo(
    () =>
      Boolean(
        user &&
          (user.role === 'MANAGER' || user.role === 'ADMIN') &&
          receipt?.status === 'SUBMITTED'
      ),
    [receipt?.status, user]
  );

  const canVoidAction = useMemo(
    () =>
      Boolean(
        user &&
          (user.role === 'MANAGER' || user.role === 'ADMIN') &&
          receipt?.status === 'APPROVED'
      ),
    [receipt?.status, user]
  );
  const isBusy = isApproving || isSubmittingReview;
  const shouldShowActionSection =
    canManageReceipt &&
    (canReviewActions ||
      canVoidAction ||
      Boolean(actionComposerMode) ||
      Boolean(actionSuccessMessage) ||
      Boolean(actionErrorMessage));

  const loadReceipt = useCallback(async () => {
    setIsLoading(true);

    try {
      setErrorMessage(null);
      const response = await getPurchaseReceipt(receiptId);
      setReceipt(response);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Không thể tải chi tiết phiếu nhập');
      }
    } finally {
      setIsLoading(false);
    }
  }, [receiptId]);

  useFocusEffect(
    useCallback(() => {
      void loadReceipt();
    }, [loadReceipt])
  );

  if (isLoading) {
    return (
      <View style={styles.stateContainer}>
        <ActivityIndicator color="#0f766e" size="large" />
        <Text style={styles.stateText}>Đang tải chi tiết phiếu nhập...</Text>
      </View>
    );
  }

  if (!receipt) {
    return (
      <View style={styles.stateContainer}>
        <Text style={styles.stateText}>
          {errorMessage ?? 'Không tìm thấy phiếu nhập.'}
        </Text>
      </View>
    );
  }

  const statusColors = getReceiptStatusColors(receipt.status);

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerMain}>
            <Text style={styles.receiptCode}>{receipt.receiptCode}</Text>
            <Text style={styles.headerSubtitle}>
              {user ? `Vai trò: ${ROLE_LABELS[user.role]}` : 'Chi tiết phiếu nhập'}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColors.backgroundColor }
            ]}
          >
            <Text style={[styles.statusText, { color: statusColors.textColor }]}>
              {RECEIPT_STATUS_LABELS[receipt.status]}
            </Text>
          </View>
        </View>

        <Text style={styles.totalText}>
          Tổng tiền: {formatReceiptMoney(receipt.totalAmount)}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin phiếu</Text>
        <InfoRow label="Người tạo" value={formatActor(receipt.createdBy)} />
        <InfoRow label="Ngày tạo" value={formatReceiptDateTime(receipt.createdAt)} />
        <InfoRow label="Ngày nhập" value={formatReceiptDate(receipt.receiptDate)} />
        <InfoRow
          label="Nhà cung cấp"
          value={receipt.supplierName?.trim() || 'Chưa có'}
        />
        <InfoRow
          label="Người gửi duyệt"
          value={formatOptionalActor(receipt.submittedBy)}
        />
        <InfoRow
          label="Thời gian gửi duyệt"
          value={formatReceiptDateTime(receipt.submittedAt)}
        />
        <InfoRow
          label="Người duyệt"
          value={formatOptionalActor(receipt.approvedBy)}
        />
        <InfoRow
          label="Thời gian duyệt"
          value={formatReceiptDateTime(receipt.approvedAt)}
        />
        <InfoRow
          label="Lý do trả lại"
          value={receipt.rejectReason?.trim() || 'Chưa có'}
        />
        <InfoRow
          label="Thời gian trả lại"
          value={formatReceiptDateTime(receipt.rejectedAt)}
        />
        <InfoRow
          label="Lý do hủy"
          value={receipt.voidReason?.trim() || 'Chưa có'}
        />
        <InfoRow
          label="Thời gian hủy"
          value={formatReceiptDateTime(receipt.voidedAt)}
        />
        <InfoRow label="Số dòng hàng hóa" value={String(receipt.itemCount)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ghi chú</Text>
        <Text style={styles.noteText}>
          {receipt.note?.trim() || 'Chưa có ghi chú'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danh sách hàng hóa</Text>
        {receipt.items.map((item, index) => (
          <View key={item.id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>
              Dòng {index + 1}: {item.materialName}
            </Text>
            <Text style={styles.itemText}>
              Số lượng: {item.quantity} {item.unit}
            </Text>
            <Text style={styles.itemText}>
              Giá nhập: {formatReceiptMoney(item.unitPrice)}
            </Text>
            <Text style={styles.itemText}>
              Thành tiền: {formatReceiptMoney(item.lineTotal)}
            </Text>
          </View>
        ))}
      </View>

      {shouldShowActionSection && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thao tác tiếp theo</Text>

          {actionSuccessMessage ? (
            <Text style={styles.successText}>{actionSuccessMessage}</Text>
          ) : null}

          {actionErrorMessage ? (
            <Text style={styles.errorText}>{actionErrorMessage}</Text>
          ) : null}

          {canReviewActions ? (
            <View style={styles.actionRow}>
              <Pressable
                disabled={isBusy}
                onPress={() => void handleApprove()}
                style={[
                  styles.actionButton,
                  styles.approveButton,
                  isBusy && styles.actionButtonDisabled
                ]}
              >
                <Text style={styles.actionButtonText}>
                  {isApproving ? 'Đang duyệt...' : 'Duyệt'}
                </Text>
              </Pressable>
              <Pressable
                disabled={isBusy}
                onPress={() => openReasonComposer('reject')}
                style={[
                  styles.actionButton,
                  styles.rejectButton,
                  isBusy && styles.actionButtonDisabled
                ]}
              >
                <Text style={styles.actionButtonText}>Trả lại</Text>
              </Pressable>
            </View>
          ) : null}

          {canVoidAction ? (
            <Pressable
              disabled={isBusy}
              onPress={() => openReasonComposer('void')}
              style={[
                styles.actionButton,
                styles.voidButton,
                isBusy && styles.actionButtonDisabled
              ]}
            >
              <Text style={styles.actionButtonText}>Hủy phiếu</Text>
            </Pressable>
          ) : null}

          {actionComposerMode ? (
            <View style={styles.reasonCard}>
              <Text style={styles.reasonTitle}>
                {actionComposerMode === 'reject'
                  ? 'Lý do trả lại phiếu'
                  : 'Lý do hủy phiếu'}
              </Text>
              <TextInput
                editable={!isBusy}
                multiline
                onChangeText={setActionReason}
                placeholder={
                  actionComposerMode === 'reject'
                    ? 'Ví dụ: Sai số lượng'
                    : 'Ví dụ: Phiếu bị nhập nhầm'
                }
                style={styles.reasonInput}
                textAlignVertical="top"
                value={actionReason}
              />
              <View style={styles.reasonActionRow}>
                <Pressable
                  disabled={isBusy}
                  onPress={closeReasonComposer}
                  style={[styles.secondaryButton, isBusy && styles.actionButtonDisabled]}
                >
                  <Text style={styles.secondaryButtonText}>Bỏ qua</Text>
                </Pressable>
                <Pressable
                  disabled={isBusy}
                  onPress={() => void handleSubmitReasonAction()}
                  style={[styles.primaryReasonButton, isBusy && styles.actionButtonDisabled]}
                >
                  <Text style={styles.actionButtonText}>
                    {isSubmittingReview
                      ? 'Đang gửi...'
                      : actionComposerMode === 'reject'
                        ? 'Xác nhận trả lại'
                        : 'Xác nhận hủy'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      )}
    </ScrollView>
  );

  function openReasonComposer(mode: Exclude<ActionComposerMode, null>) {
    setActionComposerMode(mode);
    setActionReason('');
    setActionErrorMessage(null);
    setActionSuccessMessage(null);
  }

  function closeReasonComposer() {
    setActionComposerMode(null);
    setActionReason('');
    setActionErrorMessage(null);
  }

  function handleApprove() {
    Alert.alert(
      'Xác nhận duyệt phiếu',
      'Sau khi duyệt, tồn kho sẽ được cập nhật ngay trên máy chủ.',
      [
        {
          text: 'Không',
          style: 'cancel'
        },
        {
          text: 'Duyệt',
          onPress: () => {
            void runApprove();
          }
        }
      ]
    );
  }

  async function runApprove() {
    setIsApproving(true);
    setActionErrorMessage(null);
    setActionSuccessMessage(null);

    try {
      const nextReceipt = await approvePurchaseReceipt(receiptId);
      setReceipt(nextReceipt);
      setActionComposerMode(null);
      setActionReason('');
      setActionSuccessMessage(`Đã duyệt phiếu ${nextReceipt.receiptCode}.`);
    } catch (error) {
      if (error instanceof ApiError) {
        setActionErrorMessage(error.message);
      } else {
        setActionErrorMessage('Không thể duyệt phiếu nhập.');
      }
    } finally {
      setIsApproving(false);
    }
  }

  async function handleSubmitReasonAction() {
    const normalizedReason = actionReason.trim();

    if (!actionComposerMode) {
      return;
    }

    if (!normalizedReason) {
      setActionErrorMessage('Vui lòng nhập lý do trước khi gửi.');
      return;
    }

    setIsSubmittingReview(true);
    setActionErrorMessage(null);
    setActionSuccessMessage(null);

    try {
      const nextReceipt =
        actionComposerMode === 'reject'
          ? await rejectPurchaseReceipt(receiptId, normalizedReason)
          : await voidPurchaseReceipt(receiptId, normalizedReason);

      setReceipt(nextReceipt);
      setActionComposerMode(null);
      setActionReason('');
      setActionSuccessMessage(
        actionComposerMode === 'reject'
          ? `Đã trả lại phiếu ${nextReceipt.receiptCode}.`
          : `Đã hủy phiếu ${nextReceipt.receiptCode}.`
      );
    } catch (error) {
      if (error instanceof ApiError) {
        setActionErrorMessage(error.message);
      } else {
        setActionErrorMessage(
          actionComposerMode === 'reject'
            ? 'Không thể trả lại phiếu nhập.'
            : 'Không thể hủy phiếu nhập.'
        );
      }
    } finally {
      setIsSubmittingReview(false);
    }
  }

}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatActor(actor: PurchaseReceiptDetail['createdBy']): string {
  return `${actor.fullName} · @${actor.username}`;
}

function formatOptionalActor(
  actor: PurchaseReceiptDetail['submittedBy']
): string {
  return actor ? `${actor.fullName} · @${actor.username}` : 'Chưa có';
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
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef6f4',
    padding: 24
  },
  stateText: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#475569'
  },
  headerCard: {
    borderRadius: 8,
    backgroundColor: '#134e4a',
    padding: 18
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  headerMain: {
    flex: 1
  },
  receiptCode: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff'
  },
  headerSubtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#ccfbf1'
  },
  statusBadge: {
    minHeight: 32,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700'
  },
  totalText: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff'
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
  infoRow: {
    marginBottom: 12
  },
  infoLabel: {
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b'
  },
  infoValue: {
    fontSize: 15,
    lineHeight: 22,
    color: '#0f172a'
  },
  noteText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#334155'
  },
  itemCard: {
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe4ee',
    backgroundColor: '#f8fafc',
    padding: 14
  },
  itemTitle: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  itemText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569'
  },
  successText: {
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#0f766e'
  },
  errorText: {
    marginBottom: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#b91c1c'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionButtonDisabled: {
    opacity: 0.6
  },
  approveButton: {
    backgroundColor: '#0f766e'
  },
  rejectButton: {
    backgroundColor: '#b45309'
  },
  voidButton: {
    backgroundColor: '#7c3aed'
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff'
  },
  reasonCard: {
    marginTop: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e2eb',
    backgroundColor: '#f8fafc',
    padding: 14
  },
  reasonTitle: {
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a'
  },
  reasonInput: {
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 22,
    color: '#0f172a'
  },
  reasonActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff'
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155'
  },
  primaryReasonButton: {
    flex: 2,
    minHeight: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f766e'
  }
});
