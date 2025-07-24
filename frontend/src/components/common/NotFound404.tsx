import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Button } from '../ui/button'
import { ShoppingBag, Home, LayoutGrid, Heart, Store } from 'lucide-react'

const NotFound404 = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <Helmet>
        <title>Страница не найдена — TRC</title>
        <meta name="description" content="Ошибка 404: страница не найдена. Перейдите на главную или в другие разделы TRC." />
      </Helmet>
      <div className="mb-8 flex flex-col items-center">
        <ShoppingBag className="h-16 w-16 text-primary mb-4" />
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">Упс! Такой страницы не существует.</p>
      </div>
      <div className="grid gap-3 w-full max-w-xs mx-auto mb-8">
        <Button asChild variant="outline" className="w-full flex items-center gap-2 justify-center">
          <Link to="/home"><Home className="h-5 w-5" /> На главную</Link>
        </Button>
        <Button asChild variant="outline" className="w-full flex items-center gap-2 justify-center">
          <Link to="/items"><LayoutGrid className="h-5 w-5" /> Каталог</Link>
        </Button>
        <Button asChild variant="outline" className="w-full flex items-center gap-2 justify-center">
          <Link to="/outfits"><LayoutGrid className="h-5 w-5" /> Образы</Link>
        </Button>
        <Button asChild variant="outline" className="w-full flex items-center gap-2 justify-center">
          <Link to="/favorites"><Heart className="h-5 w-5" /> Избранное</Link>
        </Button>
        <Button asChild variant="outline" className="w-full flex items-center gap-2 justify-center">
          <Link to="/shops"><Store className="h-5 w-5" /> Магазины</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">Если вы считаете, что это ошибка — <a href="mailto:support@trc.works" className="underline">напишите нам</a>.</p>
    </div>
  )
}

export default NotFound404 