import { useRef, useEffect } from 'react'
import { View, Animated, StyleSheet } from 'react-native'

export default function SkeletonCards() {
  const opacity = useRef(new Animated.Value(0.45)).current
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.45, duration: 750, useNativeDriver: true }),
    ]))
    a.start(); return () => a.stop()
  }, [opacity])
  return (
    <>
      {[80, 55, 65].map((w, i) => (
        <Animated.View key={i} style={[s.skeletonCard, { opacity }]}>
          <View style={[s.skeletonLine, { width: `${w}%` }]} />
          <View style={[s.skeletonLine, { width: '50%', marginTop: 6 }]} />
          <View style={[s.skeletonLine, { width: '38%', marginTop: 4 }]} />
        </Animated.View>
      ))}
    </>
  )
}

const s = StyleSheet.create({
  skeletonCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E4', paddingHorizontal: 16, paddingVertical: 16, marginBottom: 10 },
  skeletonLine: { height: 13, backgroundColor: '#EEEBE8', borderRadius: 6 },
})
