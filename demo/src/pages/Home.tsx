import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { FlaskConical, ArrowRight } from 'lucide-react'

export function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">POC Labs</h1>
        <p className="text-muted-foreground mt-2">
          Proof-of-Concept implementations for EIP standards on BNB Chain
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/eip-8056">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <FlaskConical className="h-8 w-8 text-primary" />
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="mt-4">EIP-8056</CardTitle>
              <CardDescription>Scaled UI Amount Extension</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                A non-rebasing token balance scaling mechanism for improved UX.
                Set a global multiplier to display scaled amounts without modifying on-chain balances.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Card className="opacity-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <FlaskConical className="h-8 w-8" />
              <span className="text-xs bg-muted px-2 py-1 rounded">Coming Soon</span>
            </div>
            <CardTitle className="mt-4">EIP-8004</CardTitle>
            <CardDescription>Placeholder</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Future POC implementation.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
