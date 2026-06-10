import { Component, type ReactNode } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { ob } from '../../lib/observability'
import { PRIMARY, DARK } from '../../lib/utils'

type Props = { children: ReactNode }
type State = { hasError: boolean }

/**
 * Captura crashes de render para que la usuaria nunca vea una pantalla
 * blanca: registra el error y ofrece reiniciar la app en el mismo lugar.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    ob.logError('render-crash', error)
  }

  handleRestart = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <View style={s.wrap}>
        <View style={s.iconCircle}>
          <Ionicons name="alert-circle-outline" size={34} color={PRIMARY} />
        </View>
        <Text style={s.title}>Algo salió mal</Text>
        <Text style={s.subtitle}>
          Ocurrió un error inesperado. Tus datos están a salvo.
        </Text>
        <TouchableOpacity style={s.btn} onPress={this.handleRestart} activeOpacity={0.85}>
          <Text style={s.btnText}>Reiniciar</Text>
        </TouchableOpacity>
      </View>
    )
  }
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 32, backgroundColor: '#FAF9F7' },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32, marginBottom: 6,
    backgroundColor: '#FDF0EC', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '500', color: DARK, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#888888', textAlign: 'center', lineHeight: 20 },
  btn: {
    marginTop: 16, height: 48, paddingHorizontal: 36,
    backgroundColor: PRIMARY, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
  },
  btnText: { fontSize: 15, fontWeight: '500', color: '#FFFFFF', letterSpacing: 0.2 },
})
