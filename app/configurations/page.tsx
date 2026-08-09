"use client"

import { apiUrl } from "@/lib/api"
import { apiClient } from "@/lib/apiClient"
import { useAuth } from "@/context/AuthContext"
import { SearchableSelect } from "@/components/ui/searchable-select"

import type React from "react"
import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, CreditCardIcon, Bell, User } from "lucide-react"
import LayoutWrapper from "@/components/layout-wrapper"
import { useToast } from "@/components/ui/use-toast"
import CreditCardsTable from "@/components/credit-cards-table"
import { SkeletonRows, EmptyState } from "@/components/ui/states"
import { cn } from "@/lib/utils"

/**
 * Settings pages read best as a stack of labelled sections: a short heading,
 * one line explaining what the group controls, then the fields. Sections are
 * separated by a hairline (the parent supplies `divide-y`) instead of being
 * dumped into one flat form.
 */
function SettingsSection({
  title,
  description,
  children,
  className,
}: {
  title: string
  description: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("px-5 py-5", className)}>
      <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** Label + description on the left, switch right-aligned. */
function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 first:pt-0 last:pb-0">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5 shrink-0" />
    </div>
  )
}

const TAB_TRIGGER_CLASS = cn(
  "relative rounded-none border-b-2 border-transparent bg-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground shadow-none transition-colors",
  "hover:text-foreground",
  "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none",
)

interface CreditCardType {
  id: number
  card_name: string
  card_number: string
  card_limit: number
  billing_cycle_date: number
  due_days: number
  created_at?: string
}

interface TransformedCreditCard {
  id: string
  cardName: string
  cardNumber: string
  cardLimit: number
  billingCycleDate: number
  paymentDueDays: number
  createdAt: string
}

interface NotificationSettings {
  emailNotifications: boolean
  smsNotifications: boolean
  pushNotifications: boolean
  weeklyReports: boolean
  monthlyReports: boolean
  budgetAlerts: boolean
  paymentReminders: boolean
}

interface UserProfile {
  name: string
  email: string
  phone: string
  currency: string
  timezone: string
  dateFormat: string
}

function ConfigurationsPageContent() {
  const { toast } = useToast()
  const { user, isLoading: authLoading } = useAuth()
  const [creditCards, setCreditCards] = useState<TransformedCreditCard[]>([])
  const [showAddCard, setShowAddCard] = useState(false)
  const [editingCard, setEditingCard] = useState<CreditCardType | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [newCard, setNewCard] = useState({
    card_name: "",
    card_number: "",
    card_limit: "",
    billing_cycle_date: "",
    due_days: "",
  })

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    weeklyReports: true,
    monthlyReports: true,
    budgetAlerts: true,
    paymentReminders: true,
  })

  const [profile, setProfile] = useState<UserProfile>({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    currency: user?.currency ?? "INR",
    timezone: user?.timezone ?? "Asia/Kolkata",
    dateFormat: user?.date_format ?? "DD-MM-YYYY",
  })

  // Sync profile fields once the user object is available from AuthContext.
  // Initial useState uses user?.name etc. but user is null on first render
  // (auth is still bootstrapping), so the fields would stay empty without this.
  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name ?? "",
        email: user.email ?? "",
        phone: user.phone ?? "",
        currency: user.currency ?? "INR",
        timezone: user.timezone ?? "Asia/Kolkata",
        dateFormat: user.date_format ?? "DD-MM-YYYY",
      })
    }
  }, [user])

  // Wait for AuthContext to finish bootstrapping (restoring token from
  // sessionStorage) before making API calls. Child component effects fire
  // before parent effects, so without this guard the token would be null
  // on the first call → 401 Unauthorized.
  useEffect(() => {
    if (!authLoading) {
      fetchCreditCards()
    }
  }, [authLoading])

  const fetchCreditCards = async () => {
    setIsLoading(true)
    try {
      const response = await apiClient(apiUrl("configurations/listing"))
      const result = await response.json()

      if (result.status && result.data?.data) {
        const transformedCards: TransformedCreditCard[] = result.data.data.map((card: CreditCardType) => ({
          id: String(card.id),
          cardName: card.card_name,
          cardNumber: card.card_number,
          cardLimit: card.card_limit,
          billingCycleDate: card.billing_cycle_date,
          paymentDueDays: card.due_days,
          createdAt: card.created_at || new Date().toISOString(),
        }))
        setCreditCards(transformedCards)
      }
    } catch (error) {
      console.error("Failed to fetch credit cards:", error)
      toast({
        title: "Error",
        description: "Failed to fetch credit cards. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddCard = async () => {
    try {
      const payload = {
        card_name: newCard.card_name,
        card_number: newCard.card_number,
        card_limit: Number.parseInt(newCard.card_limit),
        billing_cycle_date: Number.parseInt(newCard.billing_cycle_date),
        due_days: Number.parseInt(newCard.due_days),
        user_id: user?.id,
      }

      const response = await apiClient(apiUrl("configurations/store"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.status) {
        setNewCard({
          card_name: "",
          card_number: "",
          card_limit: "",
          billing_cycle_date: "",
          due_days: "",
        })
        setShowAddCard(false)

        await fetchCreditCards()

        toast({
          title: "Success",
          description: "Credit card added successfully!",
          variant: "default",
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add credit card. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditCard = (card: TransformedCreditCard) => {
    // CreditCardsTable passes TransformedCreditCard (camelCase); map back to snake_case for editingCard
    const raw: CreditCardType = {
      id:                 Number(card.id),
      card_name:          card.cardName,
      card_number:        card.cardNumber,
      card_limit:         card.cardLimit,
      billing_cycle_date: card.billingCycleDate,
      due_days:           card.paymentDueDays,
      created_at:         card.createdAt,
    }
    setEditingCard(raw)
    setNewCard({
      card_name:          raw.card_name           || "",
      card_number:        raw.card_number         || "",
      card_limit:         raw.card_limit          ? raw.card_limit.toString()         : "",
      billing_cycle_date: raw.billing_cycle_date  ? raw.billing_cycle_date.toString() : "",
      due_days:           raw.due_days            ? raw.due_days.toString()           : "",
    })
    setShowAddCard(true)
  }

  const handleUpdateCard = async () => {
    if (!editingCard) return

    try {
      const payload = {
        id: editingCard.id,
        card_name: newCard.card_name,
        card_number: newCard.card_number,
        card_limit: Number.parseInt(newCard.card_limit),
        billing_cycle_date: Number.parseInt(newCard.billing_cycle_date),
        due_days: Number.parseInt(newCard.due_days),
        user_id: user?.id,
      }

      const response = await apiClient(apiUrl("configurations/update"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (result.status) {
        setEditingCard(null)
        setNewCard({
          card_name: "",
          card_number: "",
          card_limit: "",
          billing_cycle_date: "",
          due_days: "",
        })
        setShowAddCard(false)

        await fetchCreditCards()

        toast({
          title: "Success",
          description: "Credit card updated successfully!",
          variant: "default",
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update credit card. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteCard = async (cardId: number) => {
    try {
      const response = await apiClient(apiUrl("configurations/delete"), {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cardId }),
      })

      const result = await response.json()

      if (result.status) {
        await fetchCreditCards()

        toast({
          title: "Success",
          description: "Credit card deleted successfully!",
          variant: "default",
        })
      } else {
        throw new Error(result.message)
      }
    } catch (error) {
      console.error("[v0] Delete error:", error)
      toast({
        title: "Error",
        description: "Failed to delete credit card. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    setNotifications((prev) => ({ ...prev, [key]: value }))
    toast({
      title: "Settings Updated",
      description: "Notification preferences have been saved.",
      variant: "default",
    })
  }

  const handleProfileUpdate = async () => {
    try {
      const res = await apiClient(apiUrl("auth/me"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          currency: profile.currency,
          timezone: profile.timezone,
          date_format: profile.dateFormat,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.status) {
        throw new Error(data.message || "Failed to update profile")
      }

      toast({
        title: "Profile Updated",
        description: "Your profile information has been saved.",
        variant: "default",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6 3xl:max-w-7xl 3xl:mx-auto w-full">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Configurations</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Your profile, how you get notified, and the cards you track spending against.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        {/* Settings tabs — underline style, sized to content rather than three
            stretched full-width segments */}
        <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b bg-transparent p-0">
          {(
            [
              ["profile", "Profile"],
              ["notifications", "Notifications"],
              ["credit-cards", "Credit Cards"],
            ] as const
          ).map(([value, label]) => (
            <TabsTrigger key={value} value={value} className={TAB_TRIGGER_CLASS}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="credit-cards" className="mt-4">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b px-4 py-4">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
                  <CreditCardIcon className="h-4 w-4 text-muted-foreground" />
                  Credit cards
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Cards available when logging transactions
                  {creditCards.length > 0 && (
                    <>
                      {" · "}
                      <span className="tnum font-medium text-foreground">{creditCards.length}</span> saved
                    </>
                  )}
                </p>
              </div>
              <Dialog
                  open={showAddCard}
                  onOpenChange={(open) => {
                    if (!open) {
                      setEditingCard(null)
                      setNewCard({
                        card_name: "",
                        card_number: "",
                        card_limit: "",
                        billing_cycle_date: "",
                        due_days: "",
                      })
                    }
                    setShowAddCard(open)
                  }}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Card
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>{editingCard ? "Edit Credit Card" : "Add Credit Card"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="cardName">Card Name</Label>
                        <Input
                          id="cardName"
                          value={newCard.card_name}
                          onChange={(e) => setNewCard({ ...newCard, card_name: e.target.value })}
                          placeholder="e.g., Amazon ICICI, Axis MY Zone"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cardNumber">Card Number (Last 4 digits)</Label>
                        <Input
                          id="cardNumber"
                          value={newCard.card_number}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, "").slice(0, 4)
                            setNewCard({ ...newCard, card_number: value })
                          }}
                          placeholder="1234"
                          maxLength={4}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cardLimit">Credit Limit (₹)</Label>
                          <Input
                            id="cardLimit"
                            type="number"
                            value={newCard.card_limit}
                            onChange={(e) => setNewCard({ ...newCard, card_limit: e.target.value })}
                            placeholder="200000"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="billingCycleDate">Billing Cycle Date</Label>
                          <Input
                            id="billingCycleDate"
                            type="number"
                            min="1"
                            max="31"
                            value={newCard.billing_cycle_date}
                            onChange={(e) => setNewCard({ ...newCard, billing_cycle_date: e.target.value })}
                            placeholder="e.g., 14, 22"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dueDays">Due Days</Label>
                        <Input
                          id="dueDays"
                          type="number"
                          value={newCard.due_days}
                          onChange={(e) => setNewCard({ ...newCard, due_days: e.target.value })}
                          placeholder="e.g., 18, 20"
                        />
                      </div>
                      <div className="flex justify-end space-x-2 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowAddCard(false)
                            setEditingCard(null)
                            setNewCard({
                              card_name: "",
                              card_number: "",
                              card_limit: "",
                              billing_cycle_date: "",
                              due_days: "",
                            })
                          }}
                        >
                          Cancel
                        </Button>
                        <Button onClick={editingCard ? handleUpdateCard : handleAddCard}>
                          {editingCard ? "Update Card" : "Add Card"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

            {isLoading ? (
              <SkeletonRows rows={3} columns={5} />
            ) : creditCards.length === 0 ? (
              <EmptyState
                icon={CreditCardIcon}
                title="No cards yet"
                description="Add a credit card to start attributing transactions to it."
                action={
                  <Button size="sm" onClick={() => setShowAddCard(true)}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add card
                  </Button>
                }
              />
            ) : (
              <CreditCardsTable
                creditCards={creditCards}
                onEdit={handleEditCard}
                onDelete={handleDeleteCard}
              />
            )}
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card className="max-w-2xl divide-y overflow-hidden">
            <div className="px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
                <Bell className="h-4 w-4 text-muted-foreground" />
                Notifications
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Choose how and when Finance Tracker reaches you.
              </p>
            </div>

            <SettingsSection
              title="Communication preferences"
              description="Where notifications are delivered."
            >
              <div className="divide-y">
                <ToggleRow
                  id="email-notifications"
                  label="Email"
                  description="Receive notifications by email"
                  checked={notifications.emailNotifications}
                  onCheckedChange={(checked) => handleNotificationChange("emailNotifications", checked)}
                />
                <ToggleRow
                  id="sms-notifications"
                  label="SMS"
                  description="Receive notifications by text message"
                  checked={notifications.smsNotifications}
                  onCheckedChange={(checked) => handleNotificationChange("smsNotifications", checked)}
                />
                <ToggleRow
                  id="push-notifications"
                  label="Push"
                  description="Receive notifications in the browser"
                  checked={notifications.pushNotifications}
                  onCheckedChange={(checked) => handleNotificationChange("pushNotifications", checked)}
                />
              </div>
            </SettingsSection>

            <SettingsSection
              title="Reports and alerts"
              description="Recurring summaries and threshold warnings."
            >
              <div className="divide-y">
                <ToggleRow
                  id="weekly-reports"
                  label="Weekly reports"
                  description="A spending summary every week"
                  checked={notifications.weeklyReports}
                  onCheckedChange={(checked) => handleNotificationChange("weeklyReports", checked)}
                />
                <ToggleRow
                  id="monthly-reports"
                  label="Monthly reports"
                  description="A full financial report each month"
                  checked={notifications.monthlyReports}
                  onCheckedChange={(checked) => handleNotificationChange("monthlyReports", checked)}
                />
                <ToggleRow
                  id="budget-alerts"
                  label="Budget alerts"
                  description="Warn me as I approach a budget limit"
                  checked={notifications.budgetAlerts}
                  onCheckedChange={(checked) => handleNotificationChange("budgetAlerts", checked)}
                />
                <ToggleRow
                  id="payment-reminders"
                  label="Payment reminders"
                  description="Remind me before a payment falls due"
                  checked={notifications.paymentReminders}
                  onCheckedChange={(checked) => handleNotificationChange("paymentReminders", checked)}
                />
              </div>
            </SettingsSection>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <Card className="max-w-2xl divide-y overflow-hidden">
            <div className="px-5 py-4">
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground">
                <User className="h-4 w-4 text-muted-foreground" />
                Profile
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Your details and how figures are formatted across the app.
              </p>
            </div>

            <SettingsSection
              title="Personal details"
              description="How you're identified in the app."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium">
                    Full name
                  </Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="phone" className="text-xs font-medium">
                    Phone number
                  </Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
              </div>
            </SettingsSection>

            <SettingsSection
              title="Regional format"
              description="Applies to every amount and date shown across the app."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Currency</Label>
                  <SearchableSelect
                    value={profile.currency}
                    onValueChange={(value) => setProfile({ ...profile, currency: value })}
                    placeholder="Select currency"
                    searchPlaceholder="Search currency…"
                    options={[
                      { value: "INR", label: "Indian Rupee (₹)" },
                      { value: "USD", label: "US Dollar ($)" },
                      { value: "EUR", label: "Euro (€)" },
                      { value: "GBP", label: "British Pound (£)" },
                    ]}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Timezone</Label>
                  <SearchableSelect
                    value={profile.timezone}
                    onValueChange={(value) => setProfile({ ...profile, timezone: value })}
                    placeholder="Select timezone"
                    searchPlaceholder="Search timezone…"
                    options={[
                      { value: "Asia/Kolkata",      label: "Asia/Kolkata (IST)" },
                      { value: "America/New_York",  label: "America/New_York (EST)" },
                      { value: "Europe/London",     label: "Europe/London (GMT)" },
                      { value: "Asia/Tokyo",        label: "Asia/Tokyo (JST)" },
                    ]}
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">Date format</Label>
                  <SearchableSelect
                    value={profile.dateFormat}
                    onValueChange={(value) => setProfile({ ...profile, dateFormat: value })}
                    placeholder="Select format"
                    searchPlaceholder="Search format…"
                    options={[
                      { value: "DD-MM-YYYY", label: "DD-MM-YYYY" },
                      { value: "MM-DD-YYYY", label: "MM-DD-YYYY" },
                      { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
                    ]}
                  />
                </div>
              </div>
            </SettingsSection>

            <div className="flex justify-end px-5 py-4">
              <Button onClick={handleProfileUpdate} size="sm">
                Save changes
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ConfigurationsPage() {
  return (
    <LayoutWrapper>
      <ConfigurationsPageContent />
    </LayoutWrapper>
  )
}
