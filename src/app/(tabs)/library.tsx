import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { useThemeColors, fonts, spacing } from '@/theme';

export default function LibraryScreen() {
  const colors = useThemeColors();
  return (
    <Screen title="Library">
      <Card>
        <Text style={[styles.title, { color: colors.ink, fontFamily: fonts?.ui }]}>No goals yet</Text>
        <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          Your passages in progress and memorized verses will live here.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: '600', marginBottom: spacing.xs },
  body: { fontSize: 15, lineHeight: 20 },
});
