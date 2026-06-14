import { Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'
import StockDetailPage from './pages/StockDetailPage.jsx'
import TradePage from './pages/TradePage.jsx'
import TransactionsPage from './pages/TransactionsPage.jsx'
import TransferPage from './pages/TransferPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import TopNav from './components/TopNav.jsx'
import ChatWidget from './components/ChatWidget.jsx'

export default function App() {
  return (
    <>
      <TopNav />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/stock/:ticker" element={<StockDetailPage />} />
        <Route path="/trade/:ticker" element={<TradePage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/transfer" element={<TransferPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
      <ChatWidget />
    </>
  )
}
