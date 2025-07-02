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
        <title>PDF Parser</title>
        <meta name="description" content="Extract data from PDF documents effortlessly with AI assistance" />
        <link rel="icon" href="/favicon.ico" />
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
                {/* Document icon replacement */}
                <Box fontSize="2xl" color={accentColor} mr={3}>
                  📄
                </Box>
                <Box>
                  <Heading as="h1" size="md">PDF Parser</Heading>
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
                &copy; {new Date().getFullYear()} PDF Parser. All rights reserved.
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