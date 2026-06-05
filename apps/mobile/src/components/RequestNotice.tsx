import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

type Props = {
  compact?: boolean;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function RequestNotice({
  compact = false,
  message,
  onRetry,
  retryLabel = 'Thử lại',
  style
}: Props) {
  return (
    <View style={[styles.container, compact ? styles.compactContainer : null, style]}>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryButtonText}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 18
  },
  compactContainer: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff7f7'
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    color: '#7f1d1d'
  },
  retryButton: {
    marginTop: 12,
    minHeight: 40,
    minWidth: 104,
    borderRadius: 8,
    backgroundColor: '#b91c1c',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff'
  }
});
