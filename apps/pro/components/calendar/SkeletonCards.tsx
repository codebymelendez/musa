import { View, StyleSheet } from 'react-native'
import { Pulse, Bone } from '../ui/Skeleton'

export default function SkeletonCards() {
  return (
    <>
      {[80, 55, 65].map((w, i) => (
        <Pulse key={i} style={s.skeletonCard}>
          <Bone height={13} width={`${w}%`} />
          <Bone height={13} width="50%" style={{ marginTop: 6 }} />
          <Bone height={13} width="38%" style={{ marginTop: 4 }} />
        </Pulse>
      ))}
    </>
  )
}

const s = StyleSheet.create({
  skeletonCard: { backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#EDE8E4', paddingHorizontal: 16, paddingVertical: 16, marginBottom: 10 },
})
