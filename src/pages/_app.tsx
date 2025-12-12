import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { config } from '../wagmi';
import Navbar from '../components/Navbar'; // <--- IMPORT THIS

const client = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <RainbowKitProvider theme={darkTheme()}> {/* Added Dark Theme for vibes */}

          {/* Navbar sits here, above the page content */}
          <div className="min-h-screen bg-gray-950 text-white">
            <Navbar />
            <main className="p-4">
              <Component {...pageProps} />
            </main>
          </div>

        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;