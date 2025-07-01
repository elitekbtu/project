import { Link } from 'react-router-dom'
import { Button } from '../ui/button'
import { Card, CardContent, CardFooter } from '../ui/card'
import { Minus, Plus, ShoppingCart, Trash } from 'lucide-react'
import { useCart } from '../../context/CartContext'

const Cart = () => {
  const { items, totalPrice, totalItems, updateQuantity, removeItem, clearCart } = useCart()

  if (items.length === 0) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center gap-4 px-4 py-16 text-muted-foreground">
        <ShoppingCart className="h-12 w-12" />
        <p>Ваша корзина пуста</p>
        <Button asChild>
          <Link to="/items">Перейти к товарам</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">Корзина</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="flex flex-col sm:flex-row overflow-hidden">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="h-40 w-full sm:w-32 object-cover"
                />
              )}
              <CardContent className="flex flex-1 flex-col gap-2 p-4">
                <h3 className="font-medium">{item.name}</h3>
                {(item.size || item.color) && (
                  <p className="text-xs text-muted-foreground">
                    {item.size && <span>Размер: {item.size} </span>}
                    {item.color && <span>Цвет: {item.color}</span>}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">{item.price.toLocaleString()} ₸</p>
                <div className="mt-auto flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={item.quantity <= 1}
                    onClick={() => item.quantity > 1 && updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span>{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={item.stock !== undefined && item.quantity >= item.stock}
                    onClick={() => {
                      if (item.stock !== undefined && item.quantity >= item.stock) return
                      updateQuantity(item.id, item.quantity + 1)
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  {item.stock !== undefined && (
                    <span className="text-xs text-muted-foreground text-nowrap">из {item.stock}</span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between p-4 sm:flex-col sm:justify-center sm:gap-2">
                <p className="font-semibold">
                  {(item.price * item.quantity).toLocaleString()} ₸
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card className="h-fit">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-xl font-medium">Итого</h2>
            <div className="flex items-center justify-between text-sm">
              <span>Товары</span>
              <span>{totalItems}</span>
            </div>
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Сумма</span>
              <span>{totalPrice.toLocaleString()} ₸</span>
            </div>
            <Button className="w-full">Оформить заказ</Button>
            <Button variant="outline" className="w-full" onClick={clearCart}>
              Очистить корзину
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Cart 