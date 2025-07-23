import React from 'react'
import { ShoppingBag } from 'lucide-react'

interface ItemImageProps {
  src?: string | null
  alt: string
  className?: string
  fallbackClassName?: string
  style?: React.CSSProperties
}

const ItemImage: React.FC<ItemImageProps> = ({ 
  src, 
  alt, 
  className = "", 
  fallbackClassName = "",
  style 
}) => {
  // Если изображение начинается с /uploads/, используем текущий домен
  const imageUrl = src?.startsWith('/uploads/') 
    ? `${window.location.origin}${src}` 
    : src

  if (!imageUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted ${fallbackClassName}`}>
        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      style={style}
      onError={(e) => {
        const target = e.target as HTMLImageElement
        const parent = target.parentElement
        if (parent) {
          target.style.display = 'none'
          const fallbackDiv = document.createElement('div')
          fallbackDiv.className = `flex items-center justify-center bg-muted ${fallbackClassName}`
          fallbackDiv.innerHTML = `
            <svg class="h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
            </svg>
          `
          parent.appendChild(fallbackDiv)
        }
      }}
    />
  )
}

export default ItemImage 