"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, MapPin, Building2, Gem, Car, Wrench, Package,
  TrendingUp, IndianRupee, Link2, ArrowUpRight, ArrowDownRight, Info, Pencil,
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { apiClient } from "@/lib/apiClient"
import { apiUrl } from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────

type AssetType   = "Land" | "Property / Flat" | "Physical Gold" | "Vehicle" | "Equipment" | "Other Asset"
type AssetStatus = "active" | "sold"

interface Asset {
  id: string
  name: string
  assetType: AssetType
  purchaseDate: string
  purchasePrice: number
  currentValue: number    // user-updated estimate; defaults to purchasePrice
  description?: string
  location?: string
  linkedLoanBank?: string // "YES Bank" etc.
  status: AssetStatus
}

// ─── Type config ──────────────────────────────────────────────────────────────

const ASSET_TYPES: AssetType[] = [
  "Land", "Property / Flat", "Physical Gold", "Vehicle", "Equipment", "Other Asset",
]

const TYPE_CFG: Record<AssetType, { color: string; bg: string }> = {
  "Land":            { color: "#15803d", bg: "#f0fdf4" },
  "Property / Flat": { color: "#0369a1", bg: "#eff6ff" },
  "Physical Gold":   { color: "#d97706", bg: "#fffbeb" },
  "Vehicle":         { color: "#6d28d9", bg: "#f5f3ff" },
  "Equipment":       { color: "#475569", bg: "#f8fafc" },
  "Other Asset":     { color: "#be185d", bg: "#fdf2f8" },
}

function AssetIcon({ type }: { type: AssetType }) {
  const cls = "h-5 w-5"
  switch (type) {
    case "Land":             return <MapPin    className={cls} />
    case "Property / Flat":  return <Building2 className={cls} />
    case "Physical Gold":    return <Gem       className={cls} />
    case "Vehicle":          return <Car       className={cls} />
    case "Equipment":        return <Wrench    className={cls} />
    default:                 return <Package   className={cls} />
  }
}

// ─── Static sample data (commented out — now fully dynamic from API) ──────────

const STATIC_ASSETS: Asset[] = [
  {
    id: "land-hyd-2026",
    name: "Residential Plot — Hyderabad",
    assetType: "Land",
    purchaseDate: "2026-07-15",
    purchasePrice: 15_00_000,
    currentValue:  15_00_000,
    description: "200 sq yards residential plot",
    location: "Hyderabad, Telangana",
    linkedLoanBank: "YES Bank",
    status: "active",
  },
  {
    id: "gold-jewelry-2024",
    name: "Gold Jewelry — Wedding Set",
    assetType: "Physical Gold",
    purchaseDate: "2024-11-10",
    purchasePrice: 1_80_000,
    currentValue:  2_10_000,
    description: "22 KT gold jewelry, ~25g",
    status: "active",
  },
]

// ─── API Transform Helper ─────────────────────────────────────────────────────

function transformApiAsset(raw: any): Asset {
  return {
    id: String(raw.id),
    name: raw.asset_name,
    assetType: raw.asset_type as AssetType,
    purchasePrice: parseFloat(raw.purchase_price),
    currentValue: parseFloat(raw.current_value),
    purchaseDate: raw.purchase_date,
    status: (raw.status === "sold" ? "sold" : "active") as AssetStatus,
    linkedLoanBank: raw.linked_loan
      ? `${raw.linked_loan.lender_name} — ${raw.linked_loan.loan_name}`
      : undefined,
    location: raw.location || undefined,
    description: raw.notes || undefined,
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtINR  = (n: number) => "₹" + Math.abs(Math.round(n)).toLocaleString("en-IN")
const fmtDate = (s: string) => { try { return format(parseISO(s), "dd MMM yyyy") } catch { return s } }

// ─── Add Asset dialog ─────────────────────────────────────────────────────────

type FormState = {
  name: string; assetType: AssetType; purchaseDate: string
  purchasePrice: string; currentValue: string
  description: string; location: string; linkedLoanId: string
}

const BLANK_FORM: FormState = {
  name: "", assetType: "Land", purchaseDate: "", purchasePrice: "",
  currentValue: "", description: "", location: "", linkedLoanId: "",
}

function AddAssetDialog({
  availableLoans,
  onSuccess,
  setAssets,
}: {
  availableLoans: { id: string; label: string }[]
  onSuccess?: () => void
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>({ ...BLANK_FORM })
  const set = (k: keyof FormState, v: string) => setForm(p => ({ ...p, [k]: v }))

  const isValid = form.name.trim() && Number(form.purchasePrice) > 0 && form.purchaseDate

  const handleAdd = async () => {
    try {
      const res = await apiClient(apiUrl("/assets/store"), {
        method: "POST",
        body: JSON.stringify({
          asset_name: form.name.trim(),
          asset_type: form.assetType,
          purchase_price: Number(form.purchasePrice),
          current_value: Number(form.currentValue) || Number(form.purchasePrice),
          purchase_date: form.purchaseDate,
          linked_loan_id: form.linkedLoanId || null,
          location: form.location || null,
          notes: form.description || null,
          create_transaction: true,
        }),
      })
      if (res.ok) {
        const listRes = await apiClient(apiUrl("/assets/listing"))
        if (listRes.ok) {
          const json = await listRes.json()
          if (json.data?.length) {
            setAssets(json.data.map(transformApiAsset))
          }
        }
        setForm({ ...BLANK_FORM })
        setOpen(false)
        onSuccess?.()
      }
    } catch (e) {
      console.error("Failed to save asset", e)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-black text-white hover:bg-gray-800 gap-1.5">
          <Plus className="h-4 w-4" /> Add Asset
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px] flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle>Add New Asset</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Asset Name *</Label>
            <Input placeholder="e.g. Residential Plot — Hyderabad" value={form.name} onChange={e => set("name", e.target.value)} />
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Asset Type *</Label>
            <Select value={form.assetType} onValueChange={v => set("assetType", v as AssetType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ASSET_TYPES.map(t => (
                  <SelectItem key={t} value={t}>
                    <span className="flex items-center gap-2">
                      <span>{t}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Purchase Price (₹) *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input className="pl-9" placeholder="15,00,000" inputMode="numeric"
                  value={form.purchasePrice} onChange={e => set("purchasePrice", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Current Est. Value (₹)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input className="pl-9" placeholder="Leave blank = purchase price" inputMode="numeric"
                  value={form.currentValue} onChange={e => set("currentValue", e.target.value)} />
              </div>
              <p className="text-[11px] text-muted-foreground">Update anytime as value changes</p>
            </div>
          </div>

          {/* Dates + linked loan */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Purchase Date *</Label>
              <Input type="date" value={form.purchaseDate} onChange={e => set("purchaseDate", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Funded by Loan</Label>
              <Select
                value={form.linkedLoanId || "none"}
                onValueChange={v => set("linkedLoanId", v === "none" ? "" : v)}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availableLoans.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Location (optional)</Label>
            <Input placeholder="e.g. Hyderabad, Telangana" value={form.location} onChange={e => set("location", e.target.value)} />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes / Description</Label>
            <Textarea rows={2} placeholder="e.g. 200 sq yards, registration pending..."
              value={form.description} onChange={e => set("description", e.target.value)} />
          </div>
        </div>

        <div className="px-5 py-4 border-t shrink-0 flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setForm({ ...BLANK_FORM }); setOpen(false) }}>Cancel</Button>
          <Button className="bg-black text-white hover:bg-gray-800" disabled={!isValid} onClick={handleAdd}>
            Add Asset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Asset Dialog ────────────────────────────────────────────────────────

function EditAssetDialog({
  asset,
  availableLoans,
  setAssets,
}: {
  asset: Asset
  availableLoans: { id: string; label: string }[]
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name:         asset.name,
    currentValue: String(asset.currentValue),
    location:     asset.location     || "",
    description:  asset.description  || "",
    linkedLoanId: "",   // we don't have the raw ID on the frontend type, so leave blank
  })

  // Reset form to latest asset values whenever dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setForm({
        name:         asset.name,
        currentValue: String(asset.currentValue),
        location:     asset.location    || "",
        description:  asset.description || "",
        linkedLoanId: "",
      })
    }
    setOpen(v)
  }

  const set = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  const isValid = form.name.trim() && Number(form.currentValue) > 0

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, any> = {
        asset_name:    form.name.trim(),
        current_value: Number(form.currentValue),
        location:      form.location.trim()     || null,
        notes:         form.description.trim()  || null,
      }
      if (form.linkedLoanId) body.linked_loan_id = form.linkedLoanId

      const res = await apiClient(apiUrl(`/assets/${asset.id}`), {
        method: "PUT",
        body: JSON.stringify(body),
      })
      if (res.ok) {
        // Refresh full list
        const listRes = await apiClient(apiUrl("/assets/listing"))
        if (listRes.ok) {
          const json = await listRes.json()
          if (json.data?.length) setAssets(json.data.map(transformApiAsset))
        }
        setOpen(false)
      }
    } catch (e) {
      console.error("Failed to update asset", e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Edit asset"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[460px] flex flex-col max-h-[90vh] p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle>Edit Asset</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Asset Name</Label>
            <input
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={form.name}
              onChange={e => set("name", e.target.value)}
            />
          </div>

          {/* Current Value */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Current Est. Value (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                inputMode="numeric"
                placeholder={String(asset.currentValue)}
                value={form.currentValue}
                onChange={e => set("currentValue", e.target.value)}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">Purchase price: {fmtINR(asset.purchasePrice)}</p>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Notes / Description</Label>
            <Textarea
              placeholder="e.g. 200 sq yards residential plot, 22 KT gold..."
              rows={3}
              value={form.description}
              onChange={e => set("description", e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">Location (optional)</Label>
            <Input
              placeholder="e.g. Hyderabad, Telangana"
              value={form.location}
              onChange={e => set("location", e.target.value)}
            />
          </div>

          {/* Linked Loan (optional reassign) */}
          {availableLoans.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Linked Loan (optional)</Label>
              <Select value={form.linkedLoanId} onValueChange={v => set("linkedLoanId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder={asset.linkedLoanBank || "None"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {availableLoans.map(l => (
                    <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t shrink-0 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4"
          >
            Cancel
          </button>
          <Button
            className="bg-black text-white hover:bg-gray-800"
            disabled={!isValid || saving}
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Asset card ───────────────────────────────────────────────────────────────

function AssetCard({
  asset,
  availableLoans,
  setAssets,
}: {
  asset: Asset
  availableLoans: { id: string; label: string }[]
  setAssets: React.Dispatch<React.SetStateAction<Asset[]>>
}) {
  const cfg     = TYPE_CFG[asset.assetType]
  const gain    = asset.currentValue - asset.purchasePrice
  const gainPct = asset.purchasePrice > 0 ? (gain / asset.purchasePrice) * 100 : 0
  const up      = gain >= 0

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="h-1 w-full" style={{ backgroundColor: cfg.color }} />
      <CardContent className="p-5 space-y-4">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                 style={{ backgroundColor: cfg.bg }}>
              <span style={{ color: cfg.color }}><AssetIcon type={asset.assetType} /></span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{asset.name}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <Badge className="text-[10px] px-1.5 py-0 font-medium border-0"
                       style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                  {asset.assetType}
                </Badge>
                {asset.linkedLoanBank && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
                    <Link2 className="h-2.5 w-2.5" />
                    {asset.linkedLoanBank}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Value + gain + edit */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1.5">
              <EditAssetDialog asset={asset} availableLoans={availableLoans} setAssets={setAssets} />
              <p className="text-lg font-bold tabular-nums">{fmtINR(asset.currentValue)}</p>
            </div>
            <div className={`flex items-center justify-end gap-0.5 text-xs font-semibold ${up ? "text-emerald-600" : "text-red-600"}`}>
              {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {fmtINR(Math.abs(gain))} ({up ? "+" : ""}{gainPct.toFixed(1)}%)
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Purchase Price</p>
            <p className="text-sm font-bold tabular-nums mt-0.5">{fmtINR(asset.purchasePrice)}</p>
          </div>
          <div className="rounded-xl bg-muted/40 px-3 py-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Purchase Date</p>
            <p className="text-sm font-bold mt-0.5">{fmtDate(asset.purchaseDate)}</p>
          </div>
          {(asset.description || asset.location) && (
            <div className="rounded-xl bg-muted/40 px-3 py-2 col-span-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {asset.description ? "Notes" : "Location"}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {asset.description || asset.location}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function AssetsTab() {
  const [assets,         setAssets]         = useState<Asset[]>(STATIC_ASSETS)
  const [loading,        setLoading]        = useState(true)
  const [availableLoans, setAvailableLoans] = useState<{ id: string; label: string }[]>([])

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const res = await apiClient(apiUrl("/assets/listing"))
        if (res.ok) {
          const json = await res.json()
          if (json.data?.length) {
            setAssets(json.data.map(transformApiAsset))
          }
        }
      } catch (e) {
        console.error("Failed to fetch assets", e)
      } finally {
        setLoading(false)
      }
    }
    fetchAssets()
  }, [])

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const res = await apiClient(apiUrl("/loans/listing"))
        if (res.ok) {
          const json = await res.json()
          setAvailableLoans((json.data || []).map((l: any) => ({
            id: String(l.id),
            label: `${l.lender_name} — ${l.loan_name}`,
          })))
        }
      } catch (e) {}
    }
    fetchLoans()
  }, [])

  const active = assets.filter(a => a.status === "active")

  const totalValue    = active.reduce((s, a) => s + a.currentValue,   0)
  const totalInvested = active.reduce((s, a) => s + a.purchasePrice,  0)
  const totalGain     = totalValue - totalInvested
  const gainPct       = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Asset Portfolio</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Physical assets — land, gold, vehicles &amp; property
          </p>
        </div>
        <AddAssetDialog
          availableLoans={availableLoans}
          setAssets={setAssets}
        />
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: "Total Asset Value",
            value: fmtINR(totalValue),
            sub: "Current estimated value",
            cls: "text-blue-600",
          },
          {
            label: "Total Invested",
            value: fmtINR(totalInvested),
            sub: "Combined purchase cost",
            cls: "",
          },
          {
            label: "Unrealised Gain / Loss",
            value: `${totalGain >= 0 ? "+" : ""}${fmtINR(totalGain)}`,
            sub: `${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(2)}% overall`,
            cls: totalGain >= 0 ? "text-emerald-600" : "text-red-600",
          },
          {
            label: "Total Assets",
            value: String(active.length),
            sub: "Active holdings",
            cls: "",
          },
        ].map(t => (
          <div key={t.label} className="rounded-2xl border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">{t.label}</p>
            <p className={`text-xl font-bold tabular-nums mt-2 ${t.cls}`}>{t.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{t.sub}</p>
          </div>
        ))}
      </div>

      {/* Cards */}
      {active.length === 0 ? (
        <div className="rounded-2xl border border-dashed py-16 flex flex-col items-center gap-3 text-center">
          <Package className="h-10 w-10 text-muted-foreground opacity-30" />
          <div>
            <p className="font-medium">No assets yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add land, gold, property or any physical asset to start tracking your portfolio
            </p>
          </div>
          <AddAssetDialog
            availableLoans={availableLoans}
            setAssets={setAssets}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {active.map(a => (
            <AssetCard key={a.id} asset={a} availableLoans={availableLoans} setAssets={setAssets} />
          ))}
        </div>
      )}

      {/* Explainer note */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3.5 text-sm">
        <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <p className="text-blue-800 dark:text-blue-200">
          Asset purchases are <strong>not expenses</strong>. Buying land with loan money converts cash into
          an asset — your net worth stays the same. Only EMI interest erodes net worth.
          To record a purchase, add it here <em>and</em> add an <strong>Asset</strong> transaction in the
          Transactions page so the cash outflow appears in your records.
        </p>
      </div>
    </div>
  )
}
