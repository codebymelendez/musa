import { memo } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { PRIMARY, DARK, SURFACE, BORDER, SERIF } from '../../lib/utils'

const HomeTopBar = memo(function HomeTopBar({
  avatarUrl, userName, unreadCount = 0, onBellPress,
}: {
  avatarUrl: string | null
  userName: string
  unreadCount?: number
  onBellPress?: () => void
}) {
  return (
    <View style={styles.topBar}>
      <Text style={styles.topLogo}>MUSA PRO</Text>
      <View style={styles.topRight}>
        <TouchableOpacity
          style={styles.topIconBtn}
          onPress={onBellPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="notifications-outline" size={20} color={DARK} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
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
  badge: {
    position: 'absolute', top: -2, right: -4,
    minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3,
    backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: SURFACE,
  },
  badgeText: { fontSize: 9, fontWeight: '500', color: '#FFFFFF' },
  topAvatarWrap: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: BORDER },
  topAvatar: { width: '100%', height: '100%' },
})
