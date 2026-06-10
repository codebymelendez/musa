import { useRef, useEffect } from 'react'
import { Animated } from 'react-native'

export default function PulseSkeleton({ height, mx = 20, mb = 14 }: { height: number; mx?: number; mb?: number }) {
  const op = useRef(new Animated.Value(0.45)).current
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(op, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(op, { toValue: 0.45, duration: 750, useNativeDriver: true }),
    ]))
    a.start(); return () => a.stop()
  }, [op])
  return (
    <Animated.View style={{
      opacity: op, height, borderRadius: 16,
      backgroundColor: '#F0EDE9',
      marginHorizontal: mx, marginBottom: mb,
    }} />
  )
}
