import { useMemo } from 'react';

import { PanResponder } from 'react-native';

type UseSidebarSwipeParams = {
  onOpen: () => void;
};

export function useSidebarSwipe({
  onOpen,
}: UseSidebarSwipeParams) {
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const isFromLeftEdge = gestureState.x0 <= 25;
          const isSwipeToRight = gestureState.dx > 12;
          const isHorizontalSwipe =
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy);

          return isFromLeftEdge && isSwipeToRight && isHorizontalSwipe;
        },
        onPanResponderRelease: (_, gestureState) => {
          const shouldOpen =
            gestureState.dx > 60 ||
            gestureState.vx > 0.5;

          if (shouldOpen) {
            onOpen();
          }
        },
      }),
    [onOpen]
  );

  return panResponder.panHandlers;
}