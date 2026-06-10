import { useRef, useEffect, type ReactNode } from 'react'
import { Animated, View, type StyleProp, type ViewStyle, type DimensionValue } from 'react-native'

export const SKELETON_BG = '#F0EDE9'

function usePulse(): Animated.Value {
  const opacity = useRef(new Animated.Value(0.45)).current
  useEffect(() => {
    const anim = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.45, duration: 750, useNativeDriver: true }),
    ]))
    anim.start()
    return () => anim.stop()
  }, [opacity])
  return opacity
}

/**
 * Contenedor que pulsa: envuelve una silueta construida con <Bone />
 * para que el placeholder tenga la forma del contenido real.
 */
export function Pulse({ style, children }: { style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const opacity = usePulse()
  return <Animated.View style={[{ opacity }, style]}>{children}</Animated.View>
}

/** Bloque gris sin animación propia — usar dentro de <Pulse />. */
export function Bone({
  width,
  height,
  radius = 6,
  style,
}: {
  width?: DimensionValue
  height: DimensionValue
  radius?: number
  style?: StyleProp<ViewStyle>
}) {
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: SKELETON_BG }, style]} />
}

/** Bloque suelto que pulsa por sí solo (tarjetas, héroes, bandas). */
export default function Skeleton({
  height,
  width,
  radius = 16,
  style,
}: {
  height: DimensionValue
  width?: DimensionValue
  radius?: number
  style?: StyleProp<ViewStyle>
}) {
  const opacity = usePulse()
  return (
    <Animated.View
      style={[{ opacity, height, width, borderRadius: radius, backgroundColor: SKELETON_BG }, style]}
    />
  )
}
