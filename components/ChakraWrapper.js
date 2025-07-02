'use client'

import { ChakraProvider, extendTheme } from '@chakra-ui/react'

// Create a theme instance
const theme = extendTheme({
  // Optional: add your theme customizations here
})

export function ChakraWrapper({ children }) {
  return (
    <ChakraProvider theme={theme}>
      {children}
    </ChakraProvider>
  )
}