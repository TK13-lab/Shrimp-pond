import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { MENU_BY_ROLE, ROLE_LABELS } from '../../auth/roles';
import { useAuth } from '../../auth/useAuth';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Menu'>;

export function MenuScreen({ navigation }: Props) {
  const { isSigningOut, signOut, user } = useAuth();

  if (!user) {
    return null;
  }

  if (user.role !== 'STAFF') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Xin chào, {user.fullName}</Text>
          <Text style={styles.headerSubtitle}>
            {ROLE_LABELS[user.role]} · @{user.username}
          </Text>
        </View>

        <View style={styles.webOnlyPanel}>
          <Text style={styles.webOnlyTitle}>Tài khoản quản lý dùng web</Text>
          <Text style={styles.webOnlyText}>
            App Android hiện dành cho nhân viên nhập phiếu tại ao. Manager và
            admin xử lý duyệt phiếu, lịch sử và tồn kho trên web responsive.
          </Text>

          <Pressable
            disabled={isSigningOut}
            onPress={() => void signOut()}
            style={[styles.logoutButton, isSigningOut && styles.logoutButtonDisabled]}
          >
            <Text style={styles.logoutButtonText}>
              {isSigningOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const items = MENU_BY_ROLE[user.role];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Xin chào, {user.fullName}</Text>
        <Text style={styles.headerSubtitle}>
          {ROLE_LABELS[user.role]} · @{user.username}
        </Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleMenuPress(item.key)}
            style={styles.item}
          >
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
          </Pressable>
        )}
        ListFooterComponent={
          <Pressable
            disabled={isSigningOut}
            onPress={() => void signOut()}
            style={[styles.logoutButton, isSigningOut && styles.logoutButtonDisabled]}
          >
            <Text style={styles.logoutButtonText}>
              {isSigningOut ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </Text>
          </Pressable>
        }
      />
    </View>
  );

  function handleMenuPress(key: string) {
    if (key === 'create-receipt') {
      navigation.navigate('PurchaseReceiptForm');
      return;
    }

    if (key === 'my-receipts') {
      navigation.navigate('PurchaseReceiptList', {
        mode: 'mine'
      });
      return;
    }

    if (key === 'history') {
      navigation.navigate('PurchaseReceiptList', {
        mode: 'history'
      });
      return;
    }

    if (key === 'approvals') {
      navigation.navigate('ApprovalList');
      return;
    }

    if (key === 'receipts') {
      navigation.navigate('PurchaseReceiptList', {
        mode: 'all'
      });
      return;
    }

    if (key === 'materials') {
      navigation.navigate('MaterialList');
      return;
    }

    if (key === 'inventory') {
      navigation.navigate('Inventory');
      return;
    }

    Alert.alert(
      'Đang phát triển',
      'Màn hình này sẽ được triển khai ở sprint tiếp theo.'
    );
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
    paddingBottom: 8
  },
  headerTitle: {
    marginBottom: 6,
    fontSize: 26,
    fontWeight: '700',
    color: '#134e4a'
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#4b5563'
  },
  listContent: {
    padding: 20
  },
  item: {
    marginBottom: 12,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827'
  },
  itemDescription: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563'
  },
  logoutButton: {
    marginTop: 8,
    minHeight: 48,
    borderRadius: 8,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoutButtonDisabled: {
    backgroundColor: '#94a3b8'
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff'
  },
  webOnlyPanel: {
    margin: 20,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 18
  },
  webOnlyText: {
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563'
  },
  webOnlyTitle: {
    marginBottom: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827'
  }
});
