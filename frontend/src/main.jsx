import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import LegalPage from './pages/LegalPage.jsx'
import './index.css'

// Page components
import { HomePage } from './components/Home'
import MiningPage from './pages/MiningPage.jsx'
import YupooPageWrapper from './pages/YupooPageWrapper.jsx'
import SavedPageWrapper from './pages/SavedPageWrapper.jsx'
import ProfilePageWrapper from './pages/ProfilePageWrapper.jsx'
import StorePageWrapper from './pages/StorePageWrapper.jsx'
import { FeeCalculatorPage } from './components/FeeCalculator'
import DeclarationPageWrapper from './pages/DeclarationPageWrapper.jsx'
import ProfitDashboardWrapper from './pages/ProfitDashboardWrapper.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        {/* Global ErrorBoundary — last line of defense against white screen */}
        <ErrorBoundary level="global" name="root">
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        {/* Public legal pages */}
                        <Route path="/terms" element={<LegalPage initialType="terms" />} />
                        <Route path="/privacy" element={<LegalPage initialType="privacy" />} />

                        {/* Protected routes — require authentication */}
                        <Route element={<ProtectedRoute />}>
                            <Route element={<App />}>
                                <Route index element={<ErrorBoundary name="home"><HomePage /></ErrorBoundary>} />
                                <Route path="/mining" element={<ErrorBoundary name="mining"><MiningPage /></ErrorBoundary>} />
                                <Route path="/yupoo" element={<ErrorBoundary name="yupoo"><YupooPageWrapper /></ErrorBoundary>} />
                                <Route path="/saved" element={<ErrorBoundary name="saved"><SavedPageWrapper /></ErrorBoundary>} />
                                <Route path="/profile" element={<ErrorBoundary name="profile"><ProfilePageWrapper /></ErrorBoundary>} />
                                <Route path="/store" element={<ErrorBoundary name="store"><StorePageWrapper /></ErrorBoundary>} />
                                <Route path="/calculator" element={<ErrorBoundary name="calculator"><FeeCalculatorPage /></ErrorBoundary>} />
                                <Route path="/declaration" element={<ErrorBoundary name="declaration"><DeclarationPageWrapper /></ErrorBoundary>} />
                                <Route path="/profitability" element={<ErrorBoundary name="profitability"><ProfitDashboardWrapper /></ErrorBoundary>} />
                            </Route>
                        </Route>
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </ErrorBoundary>
    </React.StrictMode>,
)
