
import { cn } from "@/lib/utils"

interface FormattedBalanceProps {
  value: string | number
  className?: string
  smDecimals?: number // Decimals for small amounts (< 1)
  lgDecimals?: number // Decimals for large amounts (>= 1)
}

export function FormattedBalance({ 
  value, 
  className,
  smDecimals = 4,
  lgDecimals = 2
}: FormattedBalanceProps) {
  // Handle empty/loading states
  if (value === undefined || value === null || value === '') {
    return <span className={className}>0.00</span>
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value
  const isSmall = Math.abs(numValue) < 1 && Math.abs(numValue) > 0
  
  // Format based on magnitude
  // We use standard string formatting first to get the max precision we care about
  // Then split it manually
  const fullStr = numValue.toFixed(8)
  const [integerPart, fractionalPart] = fullStr.split('.')
  
  // Determine where to split the "primary" vs "secondary" decimals
  const splitIndex = isSmall ? smDecimals : lgDecimals
  
  const primaryDecimals = fractionalPart.slice(0, splitIndex)
  const secondaryDecimals = fractionalPart.slice(splitIndex)

  return (
    <span className={cn("inline-flex items-baseline", className)}>
      <span>
        {integerPart}
        <span className="text-[0.9em]">.{primaryDecimals}</span>
      </span>
      {/* Show secondary decimals with a different style */}
      <span className="text-[0.6em] text-muted-foreground ml-[1px] font-medium opacity-70">
        {secondaryDecimals}
      </span>
    </span>
  )
}
