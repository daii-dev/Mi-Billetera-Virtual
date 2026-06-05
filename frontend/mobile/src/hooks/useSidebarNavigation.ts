import { useCallback } from 'react';

import { router } from 'expo-router';

import {
  SidebarItem,
  SidebarRouteKey,
} from '@/lib/sidebarNavigation';

type UseSidebarNavigationParams = {
    currentKey: SidebarRouteKey;
    onClose: () => void;
    onSelectedKeyChange?: (key: SidebarRouteKey) => void;
};

export function useSidebarNavigation({
    currentKey,
    onClose,
    onSelectedKeyChange,
}: UseSidebarNavigationParams) {
    return useCallback(
        (item: SidebarItem) => {
        onSelectedKeyChange?.(item.key);
        onClose();

        if (item.key === currentKey) {
            return;
        }
        if (!item.path) {
            return;
        }

        router.push(item.path as any);
        },
        [currentKey, onClose, onSelectedKeyChange]
    );
}