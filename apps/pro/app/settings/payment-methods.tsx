import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { PRIMARY, DARK, SURFACE, BORDER, GRAY, SERIF } from '../../lib/utils'

export default function PaymentMethodsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back-outline" size={24} color={DARK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Métodos de Pago</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="card-outline" size={52} color={PRIMARY} />
        </View>
        <Text style={styles.title}>Próximamente</Text>
        <Text style={styles.desc}>
          Gestiona cómo recibes pagos de tus clientas. Acepta tarjetas, transferencias y más — todo desde la app.
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: SURFACE },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER,
  },
  backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: SERIF, fontSize: 20, color: DARK },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 16,
  },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#FDF0EC', alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontFamily: SERIF, fontSize: 26, color: DARK, textAlign: 'center' },
  desc: { fontSize: 15, color: GRAY, textAlign: 'center', lineHeight: 22 },
})
