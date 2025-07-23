import React from 'react'
import { ShoppingBag } from 'lucide-react'

interface ItemImageProps {
  src?: string | null
  alt: string
  className?: string
  fallbackClassName?: string
  style?: React.CSSProperties
  width?: number
  height?: number
}

const ItemImage: React.FC<ItemImageProps> = ({ 
  src, 
  alt, 
  className = "", 
  fallbackClassName = "",
  style,
  width = 100,
  height = 100
}) => {
  // Если изображение начинается с /uploads/, используем текущий домен
  let imageUrl = src?.startsWith('/uploads/') 
    ? `${window.location.origin}${src}` 
    : src

  // Не ресайзим data: и уже оптимизированные
  const isDirect = !imageUrl || imageUrl.startsWith('data:') || imageUrl.startsWith('/api/v1/catalog/image-resize')

  // Формируем URL ресайза
  const resizeUrl = !isDirect && imageUrl
    ? `/api/v1/catalog/image-resize?url=${encodeURIComponent(imageUrl)}&w=${width}&h=${height}&format=webp`
    : imageUrl
  const resizeUrl2x = !isDirect && imageUrl
    ? `/api/v1/catalog/image-resize?url=${encodeURIComponent(imageUrl)}&w=${width*2}&h=${height*2}&format=webp`
    : imageUrl

  if (!resizeUrl) {
    return (
      <div className={`flex items-center justify-center bg-muted ${fallbackClassName}`}>
        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
      </div>
    )
  }

  return (
    <img
      src={resizeUrl}
      srcSet={resizeUrl2x ? `${resizeUrl} 1x, ${resizeUrl2x} 2x` : undefined}
      width={width}
      height={height}
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