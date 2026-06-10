import React from 'react'
import { View, StyleSheet, ViewProps } from 'react-native'

export function MaxWidthContainer({ children, style, ...props }: ViewProps) {
  return (
    <View style={styles.outer}>
      <View style={[styles.inner, style]} {...props}>
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  inner: {
    width: '100%',
    maxWidth: 700,
    flex: 1,
  },
})
