// components/Layout.js
import { useEffect } from 'react';
import Head from 'next/head';
import {
  Box,
  Container,
  Flex,
  Text,
  Heading,
  HStack,
  Link,
  Button,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react';
import Image from 'next/image';

const Layout = ({ children }) => {
  const bgGradient = useColorModeValue(
    'linear(to-br, blue.50, gray.50)',
    'linear(to-br, gray.900, blue.900)'
  );
  const headerBgColor = useColorModeValue('white', 'gray.800');
  const headerBorderColor = useColorModeValue('gray.100', 'gray.700');
  const footerBgColor = useColorModeValue('white', 'gray.800');
  const footerBorderColor = useColorModeValue('gray.100', 'gray.700');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const accentColor = useColorModeValue('blue.500', 'blue.300');
  const mutedColor = useColorModeValue('gray.500', 'gray.400');

  // Scroll to top button functionality
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Head>
  <title>AI-Powered Document Extraction</title>
  <meta name="description" content="Extract data from PDF documents effortlessly with AI assistance" />
  
  {/* Favicon and App Icons */}
  <link rel="icon" href="/favicon.ico" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
  
  {/* PWA Meta Tags */}
  <meta name="theme-color" content="#3182ce" />
  <meta name="msapplication-TileColor" content="#3182ce" />
  
  {/* Open Graph Meta Tags */}
  <meta property="og:title" content="AI-Powered Document Extraction" />
  <meta property="og:description" content="Extract data from PDF documents effortlessly with AI assistance" />
  <meta property="og:image" content="/logo.png" />
  <meta property="og:type" content="website" />
  
  {/* Twitter Card Meta Tags */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="" />
  <meta name="twitter:description" content="Extract data from PDF documents effortlessly with AI assistance" />
  <meta name="twitter:image" content="/logo.png" />
  
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</Head>

      <Box minH="100vh" bgGradient={bgGradient} color={textColor} display="flex" flexDirection="column">
        {/* Header */}
        <Box 
          as="header" 
          bg={headerBgColor} 
          borderBottom="1px" 
          borderColor={headerBorderColor} 
          py={3}
          position="sticky"
          top="0"
          zIndex="sticky"
          boxShadow="sm"
        >
          <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
            <Flex justify="space-between" align="center">
              <Flex align="center">
  {/* Replace document icon with logo */}
  <Image
    src="/logo.png"
    alt="PDF Parser Logo"
    width={160}
    height={160}
    style={{ marginRight: '12px' }}
  />
  <Box>
    <Heading as="h1" size="md"></Heading>
    <Text fontSize="xs" color={mutedColor}>Powered by AI</Text>
  </Box>
</Flex>

              <HStack spacing={6} display={{ base: 'none', md: 'flex' }}>
                <Link href="#" color={mutedColor} _hover={{ color: accentColor }} fontSize="sm">
                  <Flex align="center">
                    <Box mr={1}>❓</Box>
                    <Text>Help</Text>
                  </Flex>
                </Link>
                <Link href="#" color={mutedColor} _hover={{ color: accentColor }} fontSize="sm">
                  <Flex align="center">
                    <Box mr={1}>⚙️</Box>
                    <Text>Settings</Text>
                  </Flex>
                </Link>
                <Button
                  colorScheme="blue"
                  size="sm"
                  rounded="md"
                  fontWeight="medium"
                  px={4}
                >
                  Contact Support
                </Button>
              </HStack>

              {/* Mobile menu button would go here if needed */}
            </Flex>
          </Container>
        </Box>

        {/* Main content */}
        <Box flex="1" as="main" py={8}>
          <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
            {children}
          </Container>
        </Box>

        {/* Footer */}
        <Box 
          as="footer" 
          bg={footerBgColor} 
          borderTop="1px" 
          borderColor={footerBorderColor}
          py={6}
        >
          <Container maxW="container.xl" px={{ base: 4, md: 6 }}>
            <Flex 
              direction={{ base: 'column', md: 'row' }} 
              justify="space-between" 
              align={{ base: 'center', md: 'center' }}
              textAlign={{ base: 'center', md: 'left' }}
            >
              <Text fontSize="sm" color={mutedColor} mb={{ base: 4, md: 0 }}>
                &copy; {new Date().getFullYear()} Enigma Health. All rights reserved.
              </Text>
              
              <HStack spacing={{ base: 4, md: 6 }} wrap="wrap" justify="center">
                <Link href="#" color={mutedColor} _hover={{ color: accentColor }} fontSize="sm">
                  Privacy Policy
                </Link>
                <Link href="#" color={mutedColor} _hover={{ color: accentColor }} fontSize="sm">
                  Terms of Service
                </Link>
                <Link href="#" color={mutedColor} _hover={{ color: accentColor }} fontSize="sm">
                  Contact
                </Link>
              </HStack>
            </Flex>
          </Container>
        </Box>

        {/* Scroll to top button */}
        <Box
          position="fixed"
          bottom="4"
          right="4"
          zIndex="overlay"
        >
          <Button
            onClick={scrollToTop}
            rounded="full"
            colorScheme="blue"
            size="sm"
            width="40px"
            height="40px"
            boxShadow="md"
          >
            ↑
          </Button>
        </Box>
      </Box>
    </>
  );
};

export default Layout;