/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Type errors now FAIL the build, as they should.
    //
    // This was `true` while the repo carried 8 pre-existing errors — all
    // caused by Transaction being declared twice with incompatible
    // ownerType/expenseType types, plus edit-form props that were never
    // narrowed. Suppressing them also hid two genuine bugs: the income
    // page's list handlers were wired to prop names the component doesn't
    // declare (so view/edit silently did nothing), and its "Add New Income"
    // dialog opened as an Expense. Both are fixed; keep this `false` so the
    // next one like it can't reach production.
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    /**
     * Tree-shake barrel imports.
     *
     * `import * as LucideIcons from "lucide-react"` (dashboard.tsx,
     * transactions/page.tsx) otherwise pulls the entire icon set into the
     * bundle, and recharts re-exports a large d3 surface. This rewrites those
     * to per-module imports at build time, so only the icons and chart
     * primitives actually referenced get bundled.
     */
    optimizePackageImports: ['lucide-react', 'recharts', 'date-fns'],
  },
}

export default nextConfig
