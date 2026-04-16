"use client"

import { apiUrl } from "@/lib/api"
import { apiClient } from "@/lib/apiClient"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, RefreshCw, Database, CheckCircle, XCircle } from "lucide-react"

export default function DebugTransactionsPage() {
  const [loading, setLoading] = useState(false)
  const [apiData, setApiData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const fetchDebugData = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient(
        apiUrl("dashboard", { month: 1, year: 2025 }),
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          mode: "cors",
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setApiData(data)
      setLastFetch(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebugData()
  }, [])

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Debug Console</h1>
          <p className="text-muted-foreground">Debug dashboard API responses and data structure</p>
        </div>
        <Button onClick={fetchDebugData} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh Data
        </Button>
      </div>

      {/* API Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            API Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              {error ? (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <XCircle className="h-3 w-3" />
                  Error
                </Badge>
              ) : apiData ? (
                <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                  <CheckCircle className="h-3 w-3" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">Unknown</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Last Fetch:</span>
              <span className="text-sm text-muted-foreground">
                {lastFetch ? lastFetch.toLocaleTimeString() : "Never"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Endpoint:</span>
              <span className="text-xs text-muted-foreground font-mono">/api/dashboard</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>API Error:</strong> {error}
          </AlertDescription>
        </Alert>
      )}

      {/* API Response Data */}
      {apiData && (
        <div className="grid gap-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
              <CardDescription>Current month financial overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Total Income</div>
                  <div className="text-2xl font-bold text-green-600">
                    ₹{apiData.data?.financialSummary?.totalIncome?.value?.toLocaleString() || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Total Expenses</div>
                  <div className="text-2xl font-bold text-red-600">
                    ₹{apiData.data?.financialSummary?.totalExpense?.value?.toLocaleString() || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Total Investment</div>
                  <div className="text-2xl font-bold text-blue-600">
                    ₹{apiData.data?.financialSummary?.totalInvestment?.value?.toLocaleString() || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Balance</div>
                  <div className="text-2xl font-bold">
                    ₹{Math.abs(apiData.data?.financialSummary?.balance?.value || 0).toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Counts */}
          <Card>
            <CardHeader>
              <CardTitle>Transaction Counts</CardTitle>
              <CardDescription>Number of transactions by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {apiData.data?.transactions &&
                  Object.entries(apiData.data.transactions).map(([type, transactions]: [string, any]) => (
                    <div key={type} className="text-center p-4 border rounded-lg">
                      <div className="text-sm font-medium text-muted-foreground">{type}</div>
                      <div className="text-xl font-bold">
                        {Array.isArray(transactions) ? transactions.length : transactions?.length || 0}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Raw JSON Data */}
          <Card>
            <CardHeader>
              <CardTitle>Raw API Response</CardTitle>
              <CardDescription>Complete JSON response from the API</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">{JSON.stringify(apiData, null, 2)}</pre>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {loading && !apiData && (
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Fetching data from API...</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
