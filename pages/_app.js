import '@/styles/globals.css';
import { ChakraWrapper } from '@/components/ChakraWrapper';

function MyApp({ Component, pageProps }) {
  return (
    <ChakraWrapper>
      <Component {...pageProps} />
    </ChakraWrapper>
  );
}

export default MyApp;