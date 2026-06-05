import {
  Modal,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SuccessFeedbackContent,
} from '@/components/feedback/SuccessFeedbackContent';
import { colors } from '@/theme/colors';
import {
  AppTheme,
  useAppTheme,
} from '@/theme/ThemeContext';

type SuccessFeedbackModalProps = {
  visible: boolean;
  title: string;
  message: string;
  onRequestClose?: () => void;
  headerColor?: string;
  successColor?: string;
};

export function SuccessFeedbackModal({
  visible,
  title,
  message,
  onRequestClose,
  headerColor,
  successColor = colors.secondary,
}: SuccessFeedbackModalProps) {
  const { theme } = useAppTheme();
  const styles = createStyles(theme, headerColor ?? theme.colors.sidebarHeader);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onRequestClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
          </View>

          <View style={styles.successContent}>
            <SuccessFeedbackContent
              message={message}
              color={successColor}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme, headerColor: string) {
  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.62)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 18,
    },
    modalBox: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      overflow: 'hidden',
    },
    modalHeader: {
      minHeight: 54,
      backgroundColor: headerColor,
      paddingHorizontal: 22,
      paddingVertical: 10,
      justifyContent: 'center',
    },
    modalTitle: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '900',
    },
    successContent: {
      paddingHorizontal: 22,
      paddingVertical: 24,
    },
  });
}