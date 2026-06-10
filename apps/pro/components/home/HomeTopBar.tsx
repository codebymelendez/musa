import { memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { PRIMARY, DARK, SURFACE, BORDER, SERIF } from '../../lib/utils'

const HomeTopBar = memo(function HomeTopBar({
  avatarUrl, userName,
}: {
  avatarUrl: string | null
  userName: string
}) {
  return (
    <View style={styles.topBar}>
      <Text style={styles.topLogo}>MUSA PRO</Text>
      <View style={styles.topRight}>
        <TouchableOpacity style={styles.topIconBtn}>
          <Ionicons name="notifications-outline" size={20} color={DARK} />
        </TouchableOpacity>
        <View style={styles.topAvatarWrap}>
          {avatarUrl ? (
            <Image
              style={styles.topAvatar}
              source={{ uri: avatarUrl }}
              cachePolicy="memory-disk"
              transition={100}
            />
          ) : (
            <View style={[styles.topAvatar, { backgroundColor: '#EDE8E4', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 14, color: PRIMARY, fontWeight: '600' }}>
                {userName ? userName[0].toUpperCase() : 'M'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
})

export default HomeTopBar

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, height: 64, backgroundColor: SURFACE,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  topLogo: { fontFamily: SERIF, fontSize: 22, fontWeight: 'normal', color: PRIMARY, letterSpacing: -0.5 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  topIconBtn: { padding: 4 },
  topAvatarWrap: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  topAvatar: { width: '100%', height: '100%' },
})
