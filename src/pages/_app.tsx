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


          {/* Global Background */}
          <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden font-sans selection:bg-pink-500/30">

            {/* Background Blobs */}
            <div className="fixed inset-0 z-0 pointer-events-none">
              {/* Top Center-Right Blob (Pink/Purple) */}
              <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-pink-600/20 rounded-full blur-[120px] mix-blend-screen opacity-60 animate-pulse-slow"></div>

              {/* Bottom Left Blob (Blue/Cyan) */}
              <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] mix-blend-screen opacity-50"></div>

              {/* Center subtle glow */}
              <div className="absolute top-[20%] left-[30%] w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[150px] mix-blend-screen"></div>
            </div>

            <Navbar />
            <main className="relative z-10 p-4">
              <Component {...pageProps} />
            </main>
          </div>

        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;