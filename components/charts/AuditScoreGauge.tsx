import { getScoreColor, getScoreLabel } from '@/lib/utils/seo-score'

interface AuditScoreGaugeProps {
  score: number
  label?: string
}

export default function AuditScoreGauge({ score, label }: AuditScoreGaugeProps) {
  const circumference = 2 * Math.PI * 40
  const progress = (score / 100) * circumference

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444'}
            strokeWidth="8"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold font-mono ${getScoreColor(score)}`}>{score}</span>
        </div>
      </div>
      <span className="mt-1 text-xs text-muted-foreground">{label ?? getScoreLabel(score)}</span>
    </div>
  )
}
