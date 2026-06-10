import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { PRIMARY, DARK } from '../../lib/utils'

export default function EmptyState({
  icon = 'sparkles-outline',
  title,
  subtitle,
  ctaLabel,
  onCtaPress,
}: {
  icon?: React.ComponentProps<typeof Ionicons>['name']
  title: string
  subtitle?: string
  ctaLabel?: string
  onCtaPress?: () => void
}) {
  return (
    <View style={s.wrap}>
      <View style={s.iconCircle}>
        <Ionicons name={icon} size={30} color={PRIMARY} />
      </View>
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      {ctaLabel && onCtaPress ? (
        <TouchableOpacity style={s.ctaBtn} onPress={onCtaPress} activeOpacity={0.85}>
          <Text style={s.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  )
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32, paddingVertical: 40 },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32, marginBottom: 6,
    backgroundColor: '#FDF0EC', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 16, fontWeight: '500', color: DARK, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#888888', textAlign: 'center', lineHeight: 18 },
  ctaBtn: {
    marginTop: 14, height: 48, paddingHorizontal: 32,
    backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
  },
  ctaText: { fontSize: 15, fontWeight: '500', color: '#FFFFFF', letterSpacing: 0.2 },
})
