import { Platform } from 'react-native'
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native'
import { Calendar } from 'react-native-calendars'
import { PRIMARY, DARK, GRAY, BORDER, SURFACE, SERIF } from '../lib/utils'

export interface DatePickerModalProps {
  visible: boolean
  value: string | null
  onConfirm: (date: string) => void
  onCancel: () => void
  title?: string
  minDate?: string
  maxDate?: string
}

const MONTH_NAMES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
]

export function formatDateSpanish(isoDate: string): string {
  if (!isoDate) return ''
  const cleanDate = isoDate.split('T')[0]
  const [year, month, day] = cleanDate.split('-').map(Number)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return isoDate
  return `${day} de ${MONTH_NAMES[month - 1]} de ${year}`
}

export default function DatePickerModal({
  visible, value, onConfirm, onCancel, title = 'Seleccionar fecha', minDate, maxDate,
}: DatePickerModalProps) {
  const cleanValue = value ? value.split('T')[0] : null
  const markedDates = cleanValue
    ? { [cleanValue]: { selected: true, selectedColor: PRIMARY } }
    : {}

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity style={styles.card} activeOpacity={1} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>
          <Calendar
            current={cleanValue ?? undefined}
            markedDates={markedDates}
            minDate={minDate}
            maxDate={maxDate}
            onDayPress={day => onConfirm(day.dateString)}
            theme={{
              selectedDayBackgroundColor: PRIMARY,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: PRIMARY,
              arrowColor: PRIMARY,
              dotColor: PRIMARY,
              monthTextColor: DARK,
              dayTextColor: DARK,
              textDisabledColor: '#CCCCCC',
              textDayFontSize: 14,
              textMonthFontSize: 15,
              textDayHeaderFontSize: 12,
              textMonthFontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
              textDayFontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
              calendarBackground: '#FFFFFF',
            }}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingTop: 20,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  title: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 18,
    color: DARK,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  actions: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    height: 44,
    paddingHorizontal: 32,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: DARK,
  },
})
