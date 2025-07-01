import { Outlet } from 'react-router-dom'
import GuestNavbar from '../components/Guest/Navbar'
import GuestFooter from '../components/Guest/Footer'

const GuestLayout = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <GuestNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <GuestFooter />
    </div>
  )
}

export default GuestLayout 