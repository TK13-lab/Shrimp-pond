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

import { ApiError } from '../../api/httpClient';
import { listMaterials } from '../../api/materialApi';
import { ROLE_LABELS } from '../../auth/roles';
import { useAuth } from '../../auth/useAuth';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { Material } from '../../types/materials';

type Props = NativeStackScreenProps<RootStackParamList, 'MaterialList'>;
type AdminFilter = 'active' | 'all' | 'inactive';

export function MaterialListScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [adminFilter, setAdminFilter] = useState<AdminFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAdmin = user?.role === 'ADMIN';

  const activeFilter = useMemo(() => {
    if (isAdmin) {
      if (adminFilter === 'active') {
        return true;
      }

      if (adminFilter === 'inactive') {
        return false;
      }

      return undefined;
    }

    return true;
  }, [adminFilter, isAdmin]);

  const loadMaterials = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setErrorMessage(null);

        const response = await listMaterials({
          search: searchApplied,
          active: activeFilter
        });

        setMaterials(response.items);
      } catch (error) {
        if (error instanceof ApiError) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('Không thể tải danh mục vật tư');
        }
      } finally {
        if (refreshing) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [activeFilter, searchApplied]
  );

  useFocusEffect(
    useCallback(() => {
      void loadMaterials();
    }, [loadMaterials])
  );

  function handleApplySearch() {
    setSearchApplied(searchDraft.trim());
  }

  const emptyMessage = errorMessage
    ? errorMessage
    : 'Chưa có vật tư phù hợp với bộ lọc hiện tại.';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Danh mục vật tư</Text>
        <Text style={styles.subtitle}>
          {user ? `Vai trò: ${ROLE_LABELS[user.role]}` : 'Đang tải người dùng'}
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

      {isAdmin ? (
        <View style={styles.adminTools}>
          <View style={styles.filterRow}>
            <FilterChip
              active={adminFilter === 'all'}
              label="Tất cả"
              onPress={() => setAdminFilter('all')}
            />
            <FilterChip
              active={adminFilter === 'active'}
              label="Đang dùng"
              onPress={() => setAdminFilter('active')}
            />
            <FilterChip
              active={adminFilter === 'inactive'}
              label="Ngừng dùng"
              onPress={() => setAdminFilter('inactive')}
            />
          </View>
          <Pressable
            onPress={() => navigation.navigate('MaterialForm')}
            style={styles.createButton}
          >
            <Text style={styles.createButtonText}>Thêm vật tư</Text>
          </Pressable>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.stateContainer}>
          <ActivityIndicator color="#0f766e" size="large" />
          <Text style={styles.stateText}>Đang tải danh mục vật tư...</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={materials}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              colors={['#0f766e']}
              onRefresh={() => void loadMaterials(true)}
              refreshing={isRefreshing}
              tintColor="#0f766e"
            />
          }
          renderItem={({ item }) => (
            <View style={styles.materialCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderContent}>
                  <Text style={styles.materialName}>{item.name}</Text>
                  <Text style={styles.materialUnit}>
                    Đơn vị mặc định: {item.defaultUnit}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    item.isActive ? styles.statusActive : styles.statusInactive
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      item.isActive
                        ? styles.statusTextActive
                        : styles.statusTextInactive
                    ]}
                  >
                    {item.isActive ? 'Đang dùng' : 'Ngừng dùng'}
                  </Text>
                </View>
              </View>

              <Text style={styles.materialNote}>
                {item.note?.trim() ? item.note : 'Chưa có ghi chú'}
              </Text>

              {isAdmin ? (
                <Pressable
                  onPress={() =>
                    navigation.navigate('MaterialForm', {
                      material: item
                    })
                  }
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>Chỉnh sửa</Text>
                </Pressable>
              ) : null}
            </View>
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
      <Text
        style={[
          styles.filterChipText,
          active && styles.filterChipTextActive
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
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
  toolbar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#0f172a'
  },
  searchButton: {
    minWidth: 72,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  searchButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff'
  },
  adminTools: {
    paddingHorizontal: 20,
    paddingBottom: 12
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10
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
  createButton: {
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#134e4a',
    alignItems: 'center',
    justifyContent: 'center'
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff'
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  materialCard: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 16
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12
  },
  cardHeaderContent: {
    flex: 1
  },
  materialName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827'
  },
  materialUnit: {
    marginTop: 6,
    fontSize: 14,
    color: '#475569'
  },
  materialNote: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: '#334155'
  },
  statusBadge: {
    minHeight: 30,
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusActive: {
    backgroundColor: '#dcfce7'
  },
  statusInactive: {
    backgroundColor: '#fee2e2'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700'
  },
  statusTextActive: {
    color: '#166534'
  },
  statusTextInactive: {
    color: '#991b1b'
  },
  editButton: {
    marginTop: 14,
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center'
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f766e'
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
