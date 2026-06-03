import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { ApiError } from '../../api/httpClient';
import { listPurchaseReceipts } from '../../api/receiptApi';
import { ROLE_LABELS } from '../../auth/roles';
import { useAuth } from '../../auth/useAuth';
import type { ReceiptListMode, RootStackParamList } from '../../navigation/AppNavigator';
import {
  PurchaseReceiptStatus,
  PurchaseReceiptSummary
} from '../../types/purchaseReceipts';
import {
  formatReceiptDate,
  formatReceiptMoney,
  getReceiptStatusColors,
  RECEIPT_STATUS_LABELS
} from '../../utils/purchaseReceipts';

type Props = NativeStackScreenProps<RootStackParamList, 'PurchaseReceiptList'>;
type FilterValue = 'ALL' | PurchaseReceiptStatus;

const FILTERS: FilterValue[] = [
  'ALL',
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'VOIDED'
];

export function PurchaseReceiptListScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const { mode } = route.params;
  const [receipts, setReceipts] = useState<PurchaseReceiptSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<FilterValue>(
    mode === 'submitted' ? 'SUBMITTED' : 'ALL'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: getScreenTitle(mode)
    });
  }, [mode, navigation]);

  useEffect(() => {
    if (mode === 'submitted') {
      setStatusFilter('SUBMITTED');
    }
  }, [mode]);

  const loadReceipts = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setErrorMessage(null);

        const response = await listPurchaseReceipts({
          status: statusFilter === 'ALL' ? undefined : statusFilter
        });

        setReceipts(response.items);
      } catch (error) {
        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Không thể tải danh sách phiếu nhập');
        }
      } finally {
        if (refreshing) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [statusFilter]
  );

  useFocusEffect(
    useCallback(() => {
      void loadReceipts();
    }, [loadReceipts])
  );

  const visibleFilters = useMemo(() => {
    if (mode === 'submitted') {
      return FILTERS.filter((filter) => filter === 'SUBMITTED');
    }

    return FILTERS;
  }, [mode]);

  const emptyMessage = errorMessage
    ? errorMessage
    : mode === 'submitted'
      ? 'Chưa có phiếu nào đang chờ duyệt.'
      : 'Chưa có phiếu nhập phù hợp với bộ lọc hiện tại.';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{getHeaderTitle(mode)}</Text>
        <Text style={styles.subtitle}>
          {user ? `Vai trò: ${ROLE_LABELS[user.role]}` : 'Đang tải người dùng'}
        </Text>
      </View>

      <View style={styles.filterRow}>
        {visibleFilters.map((filter) => (
          <FilterChip
            key={filter}
            active={statusFilter === filter}
            label={filter === 'ALL' ? 'Tất cả' : RECEIPT_STATUS_LABELS[filter]}
            onPress={() => setStatusFilter(filter)}
          />
        ))}
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color="#0f766e" size="large" />
          <Text style={styles.stateText}>Đang tải phiếu nhập...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={receipts}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              colors={['#0f766e']}
              onRefresh={() => void loadReceipts(true)}
              refreshing={isRefreshing}
              tintColor="#0f766e"
            />
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                navigation.navigate('PurchaseReceiptDetail', {
                  receiptId: item.id
                })
              }
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderContent}>
                  <Text style={styles.receiptCode}>{item.receiptCode}</Text>
                  <Text style={styles.receiptMeta}>
                    Ngày nhập: {formatReceiptDate(item.receiptDate)}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>

              <Text style={styles.totalText}>
                Tổng tiền: {formatReceiptMoney(item.totalAmount)}
              </Text>

              {mode !== 'mine' ? (
                <Text style={styles.detailText}>
                  Người nhập: {item.createdBy.fullName} · @{item.createdBy.username}
                </Text>
              ) : null}

              {item.supplierName?.trim() ? (
                <Text style={styles.detailText}>
                  Nhà cung cấp: {item.supplierName}
                </Text>
              ) : null}

              <Text style={styles.detailText}>
                {item.itemCount} dòng hàng hóa
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.stateContainer}>
              <Text style={styles.stateText}>{emptyMessage}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

type FilterChipProps = {
  active: boolean;
  label: string;
  onPress: () => void;
};

function FilterChip({ active, label, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function StatusBadge({ status }: { status: PurchaseReceiptStatus }) {
  const colors = getReceiptStatusColors(status);

  return (
    <View
      style={[styles.statusBadge, { backgroundColor: colors.backgroundColor }]}
    >
      <Text style={[styles.statusText, { color: colors.textColor }]}>
        {RECEIPT_STATUS_LABELS[status]}
      </Text>
    </View>
  );
}

function getScreenTitle(mode: ReceiptListMode): string {
  switch (mode) {
    case 'mine':
      return 'Phiếu của tôi';
    case 'submitted':
      return 'Phiếu chờ duyệt';
    case 'history':
      return 'Lịch sử phiếu nhập';
    case 'all':
      return 'Phiếu nhập';
  }
}

function getHeaderTitle(mode: ReceiptListMode): string {
  switch (mode) {
    case 'mine':
      return 'Phiếu của tôi';
    case 'submitted':
      return 'Phiếu chờ duyệt';
    case 'history':
      return 'Lịch sử phiếu nhập';
    case 'all':
      return 'Tất cả phiếu nhập';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef6f4'
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12
  },
  filterChip: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#94a3b8',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  filterChipActive: {
    borderColor: '#0f766e',
    backgroundColor: '#d1fae5'
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569'
  },
  filterChipTextActive: {
    color: '#065f46'
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  card: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 16
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12
  },
  cardHeaderContent: {
    flex: 1
  },
  receiptCode: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a'
  },
  receiptMeta: {
    marginTop: 4,
    fontSize: 14,
    color: '#475569'
  },
  totalText: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827'
  },
  detailText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569'
  },
  statusBadge: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700'
  },
  stateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40
  },
  stateText: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#475569'
  }
});
