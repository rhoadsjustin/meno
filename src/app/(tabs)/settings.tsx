import Constants from 'expo-constants';
import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { useThemeColors, fonts } from '@/theme';

export default function SettingsScreen() {
  const colors = useThemeColors();
  return (
    <Screen title="Settings">
      <Card>
        <Text style={[styles.body, { color: colors.inkFaint, fontFamily: fonts?.ui }]}>
          Meno {Constants.expoConfig?.version ?? ''} · Scripture: World English Bible (WEB), public
          domain.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 15, lineHeight: 20 },
});
