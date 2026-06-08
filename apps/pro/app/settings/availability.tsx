import React, { useEffect } from 'react'
import { router } from 'expo-router'

export default function RedirectToBusinessInfo() {
  useEffect(() => {
    router.replace('/settings/business-info' as any)
  }, [])
  return null
}
