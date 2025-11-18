import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// Điểm vào ứng dụng React (mount SPA vào #root)
import App from './App.tsx';
import Home from './pages/user/Home.tsx';
import RestaurantDetail from './pages/user/RestaurantDetail.tsx';
import Login from './pages/user/Login.tsx';
import Register from './pages/user/Register.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import Cart from './pages/user/Cart.tsx';
import Checkout from './pages/user/Checkout.tsx';
import OrderTracking from './pages/user/OrderTracking.tsx';
import MyOrders from './pages/user/MyOrders.tsx';
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
import AdminKitchen from './pages/admin/AdminKitchen.tsx';
import AdminUsers from './pages/admin/AdminUsers.tsx';
import RestaurantLogin from './pages/restaurant/RestaurantLogin.tsx';
import RestaurantGuard from './components/RestaurantGuard.tsx';
import RestaurantLayout from './pages/restaurant/RestaurantLayout.tsx';
import RestaurantDrones from './pages/restaurant/RestaurantDrones.tsx';
import RestaurantStats from './pages/restaurant/RestaurantStats.tsx';

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
          {/* Ứng dụng Quản trị Admin độc lập (tách khỏi ứng dụng khách) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminGuard><AdminLayout /></AdminGuard>}>
            <Route index element={<AdminDashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:orderId" element={<AdminOrderDetail />} />
            <Route path="drones" element={<AdminDrones />} />
            <Route path="deliveries" element={<AdminDeliveries />} />
            <Route path="monitor" element={<AdminMonitor />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="kitchen" element={<AdminKitchen />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
          {/* Khu vực Nhà hàng (/restaurant) - dùng layout riêng (màu xanh lá) */}
          <Route path="/restaurant/login" element={<RestaurantLogin />} />
          <Route path="/restaurant" element={<RestaurantGuard><RestaurantLayout /></RestaurantGuard>}>
            <Route index element={<RestaurantStats />} />
            <Route path="stats" element={<RestaurantStats />} />
            <Route path="kitchen" element={<AdminKitchen />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="drones" element={<RestaurantDrones />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
