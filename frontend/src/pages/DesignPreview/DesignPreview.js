import React from 'react';
import { Sparkles, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { MoneyValue } from '../../components/ui/money-value';
import { ThemeToggle } from '../../components/theme-toggle';

/**
 * Design preview page — renders the new shadcn/Tailwind components in
 * Finora's design tokens so we can iterate on the visual direction
 * before migrating real pages.
 *
 * Visit /design-preview while logged out (or in) to see this. Existing
 * pages are untouched and still render via Bootstrap.
 */
export default function DesignPreview() {
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 font-sans">
      {/* Hero */}
      <section className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-gradient grid place-items-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Finora — design preview</h1>
              <p className="text-sm text-muted-foreground">Phase 2.7 design system, live components</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Stat cards row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Net cashflow this month</CardDescription>
              <CardTitle className="text-3xl">
                <MoneyValue value={42850.5} colorize showSign="always" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-[hsl(var(--gain))]">
                <TrendingUp className="h-4 w-4 mr-1" />
                +12.4% vs last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total spend</CardDescription>
              <CardTitle className="text-3xl">
                <MoneyValue value={28140} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-[hsl(var(--loss))]">
                <TrendingDown className="h-4 w-4 mr-1" />
                Food & dining is up 18%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-brand-gradient text-white border-none">
            <CardHeader className="pb-2">
              <CardDescription className="text-white/80">AI insight ready</CardDescription>
              <CardTitle className="text-xl text-white">
                You're on track to save ₹6,500 by month-end if you skip 2 takeaway nights.
              </CardTitle>
            </CardHeader>
            <CardFooter>
              <Button variant="secondary" size="sm">
                See full insight <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Form preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Add transaction</CardTitle>
              <CardDescription>This is what every form will feel like.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input id="amount" type="number" placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" placeholder="Groceries" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="note">Note</Label>
                <Input id="note" placeholder="Weekly shop at Big Bazaar" />
              </div>
            </CardContent>
            <CardFooter className="flex gap-2 justify-end">
              <Button variant="ghost">Cancel</Button>
              <Button variant="gradient">Save transaction</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Button variants</CardTitle>
              <CardDescription>Same primitives, different intents.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button>Default</Button>
              <Button variant="gradient">Gradient</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Delete</Button>
              <Button variant="link">Forgot password?</Button>
            </CardContent>
          </Card>
        </div>

        {/* Money values strip */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>Tabular numerals</CardTitle>
            <CardDescription>Numbers right-align in a column. Always.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-right max-w-xs ml-auto">
              <div className="flex justify-between"><span className="text-muted-foreground">Salary</span><MoneyValue value={120000} colorize showSign="always" /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Rent</span><MoneyValue value={-25000} colorize /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Groceries</span><MoneyValue value={-8420.5} colorize /></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Investments</span><MoneyValue value={-15000} colorize /></div>
              <div className="flex justify-between border-t pt-2 font-medium"><span>Net</span><MoneyValue value={71579.5} colorize showSign="always" /></div>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          This is a preview. Real pages migrate page-by-page in Phases 2.7.2 onward.
        </p>
      </section>
    </div>
  );
}
