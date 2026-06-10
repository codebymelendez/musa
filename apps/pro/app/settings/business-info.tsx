import { lazy, Suspense } from 'react'
import { View } from 'react-native'
import { Pulse, Bone } from '../../components/ui/Skeleton'

// react-native-maps + Google Places Autocomplete are heavy and only needed
// here — loading the module lazily keeps them out of the app's cold start.
const BusinessInfoScreen = lazy(() => import('../../components/business-info/BusinessInfoScreen'))

export default function BusinessInfoRoute() {
  return (
    <Suspense
      fallback={
        <View style={{ flex: 1, backgroundColor: '#FAF7F4' }}>
          <Pulse style={{ paddingHorizontal: 20, paddingTop: 20, gap: 14 }}>
            {[120, 200, 160, 100].map((h, i) => (
              <Bone key={i} height={h} radius={16} />
            ))}
          </Pulse>
        </View>
      }
    >
      <BusinessInfoScreen />
    </Suspense>
  )
}
