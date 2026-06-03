import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';

import { ApiError } from '../../api/httpClient';
import { useAuth } from '../../auth/useAuth';

const DEMO_ACCOUNTS = ['admin / Admin@123', 'manager1 / Manager@123', 'staff1 / Staff@123'];

export function LoginScreen() {
  const { isSigningIn, signIn } = useAuth();
  const [username, setUsername] = useState('staff1');
  const [password, setPassword] = useState('Staff@123');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmitDisabled = useMemo(() => {
    return (
      isSigningIn || username.trim().length === 0 || password.trim().length === 0
    );
  }, [isSigningIn, password, username]);

  async function handleLogin() {
    if (isSubmitDisabled) {
      return;
    }

    setErrorMessage(null);

    try {
      await signIn({
        username,
        password
      });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrorMessage(error.message);
        return;
      }

      setErrorMessage('Đăng nhập chưa thành công. Vui lòng thử lại.');
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Shrimp Pond</Text>
        <Text style={styles.title}>Đăng nhập hệ thống trại tôm</Text>
        <Text style={styles.subtitle}>
          Sử dụng tài khoản được cấp để vào hệ thống và làm việc theo đúng vai trò.
        </Text>

        <Text style={styles.label}>Tên đăng nhập</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setUsername}
          placeholder="Nhập tên đăng nhập"
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={username}
        />
        <Text style={styles.label}>Mật khẩu</Text>
        <TextInput
          onChangeText={setPassword}
          placeholder="Nhập mật khẩu"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable
          disabled={isSubmitDisabled}
          onPress={() => void handleLogin()}
          style={[
            styles.primaryButton,
            isSubmitDisabled && styles.primaryButtonDisabled
          ]}
        >
          {isSigningIn ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Đăng nhập</Text>
          )}
        </Pressable>

        <View style={styles.demoPanel}>
          <Text style={styles.demoTitle}>Tài khoản demo</Text>
          {DEMO_ACCOUNTS.map((account) => (
            <Text key={account} style={styles.demoItem}>
              {account}
            </Text>
          ))}
        </View>
      </View>
    </KeyboardAvoidingView>
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
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 24,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6
    },
    elevation: 3
  },
  eyebrow: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f766e'
  },
  title: {
    marginBottom: 10,
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a'
  },
  subtitle: {
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 20,
    color: '#475569'
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a'
  },
  input: {
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16
  },
  errorText: {
    marginTop: 2,
    marginBottom: 8,
    fontSize: 14,
    color: '#b91c1c'
  },
  primaryButton: {
    marginTop: 8,
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
  demoPanel: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 14
  },
  demoTitle: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#475569'
  },
  demoItem: {
    marginBottom: 4,
    fontSize: 13,
    color: '#64748b'
  }
});
