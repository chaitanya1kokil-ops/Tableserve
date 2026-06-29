import { useRef, useState, useEffect } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { imageUrl } from '../lib/supabase'

/**
 * Image picker with preview. Does NOT upload — it hands the chosen File to the
 * parent via onChange(file), and the parent uploads at the right moment (once
 * it knows the restaurant/item id needed for the storage path).
 *
 * Props:
 *  - value: existing storage path or URL (string|null)
 *  - onChange: (file: File|null) => void   // null = "remove"
 *  - shape: 'square' | 'wide'
 */
export default function ImageUpload({ value, onChange, shape = 'square', label = 'Add photo' }) {
  const inputRef = useRef(null)
  const [preview, setPreview] = useState(null)

  // Revoke object URLs to avoid leaks.
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const existing = value ? imageUrl(value) : null
  const shown = preview || existing

  const pick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    onChange(file)
  }

  const clear = (e) => {
    e.stopPropagation()
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
    onChange(null)
  }

  const aspect = shape === 'wide' ? 'aspect-[16/9]' : 'aspect-square'

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`group relative flex w-full ${aspect} items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 text-gray-400 transition hover:border-gray-400`}
      >
        {shown ? (
          <>
            <img src={shown} alt="" className="h-full w-full object-cover" />
            <span
              onClick={clear}
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </span>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-center">
            <ImagePlus className="h-7 w-7" />
            <span className="text-xs font-medium">{label}</span>
          </div>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={pick}
      />
    </div>
  )
}
