import { SkeletonBlock, SkeletonRows } from "@/components/ui/states"

/**
 * Mirrors the real Transactions layout so there is no shift when data lands:
 * header row → tab bar → card with toolbar → table rows.
 */
export default function TransactionsLoading() {
  return (
    <div className="space-y-4 3xl:max-w-7xl 3xl:mx-auto w-full">
      {/* Header: title + month picker, actions on the right */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
          <SkeletonBlock className="h-8 w-44" />
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 w-40 rounded-lg" />
          <SkeletonBlock className="h-9 w-40 rounded-lg" />
        </div>
      </div>

      {/* Tab bar */}
      <SkeletonBlock className="h-10 w-full rounded-lg" />

      {/* Table card */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between gap-4 border-b px-4 py-4">
          <div className="space-y-1.5">
            <SkeletonBlock className="h-4 w-48" />
            <SkeletonBlock className="h-3 w-32" />
          </div>
          <SkeletonBlock className="h-9 w-36 rounded-lg" />
        </div>

        <div className="flex items-center gap-3 border-b px-4 py-3">
          <SkeletonBlock className="h-9 flex-1 rounded-lg" />
          <SkeletonBlock className="h-9 w-28 rounded-lg" />
        </div>

        <SkeletonRows rows={10} columns={5} />
      </div>
    </div>
  )
}
