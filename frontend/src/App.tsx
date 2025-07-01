import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { FavoritesProvider } from './context/FavoritesContext'
// Layouts
import GuestLayout from './layouts/GuestLayout'
import MainLayout from './layouts/MainLayout'
// Guest pages
import Hero from './components/Guest/Hero'
import Login from './components/Guest/Login'
import Register from './components/Guest/Register'
import GoogleCallback from './components/Guest/GoogleCallback'
// Main pages
import Home from './components/Main/Home'
import Profile from './components/Main/Profile'
import Settings from './components/Main/Settings'
import Logout from './components/Main/Logout'
import RequireAuth from './components/common/RequireAuth'
import RequireAdmin from './components/common/RequireAdmin'
import ItemsList from './components/Main/Items/ItemsList'
import ItemDetail from './components/Main/Items/ItemDetail'
import OutfitsList from './components/Main/Outfits/OutfitsList'
import OutfitDetail from './components/Main/Outfits/OutfitDetail'
import Favorites from './components/Main/Favorites'
import AdminDashboard from './components/Admin/AdminDashboard'
import UsersAdmin from './components/Admin/UsersAdmin'
import ItemsAdmin from './components/Admin/ItemsAdmin'
import OutfitsAdmin from './components/Admin/OutfitsAdmin'
import UserForm from './components/Admin/UserForm'
import ItemForm from './components/Admin/ItemForm'
import OutfitForm from './components/Admin/OutfitForm'
import Cart from './components/Main/Cart'
import History from './components/Main/History'
import OutfitBuilder from './components/Main/Outfits/OutfitBuilder'
import CreateOutfit from './components/Main/Outfits/CreateOutfit'
import EditOutfit from './components/Main/Outfits/EditOutfit'

function App() {
  return (
    <CartProvider>
      <FavoritesProvider>
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
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/history" element={<History />} />
              <Route path="/cart" element={<Cart />} />
              <Route element={<RequireAdmin><AdminDashboard /></RequireAdmin>}>
                <Route path="/admin/users" element={<UsersAdmin />} />
                <Route path="/admin/users/new" element={<UserForm />} />
                <Route path="/admin/users/:id/edit" element={<UserForm />} />
                <Route path="/admin/items" element={<ItemsAdmin />} />
                <Route path="/admin/items/new" element={<ItemForm />} />
                <Route path="/admin/items/:id/edit" element={<ItemForm />} />
                <Route path="/admin/outfits" element={<OutfitsAdmin />} />
                <Route path="/admin/outfits/new" element={<OutfitForm />} />
                <Route path="/admin/outfits/:id/edit" element={<OutfitForm />} />
              </Route>
            </Route>
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </FavoritesProvider>
    </CartProvider>
  )
}

export default App
