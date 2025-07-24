import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, Suspense, lazy } from 'react'
import { CartProvider } from './context/CartContext'
import { FavoritesProvider } from './context/FavoritesContext'
import { initializePWA } from './utils/pwa'
import { AuthProvider, useAuth } from './context/AuthContext'
// Layouts
const GuestLayout = lazy(() => import('./layouts/GuestLayout'))
const MainLayout = lazy(() => import('./layouts/MainLayout'))
// Guest pages
const Hero = lazy(() => import('./components/Guest/Hero'))
const Login = lazy(() => import('./components/Guest/Login'))
const Register = lazy(() => import('./components/Guest/Register'))
const GoogleCallback = lazy(() => import('./components/Guest/GoogleCallback'))
// Main pages
const Home = lazy(() => import('./components/Main/Home'))
const Profile = lazy(() => import('./components/Main/Profile'))
const Settings = lazy(() => import('./components/Main/Settings'))
const Logout = lazy(() => import('./components/Main/Logout'))
const RequireAuth = lazy(() => import('./components/common/RequireAuth'))
const RequireAdmin = lazy(() => import('./components/common/RequireAdmin'))
const RequirePanelAccess = lazy(() => import('./components/common/RequirePanelAccess'))
const ItemsList = lazy(() => import('./components/Main/Items/ItemsList'))
const ItemDetail = lazy(() => import('./components/Main/Items/ItemDetail'))
const OutfitsList = lazy(() => import('./components/Main/Outfits/OutfitsList'))
const OutfitDetail = lazy(() => import('./components/Main/Outfits/OutfitDetail'))
const Favorites = lazy(() => import('./components/Main/Favorites'))
const AdminDashboard = lazy(() => import('./components/Admin/AdminDashboard'))
const UsersAdmin = lazy(() => import('./components/Admin/UsersAdmin'))
const ItemsAdmin = lazy(() => import('./components/Admin/ItemsAdmin'))
const OutfitsAdmin = lazy(() => import('./components/Admin/OutfitsAdmin'))
const ModeratorAnalytics = lazy(() => import('./components/Admin/ModeratorAnalytics'))
const SystemAnalytics = lazy(() => import('./components/Admin/SystemAnalytics'))
const UserForm = lazy(() => import('./components/Admin/UserForm'))
const ItemForm = lazy(() => import('./components/Admin/ItemForm'))
const OutfitForm = lazy(() => import('./components/Admin/OutfitForm'))
const Cart = lazy(() => import('./components/Main/Cart'))
const History = lazy(() => import('./components/Main/History'))
const OutfitBuilder = lazy(() => import('./components/Main/Outfits/OutfitBuilder'))
const CreateOutfit = lazy(() => import('./components/Main/Outfits/CreateOutfit'))
const EditOutfit = lazy(() => import('./components/Main/Outfits/EditOutfit'))
const LamodaParser = lazy(() => import('./components/Admin/LamodaParser'))
const ShopsList = lazy(() => import('./components/Main/Shops/ShopsList'))
const ShopItemsList = lazy(() => import('./components/Main/Shops/ShopItemsList'))
const ShopItemDetail = lazy(() => import('./components/Main/Shops/ShopItemDetail'))
const NotFound404 = lazy(() => import('./components/common/NotFound404'))

function AppContent() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        background: '#fff',
        zIndex: 9999
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid #e5e7eb',
          borderTop: '3px solid #111',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          marginBottom: 14,
          boxSizing: 'border-box',
          background: 'transparent'
        }} />
        <div style={{ fontSize: 15, color: '#222', fontWeight: 400, letterSpacing: 0.2, fontFamily: 'inherit' }}>Загрузка...</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  return (
    <CartProvider>
      <FavoritesProvider>
        <Suspense fallback={<div>Загрузка...</div>}>
          <BrowserRouter>
            <Routes>
              {/* Public / Guest Routes */}
              <Route element={<GuestLayout />}>
                <Route path="/" element={<Hero />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/google/callback" element={<GoogleCallback />} />
              </Route>
              {/* Authenticated User Routes (no auth guard yet) */}
              <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
                <Route path="/home" element={<Home />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/logout" element={<Logout />} />
                <Route path="/items" element={<ItemsList />} />
                <Route path="/items/:id" element={<ItemDetail />} />
                <Route path="/outfits" element={<OutfitsList />} />
                <Route path="/outfits/new" element={<CreateOutfit />} />
                <Route path="/outfits/builder" element={<OutfitBuilder />} />
                <Route path="/outfits/:id" element={<OutfitDetail />} />
                <Route path="/outfits/:id/edit" element={<EditOutfit />} />
                <Route path="/shops" element={<ShopsList />} />
                <Route path="/shops/:moderatorId/items/:id" element={<ShopItemDetail />} />
                <Route path="/shops/:moderatorId/items" element={<ShopItemsList />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/history" element={<History />} />
                <Route path="/cart" element={<Cart />} />
                <Route element={<RequirePanelAccess><AdminDashboard /></RequirePanelAccess>}>
                  <Route path="/admin/users" element={<RequireAdmin><UsersAdmin /></RequireAdmin>} />
                  <Route path="/admin/users/new" element={<RequireAdmin><UserForm /></RequireAdmin>} />
                  <Route path="/admin/users/:id/edit" element={<RequireAdmin><UserForm /></RequireAdmin>} />
                  <Route path="/admin/items" element={<ItemsAdmin />} />
                  <Route path="/admin/items/new" element={<ItemForm />} />
                  <Route path="/admin/items/:id/edit" element={<ItemForm />} />
                  {/* Новый роут для Lamoda парсера только для администратора */}
                  <Route path="/admin/lamoda-parser" element={<RequireAdmin><LamodaParser /></RequireAdmin>} />
                  <Route path="/admin/outfits" element={<RequireAdmin><OutfitsAdmin /></RequireAdmin>} />
                  <Route path="/admin/outfits/new" element={<RequireAdmin><OutfitForm /></RequireAdmin>} />
                  <Route path="/admin/outfits/:id/edit" element={<RequireAdmin><OutfitForm /></RequireAdmin>} />
                  <Route path="/admin/analytics" element={<ModeratorAnalytics />} />
                  <Route path="/admin/system" element={<RequireAdmin><SystemAnalytics /></RequireAdmin>} />
                </Route>
              </Route>
              {/* Fallback */}
              <Route path="*" element={<NotFound404 />} />
            </Routes>
          </BrowserRouter>
        </Suspense>
      </FavoritesProvider>
    </CartProvider>
  );
}

function App() {
  useEffect(() => {
    initializePWA();
  }, []);
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App
