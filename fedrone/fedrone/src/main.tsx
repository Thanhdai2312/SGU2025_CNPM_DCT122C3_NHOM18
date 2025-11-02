import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// Điểm vào ứng dụng React (mount SPA vào #root)
import App from './App.tsx';
import Home from './pages/Home.tsx';
import RestaurantDetail from './pages/RestaurantDetail.tsx';
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import Cart from './pages/Cart.tsx';
import Checkout from './pages/Checkout.tsx';
import OrderTracking from './pages/OrderTracking.tsx';
import MyOrders from './pages/MyOrders.tsx';
import './index.css';
import AdminLayout from './pages/admin/AdminLayout.tsx';
import AdminDashboard from './pages/admin/AdminDashboard.tsx';
import AdminLogin from './pages/admin/AdminLogin.tsx';
import AdminGuard from './components/AdminGuard.tsx';
import AdminOrders from './pages/admin/AdminOrders.tsx';
import AdminDrones from './pages/admin/AdminDrones.tsx';
import AdminDeliveries from './pages/admin/AdminDeliveries.tsx';
import AdminMonitor from './pages/admin/AdminMonitor.tsx';
import AdminOrderDetail from './pages/admin/AdminOrderDetail.tsx';
import AdminProducts from './pages/admin/AdminProducts.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />}> 
            <Route index element={<Home />} />
            <Route path="restaurants/:id" element={<RestaurantDetail />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="cart" element={<Cart />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="orders" element={<MyOrders />} />
            <Route path="orders/:orderId" element={<OrderTracking />} />
          </Route>
          {/* Standalone Admin app (separate from customer app) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:orderId" element={<AdminOrderDetail />} />
            <Route path="drones" element={<AdminDrones />} />
            <Route path="deliveries" element={<AdminDeliveries />} />
            <Route path="monitor" element={<AdminMonitor />} />
            <Route path="products" element={<AdminProducts />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
