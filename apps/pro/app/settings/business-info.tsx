import { lazy, Suspense } from 'react'
import { View, ActivityIndicator } from 'react-native'

// react-native-maps + Google Places Autocomplete are heavy and only needed
// here — loading the module lazily keeps them out of the app's cold start.
const BusinessInfoScreen = lazy(() => import('../../components/business-info/BusinessInfoScreen'))

export default function BusinessInfoRoute() {
  return (
    <Suspense
      fallback={
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF7F4' }}>
          <ActivityIndicator size="large" color="#B5593E" />
        </View>
      }
    >
      <BusinessInfoScreen />
    </Suspense>
  )
}
