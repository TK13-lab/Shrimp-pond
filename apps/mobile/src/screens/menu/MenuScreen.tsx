import {
  FlatList,
  StyleSheet,
  Text,
  View
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Menu'>;

const MENU_BY_ROLE: Record<RootStackParamList['Menu']['role'], string[]> = {
  ADMIN: ['Quan ly nguoi dung', 'Danh muc vat tu', 'Phieu nhap', 'Ton kho', 'Audit log'],
  MANAGER: ['Phieu cho duyet', 'Tao phieu nhap', 'Lich su phieu nhap', 'Ton kho', 'Danh muc vat tu', 'Audit log'],
  STAFF: ['Tao phieu nhap', 'Phieu cua toi', 'Danh muc vat tu']
};

export function MenuScreen({ route }: Props) {
  const { role } = route.params;
  const items = MENU_BY_ROLE[role];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Menu vai tro {role}</Text>
      <Text style={styles.subtitle}>
        Placeholder cho Sprint 0. Dieu huong va API that se duoc noi tiep o Sprint 1.
      </Text>

      <FlatList
        data={items}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.itemText}>{item}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef6f4',
    padding: 20
  },
  title: {
    marginBottom: 6,
    fontSize: 24,
    fontWeight: '700',
    color: '#134e4a'
  },
  subtitle: {
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
    color: '#4b5563'
  },
  item: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  itemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827'
  }
});
