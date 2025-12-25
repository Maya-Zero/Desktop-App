import { StrictMode } from 'react'
import ReactDOM from "react-dom/client";
import { createRouter, RouterProvider } from '@tanstack/react-router'
import "./index.css";
import { ThemeProvider } from "./components/providers/theme-provider";
import { WalletProvider } from "./components/providers/wallet-provider";

// Import the generated route tree
import { routeTree } from './routeTree.gen'
import { SettingsProvider } from './components/providers/settings-provider';
import { BalanceProvider } from './components/providers/balance-provider';
import { PriceProvider } from './components/providers/price-provider';
import { NotificationProvider } from './components/providers/notification-provider';
import { CacaoProvider } from './components/providers/cacao-provider';

// Create a new router instance
const router = createRouter({ routeTree })

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <ThemeProvider defaultTheme="system">
        <SettingsProvider>
          <WalletProvider>
            <BalanceProvider>
                <PriceProvider>
                    <NotificationProvider>
                        <CacaoProvider>
                            <RouterProvider router={router} />
                        </CacaoProvider>
                    </NotificationProvider>
                </PriceProvider>
            </BalanceProvider>
          </WalletProvider>
        </SettingsProvider>
      </ThemeProvider>
    </StrictMode>,
  )
}