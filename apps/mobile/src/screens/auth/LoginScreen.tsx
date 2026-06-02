import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>App quan ly ao tom</Text>
        <Text style={styles.subtitle}>
          Placeholder cho Sprint 0. Dang nhap that se duoc lam o Sprint 1.
        </Text>

        <TextInput
          autoCapitalize="none"
          onChangeText={setUsername}
          placeholder="Ten dang nhap"
          style={styles.input}
          value={username}
        />
        <TextInput
          onChangeText={setPassword}
          placeholder="Mat khau"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        <Pressable
          onPress={() => navigation.navigate('Menu', { role: 'STAFF' })}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Dang nhap placeholder</Text>
        </Pressable>

        <Text style={styles.hint}>
          Gia tri nhap hien tai: {username || '(trong)'} / {password ? '***' : '(trong)'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#f4f7fb',
    padding: 24
  },
  card: {
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6
    },
    elevation: 3
  },
  title: {
    marginBottom: 8,
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569'
  },
  input: {
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16
  },
  primaryButton: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#0f766e',
    paddingVertical: 14,
    alignItems: 'center'
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff'
  },
  hint: {
    marginTop: 14,
    fontSize: 13,
    color: '#64748b'
  }
});
