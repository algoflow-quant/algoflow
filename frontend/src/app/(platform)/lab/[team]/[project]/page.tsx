import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconChartLine, IconCode, IconRocket, IconSettings } from "@tabler/icons-react"

// Mock data - replace with real data later
const teams = [
  { id: "1", name: "Personal" },
  { id: "2", name: "LSU Quant Team" },
  { id: "3", name: "Research Group" },
]

const projects = [
  { id: "1", name: "Momentum Strategy", teamId: "1", description: "Momentum-based trading strategy", status: "active" },
  { id: "2", name: "Mean Reversion", teamId: "1", description: "Mean reversion algorithm", status: "testing" },
  { id: "3", name: "ML Predictor", teamId: "2", description: "Machine learning price predictor", status: "active" },
]

interface ProjectPageProps {
  params: Promise<{
    team: string
    project: string
  }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const supabase = await createClient()
  const { team: teamId, project: projectId } = await params

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Find team and project from mock data
  const team = teams.find(t => t.id === teamId)
  const project = projects.find(p => p.id === projectId && p.teamId === teamId)

  if (!team || !project) {
    redirect("/lab")
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Project Header */}
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">{project.name}</h1>
                    <p className="text-muted-foreground mt-1">
                      {team.name} • {project.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      project.status === 'active'
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Project Content Tabs */}
              <div className="px-4 lg:px-6">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="backtest">Backtest</TabsTrigger>
                    <TabsTrigger value="code">Code</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Return</CardTitle>
                          <IconChartLine className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">+24.5%</div>
                          <p className="text-xs text-muted-foreground">Last 30 days</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
                          <IconRocket className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">1.85</div>
                          <p className="text-xs text-muted-foreground">Risk-adjusted return</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
                          <IconChartLine className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">-8.3%</div>
                          <p className="text-xs text-muted-foreground">Peak to trough</p>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Strategy Details</CardTitle>
                        <CardDescription>Overview of your trading strategy</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Strategy Type</span>
                          <span className="text-sm font-medium">Momentum</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Timeframe</span>
                          <span className="text-sm font-medium">Daily</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Assets</span>
                          <span className="text-sm font-medium">S&P 500 Stocks</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Created</span>
                          <span className="text-sm font-medium">2 weeks ago</span>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="backtest" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Backtest Results</CardTitle>
                        <CardDescription>Historical performance analysis</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Backtest results will be displayed here
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="code" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <IconCode className="h-5 w-5" />
                          Strategy Code
                        </CardTitle>
                        <CardDescription>Edit your trading algorithm</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Code editor will be displayed here
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="settings" className="space-y-4 mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <IconSettings className="h-5 w-5" />
                          Strategy Settings
                        </CardTitle>
                        <CardDescription>Configure your strategy parameters</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Settings configuration will be displayed here
                        </p>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
