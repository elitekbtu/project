import { Home, ShoppingBag, LayoutGrid, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

const tabs = [
  { to: '/home', icon: Home, label: 'Главная' },
  { to: '/items', icon: ShoppingBag, label: 'Каталог' },
  { to: '/outfits', icon: LayoutGrid, label: 'Образы' },
  { to: '/profile', icon: User, label: 'Профиль' },
]

const BottomNav = () => {
  const location = useLocation()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t shadow-sm md:hidden min-h-[60px]">
      <ul className="grid grid-cols-4">
        {tabs.map((t) => {
          const active = location.pathname.startsWith(t.to)
          const Icon = t.icon
          return (
            <li key={t.to}>
              <Link
                to={t.to}
                className={`flex flex-col items-center justify-center py-4 pb-[env(safe-area-inset-bottom)] text-xs font-medium transition-colors ${
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5 mb-0.5" strokeWidth={active ? 2.5 : 1.5} />
                {t.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default BottomNav 