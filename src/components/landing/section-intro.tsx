import { cn } from "@/lib/utils"

/** Titlul și textul de deschidere al unei secțiuni, aliniate la stânga. */
export function SectionIntro({
  id,
  title,
  children,
  className,
}: {
  id: string
  title: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("max-w-measure", className)}>
      <h2 id={id} className="text-3xl sm:text-4xl">
        {title}
      </h2>
      {children && <div className="mt-4 space-y-4 text-lg">{children}</div>}
    </div>
  )
}
