import { Wallet, Car, Gamepad2, House, Music, ShoppingCart, Utensils } from 'lucide-react-native';

export function renderCategoryIcon(
  iconName: string | null | undefined,
  size = 24,
  color: string | null | undefined = '#6B7280'
) {
  const iconProps = { size, color: color || '#6B7280' };

  switch (iconName) {
    case 'Wallet': return <Wallet {...iconProps} />;
    case 'Car': return <Car {...iconProps} />;
    case 'Gamepad2': return <Gamepad2 {...iconProps} />;
    case 'House': return <House {...iconProps} />;
    case 'Music': return <Music {...iconProps} />;
    case 'ShoppingCart': return <ShoppingCart {...iconProps} />;
    case 'Utensils': return <Utensils {...iconProps} />;
    default: return <Wallet {...iconProps} />;
  }
}

export function getCategoryIconName(categoryName: string, categories: any[]): string | null {
  const category = categories.find(c => c.name === categoryName);
  return category?.icon || null;
}