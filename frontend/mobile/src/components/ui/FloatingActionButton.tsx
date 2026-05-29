import { Plus } from 'lucide-react-native';
import {
  Pressable,
  StyleSheet,
} from 'react-native';

type FloatingActionButtonProps = {
  onPress: () => void;
  color: string;
  bottom?: number;
  right?: number;
};

export function FloatingActionButton({
  onPress,
  color,
  bottom = 88,
  right = 28,
}: FloatingActionButtonProps) {
  return (
    <Pressable
      style={[
        styles.button,
        {
          backgroundColor: color,
          bottom,
          right,
        },
      ]}
      onPress={onPress}
      hitSlop={8}
    >
      <Plus size={31} color="#FFFFFF" strokeWidth={3} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 4,
    elevation: 5,
  },
});