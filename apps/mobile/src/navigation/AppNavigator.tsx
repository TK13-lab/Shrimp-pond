import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../auth/useAuth';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { MaterialFormScreen } from '../screens/materials/MaterialFormScreen';
import { MaterialListScreen } from '../screens/materials/MaterialListScreen';
import { MenuScreen } from '../screens/menu/MenuScreen';
import { PurchaseReceiptFormScreen } from '../screens/purchaseReceipts/PurchaseReceiptFormScreen';
import { Material } from '../types/materials';

export type RootStackParamList = {
  Login: undefined;
  Menu: undefined;
  MaterialList: undefined;
  MaterialForm:
    | undefined
    | {
        material: Material;
      };
  PurchaseReceiptForm: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { isRestoring, session } = useAuth();

  if (isRestoring) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#0f766e" size="large" />
        <Text style={styles.loadingText}>Đang khôi phục phiên đăng nhập...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerTitleAlign: 'center'
      }}
    >
      {session ? (
        <>
          <Stack.Screen
            name="Menu"
            component={MenuScreen}
            options={{ title: 'Trang chính', headerBackVisible: false }}
          />
          <Stack.Screen
            name="MaterialList"
            component={MaterialListScreen}
            options={{ title: 'Danh mục vật tư' }}
          />
          <Stack.Screen
            name="MaterialForm"
            component={MaterialFormScreen}
            options={{ title: 'Vật tư' }}
          />
          <Stack.Screen
            name="PurchaseReceiptForm"
            component={PurchaseReceiptFormScreen}
            options={{ title: 'Tạo phiếu nhập' }}
          />
        </>
      ) : (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ title: 'Đăng nhập', headerBackVisible: false }}
        />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f7fb',
    padding: 24
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#334155'
  }
});
