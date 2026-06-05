import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { listInventory } from '../../api/inventoryApi';
import { ROLE_LABELS } from '../../auth/roles';
import { useAuth } from '../../auth/useAuth';
import { RequestNotice } from '../../components/RequestNotice';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { InventoryBalance } from '../../types/inventory';
import {
  formatReceiptDateTime,
  formatReceiptMoney
} from '../../utils/purchaseReceipts';
import {
  getRequestErrorMessage,
  isRetryableRequestError
} from '../../utils/requestErrors';

type Props = NativeStackScreenProps<RootStackParamList, 'Inventory'>;

export function InventoryScreen(_: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<InventoryBalance[]>([]);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canRetryLoad, setCanRetryLoad] = useState(false);

  const totalValue = useMemo(
    () =>
      items.reduce((sum, item) => {
        const amount = Number(item.totalValue);

        return Number.isFinite(amount) ? sum + amount : sum;
      }, 0),
    [items]
  );

  const loadInventory = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setErrorMessage(null);
        setCanRetryLoad(false);

        const response = await listInventory({
          search: searchApplied
        });

        setItems(response.items);
      } catch (error) {
        setCanRetryLoad(isRetryableRequestError(error));
        setErrorMessage(
          getRequestErrorMessage(
            error,
            'Không thể tải tồn kho. Vui lòng thử lại.',
            'authenticated'
          )
        );
      } finally {
        if (refreshing) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [searchApplied]
  );

  useFocusEffect(
    useCallback(() => {
      void loadInventory();
    }, [loadInventory])
  );

  function handleApplySearch() {
    setSearchApplied(searchDraft.trim());
  }

  const emptyMessage = 'Chưa có vật tư tồn kho phù hợp với bộ lọc hiện tại.';
  const shouldShowSummary = items.length > 0;
  const hasInlineLoadError = Boolean(errorMessage) && items.length > 0;

  function handleRetryLoad() {
    void loadInventory(items.length > 0);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tồn kho</Text>
        <Text style={styles.subtitle}>
          {user ? `Vai trò: ${ROLE_LABELS[user.role]}` : 'Đang tải người dùng'}
        </Text>
        <Text style={styles.helperText}>
          Chỉ hiển thị số dư đã được cập nhật từ các phiếu nhập được duyệt.
        </Text>
      </View>

      <View style={styles.toolbar}>
        <TextInput
          autoCapitalize="sentences"
          onChangeText={setSearchDraft}
          onSubmitEditing={handleApplySearch}
          placeholder="Tìm theo tên vật tư"
          placeholderTextColor="#94a3b8"
          style={styles.searchInput}
          value={searchDraft}
        />
        <Pressable onPress={handleApplySearch} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Tìm</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color="#0f766e" size="large" />
          <Text style={styles.stateText}>Đang tải tồn kho...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              colors={['#0f766e']}
              onRefresh={() => void loadInventory(true)}
              refreshing={isRefreshing}
              tintColor="#0f766e"
            />
          }
          ListHeaderComponent={
            shouldShowSummary ? (
              <View>
                {hasInlineLoadError ? (
                  <RequestNotice
                    compact
                    message={errorMessage ?? ''}
                    onRetry={canRetryLoad ? handleRetryLoad : undefined}
                  />
                ) : null}
                <View style={styles.summaryPanel}>
                  <View style={styles.summaryBlock}>
                    <Text style={styles.summaryLabel}>Mặt hàng còn tồn</Text>
                    <Text style={styles.summaryValue}>{items.length}</Text>
                  </View>
                  <View style={styles.summaryBlock}>
                    <Text style={styles.summaryLabel}>Tổng giá trị tồn</Text>
                    <Text style={styles.summaryValue}>
                      {formatReceiptMoney(totalValue)}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            errorMessage ? (
              <RequestNotice
                message={errorMessage}
                onRetry={canRetryLoad ? handleRetryLoad : undefined}
              />
            ) : (
              <View style={styles.stateContainer}>
                <Text style={styles.stateText}>{emptyMessage}</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.inventoryCard}>
              <Text style={styles.materialName}>{item.materialName}</Text>
              <InfoRow
                label="Số lượng tồn"
                value={`${formatInventoryQuantity(item.currentQuantity)} ${item.unit}`}
              />
              <InfoRow
                label="Giá trung bình"
                value={formatReceiptMoney(item.averagePrice)}
              />
              <InfoRow
                label="Giá trị tồn"
                value={formatReceiptMoney(item.totalValue)}
              />
              <InfoRow
                label="Cập nhật"
                value={formatReceiptDateTime(item.updatedAt)}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatInventoryQuantity(value: string): string {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return value;
  }

  return amount.toLocaleString('vi-VN', {
    maximumFractionDigits: 3
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef6f4'
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10
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
  helperText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569'
  },
  toolbar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 14
  },
  searchInput: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a'
  },
  searchButton: {
    minWidth: 72,
    borderRadius: 8,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  searchButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff'
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  summaryPanel: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  summaryBlock: {
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 14
  },
  summaryLabel: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748b'
  },
  summaryValue: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a'
  },
  inventoryCard: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 16
  },
  materialName: {
    marginBottom: 12,
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a'
  },
  infoRow: {
    marginTop: 8
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
