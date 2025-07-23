import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ItemImage from './ItemImage'

interface ImageCarouselProps {
  images: string[]
  className?: string
  aspectClassName?: string // utility class for aspect ratio wrapper
}

const swipeConfidenceThreshold = 10000 // Adjust as needed

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, className = '', aspectClassName = 'aspect-square' }) => {
  const [[page, direction], setPage] = useState<[number, number]>([0, 0])

  if (images.length === 0) {
    return null
  }

  const imageIndex = ((page % images.length) + images.length) % images.length

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir < 0 ? 300 : -300, opacity: 0 })
  }

  const paginate = (newDir: number) => {
    setPage([page + newDir, newDir])
  }

  // Convert image URLs to use current domain if they start with /uploads/
  const processedImages = images.map(img => 
    img.startsWith('/uploads/') ? `${window.location.origin}${img}` : img
  )

  return (
    <div className={`relative overflow-hidden rounded-md border border-border bg-background ${aspectClassName} ${className}`}>{
      /* Wrapper for correct aspect ratio */
    }
      <AnimatePresence custom={direction} initial={false}>
        <motion.div
          key={imageIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ x: { type: 'spring', stiffness: 300, damping: 30 }, opacity: { duration: 0.2 } }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_e, { offset, velocity }) => {
            const swipePower = Math.abs(offset.x) * velocity.x
            if (swipePower < -swipeConfidenceThreshold) {
              paginate(1)
            } else if (swipePower > swipeConfidenceThreshold) {
              paginate(-1)
            }
          }}
          className="h-full w-full object-contain select-none"
        >
          <ItemImage
            src={processedImages[imageIndex]}
            alt={`Изображение ${imageIndex + 1}`}
            className="h-full w-full object-contain select-none"
            width={200}
            height={200}
          />
        </motion.div>
      </AnimatePresence>
      {/* Pagination Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex justify-center gap-1 rounded-full bg-black/30 px-2 py-1 backdrop-blur-sm">
          {images.map((_, idx) => (
            <span
              key={idx}
              className={`block h-1.5 w-1.5 rounded-full transition-colors ${idx === imageIndex ? 'bg-white/90' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default ImageCarousel 