import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/AppNavigator';
import { ReceiptListScreenContent } from './PurchaseReceiptListScreen';

type Props = NativeStackScreenProps<RootStackParamList, 'ApprovalList'>;

export function ApprovalListScreen({ navigation }: Props) {
  return <ReceiptListScreenContent navigation={navigation} mode="submitted" />;
}
