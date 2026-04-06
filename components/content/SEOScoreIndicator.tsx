import { getScoreColor, getScoreLabel } from '@/lib/utils/seo-score'

interface SEOScoreIndicatorProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

export default function SEOScoreIndicator({ score, size = 'md' }: SEOScoreIndicatorProps) {
  const sizeClasses = {
    sm: 'h-12 w-12 text-lg',
    md: 'h-16 w-16 text-2xl',
    lg: 'h-24 w-24 text-4xl',
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`flex items-center justify-center rounded-full border-4 font-mono font-bold ${sizeClasses[size]} ${getScoreColor(score)} ${score >= 80 ? 'border-green-500/30' : score >= 60 ? 'border-yellow-500/30' : 'border-red-500/30'}`}>
        {score}
      </div>
      <span className="text-xs text-muted-foreground">{getScoreLabel(score)}</span>
    </div>
  )
}
