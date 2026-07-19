import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/context/LanguageContext";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { CustomerAuthProvider } from "@/context/CustomerAuthContext";

import StoreLayout from "@/components/storefront/StoreLayout";
import Account from "@/pages/account/Account";
import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import ProductDetail from "@/pages/ProductDetail";
import Checkout from "@/pages/Checkout";
import OrderConfirmation from "@/pages/OrderConfirmation";
import TrackOrder from "@/pages/TrackOrder";
import KnetPayment from "@/pages/KnetPayment";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import Terms from "@/pages/Terms";

import AdminLogin from "@/pages/admin/AdminLogin";
import AdminLayout from "@/pages/admin/AdminLayout";
import Dashboard from "@/pages/admin/Dashboard";
import Orders from "@/pages/admin/Orders";
import Products from "@/pages/admin/Products";
import Categories from "@/pages/admin/Categories";
import Coupons from "@/pages/admin/Coupons";
import DeliveryConfig from "@/pages/admin/DeliveryConfig";
import Customers from "@/pages/admin/Customers";
import Reports from "@/pages/admin/Reports";

function App() {
    return (
        <LanguageProvider>
            <AuthProvider>
              <CustomerAuthProvider>
                <CartProvider>
                    <BrowserRouter>
                        <Toaster position="top-center" richColors />
                        <Routes>
                            {/* Storefront */}
                            <Route element={<StoreLayout />}>
                                <Route path="/" element={<Home />} />
                                <Route path="/products" element={<Catalog />} />
                                <Route path="/category/:slug" element={<Catalog />} />
                                <Route path="/product/:id" element={<ProductDetail />} />
                                <Route path="/checkout" element={<Checkout />} />
                                <Route path="/order/:orderNo" element={<OrderConfirmation />} />
                                <Route path="/track" element={<TrackOrder />} />
                                <Route path="/account" element={<Account />} />
                                <Route path="/about" element={<About />} />
                                <Route path="/contact" element={<Contact />} />
                                <Route path="/privacy" element={<PrivacyPolicy />} />
                                <Route path="/terms" element={<Terms />} />
                            </Route>
                            <Route path="/payment/knet/:orderNo" element={<KnetPayment />} />

                            {/* Admin */}
                            <Route path="/admin/login" element={<AdminLogin />} />
                            <Route path="/admin" element={<AdminLayout />}>
                                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                                <Route path="dashboard" element={<Dashboard />} />
                                <Route path="orders" element={<Orders />} />
                                <Route path="products" element={<Products />} />
                                <Route path="categories" element={<Categories />} />
                                <Route path="coupons" element={<Coupons />} />
                                <Route path="delivery" element={<DeliveryConfig />} />
                                <Route path="customers" element={<Customers />} />
                                <Route path="reports" element={<Reports />} />
                            </Route>

                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </BrowserRouter>
                </CartProvider>
              </CustomerAuthProvider>
            </AuthProvider>
        </LanguageProvider>
    );
}

export default App;
