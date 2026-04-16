"use client"

import { apiUrl } from "@/lib/api"
import { apiClient } from "@/lib/apiClient"
import { useAuth } from "@/context/AuthContext"
import { Select, SelectTrigger, SelectContent, SelectValue, SelectItem } from "@/components/ui/select"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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

  const handleEditCard = (card: CreditCardType) => {
    console.log("[v0] Edit card clicked:", card)
    setEditingCard(card)
    setNewCard({
      card_name: card.card_name || "",
      card_number: card.card_number || "",
      card_limit: card.card_limit ? card.card_limit.toString() : "",
      billing_cycle_date: card.billing_cycle_date ? card.billing_cycle_date.toString() : "",
      due_days: card.due_days ? card.due_days.toString() : "",
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configurations</h1>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="credit-cards">Credit Cards</TabsTrigger>
        </TabsList>

        <TabsContent value="credit-cards" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCardIcon className="h-5 w-5" />
                    Credit Cards Management
                  </CardTitle>
                  <CardDescription>Manage your credit and debit cards for transaction tracking</CardDescription>
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
            </CardHeader>
            <CardContent>
              <CreditCardsTable creditCards={creditCards} onEdit={handleEditCard} onDelete={handleDeleteCard} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>Configure how you want to receive notifications and reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Communication Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={notifications.emailNotifications}
                      onCheckedChange={(checked) => handleNotificationChange("emailNotifications", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
                    </div>
                    <Switch
                      checked={notifications.smsNotifications}
                      onCheckedChange={(checked) => handleNotificationChange("smsNotifications", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive push notifications in browser</p>
                    </div>
                    <Switch
                      checked={notifications.pushNotifications}
                      onCheckedChange={(checked) => handleNotificationChange("pushNotifications", checked)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Reports & Alerts</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Weekly Reports</Label>
                      <p className="text-sm text-muted-foreground">Get weekly spending summaries</p>
                    </div>
                    <Switch
                      checked={notifications.weeklyReports}
                      onCheckedChange={(checked) => handleNotificationChange("weeklyReports", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Monthly Reports</Label>
                      <p className="text-sm text-muted-foreground">Get monthly financial reports</p>
                    </div>
                    <Switch
                      checked={notifications.monthlyReports}
                      onCheckedChange={(checked) => handleNotificationChange("monthlyReports", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Budget Alerts</Label>
                      <p className="text-sm text-muted-foreground">Get alerts when approaching budget limits</p>
                    </div>
                    <Switch
                      checked={notifications.budgetAlerts}
                      onCheckedChange={(checked) => handleNotificationChange("budgetAlerts", checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Payment Reminders</Label>
                      <p className="text-sm text-muted-foreground">Get reminders for upcoming payments</p>
                    </div>
                    <Switch
                      checked={notifications.paymentReminders}
                      onCheckedChange={(checked) => handleNotificationChange("paymentReminders", checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Settings
              </CardTitle>
              <CardDescription>Manage your personal information and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={profile.currency}
                    onValueChange={(value) => setProfile({ ...profile, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                      <SelectItem value="USD">US Dollar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                      <SelectItem value="GBP">British Pound (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={profile.timezone}
                    onValueChange={(value) => setProfile({ ...profile, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={profile.dateFormat}
                    onValueChange={(value) => setProfile({ ...profile, dateFormat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD-MM-YYYY">DD-MM-YYYY</SelectItem>
                      <SelectItem value="MM-DD-YYYY">MM-DD-YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleProfileUpdate}>Update Profile</Button>
              </div>
            </CardContent>
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
