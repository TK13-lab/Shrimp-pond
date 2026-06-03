import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable
} from 'react-native';

import { ApiError } from '../../api/httpClient';
import { getPurchaseReceipt } from '../../api/receiptApi';
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

export function PurchaseReceiptDetailScreen({ route }: Props) {
  const { user } = useAuth();
  const { receiptId } = route.params;
  const [receipt, setReceipt] = useState<PurchaseReceiptDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

      {(canReviewActions || canVoidAction) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thao tác tiếp theo</Text>

          {canReviewActions ? (
            <View style={styles.actionRow}>
              <Pressable
                onPress={() => showPendingAlert('duyệt phiếu')}
                style={[styles.actionButton, styles.approveButton]}
              >
                <Text style={styles.actionButtonText}>Duyệt</Text>
              </Pressable>
              <Pressable
                onPress={() => showPendingAlert('trả lại phiếu')}
                style={[styles.actionButton, styles.rejectButton]}
              >
                <Text style={styles.actionButtonText}>Trả lại</Text>
              </Pressable>
            </View>
          ) : null}

          {canVoidAction ? (
            <Pressable
              onPress={() => showPendingAlert('hủy phiếu')}
              style={[styles.actionButton, styles.voidButton]}
            >
              <Text style={styles.actionButtonText}>Hủy phiếu</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </ScrollView>
  );

  function showPendingAlert(actionName: string) {
    Alert.alert(
      'Sẽ có ở Sprint 4',
      `Chức năng ${actionName} sẽ được nối với backend approval ở sprint tiếp theo.`
    );
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
  }
});
