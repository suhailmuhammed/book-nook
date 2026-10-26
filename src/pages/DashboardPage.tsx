import { useNavigate } from 'react-router-dom'
import {
  BookOpen, BookMarked, ArrowLeftRight, AlertTriangle,
  Wrench, Users, Star, Clock, PlusCircle, RotateCcw,
  UserPlus, BookPlus, TrendingUp, AlertCircle,
} from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { BookCover } from '@/components/ui/book-cover'
import { PageLoader, ErrorMessage, EmptyState } from '@/components/ui/states'
import { useDashboardStats } from '@/hooks/use-books'
import { useRecentActivity } from '@/hooks/use-borrowings'
import { useAllWaitingLists } from '@/hooks/use-requests'
import { formatDate, isOverdue, daysOverdue } from '@/lib/utils'
import { IssueBookDialog } from '@/components/borrowing/IssueBookDialog'
import { useState } from 'react'

interface KpiCardProps {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
  description?: string
  onClick?: () => void
}

function KpiCard({ label, value, icon: Icon, color, description, onClick }: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={`kpi-card ${onClick ? 'cursor-pointer hover:border-primary/50 transition-all hover:shadow-xs' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </div>
  )
}

function CustomPieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number
  innerRadius: number; outerRadius: number; percent: number
}) {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="600">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const stats = useDashboardStats()
  const activity = useRecentActivity()
  const waitingLists = useAllWaitingLists()
  const [showIssueDialog, setShowIssueDialog] = useState(false)

  if (stats.isLoading) return <PageLoader />
  if (stats.error) return <ErrorMessage message="Failed to load dashboard data." />

  const s = stats.data!
  const act = activity.data
  const waitingCount = waitingLists.data?.length ?? 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold font-serif">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Office Library Overview & Operations</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            id="quick-issue-book-btn"
            onClick={() => setShowIssueDialog(true)}
            size="sm"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Issue Book
          </Button>
          <Button
            id="quick-add-book-btn"
            variant="outline"
            size="sm"
            onClick={() => navigate('/books?action=add')}
          >
            <BookPlus className="h-4 w-4" />
            Add Book
          </Button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard label="Total Books" value={s.total} icon={BookOpen}
          color="bg-navy-100 text-navy-600" description="Active in catalog" onClick={() => navigate('/books')} />
        <KpiCard label="Available" value={s.available} icon={BookMarked}
          color="bg-emerald-100 text-emerald-600" onClick={() => navigate('/books?status=Available')} />
        <KpiCard label="Borrowed" value={s.borrowed} icon={ArrowLeftRight}
          color="bg-blue-100 text-blue-600" onClick={() => navigate('/borrowing?tab=loans')} />
        <KpiCard label="Active Loans" value={s.activeLoans} icon={Clock}
          color="bg-indigo-100 text-indigo-600" onClick={() => navigate('/borrowing?tab=loans')} />
        <KpiCard label="Overdue" value={s.overdueLoans} icon={AlertTriangle}
          color={s.overdueLoans > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}
          onClick={() => navigate('/borrowing?tab=overdue')} />
      </div>

      {/* Secondary Operations KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <KpiCard label="Book Requests" value={waitingCount} icon={BookMarked}
          color={waitingCount > 0 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-500"}
          description="In waiting list" onClick={() => navigate('/borrowing?tab=waiting-lists')} />
        <KpiCard label="Employees" value={s.totalEmployees} icon={Users}
          color="bg-teal-100 text-teal-600" description="Directory" onClick={() => navigate('/employees')} />
        <KpiCard label="Reserved" value={s.reserved} icon={BookMarked}
          color="bg-purple-100 text-purple-600" />
        <KpiCard label="Lost" value={s.lost} icon={AlertCircle}
          color={s.lost > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'} />
        <KpiCard label="Under Repair" value={s.underRepair} icon={Wrench}
          color="bg-amber-100 text-amber-600" />
      </div>

      {/* Charts + Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Status Pie Chart */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Book Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {s.statusDistribution.length === 0 ? (
              <EmptyState icon={BookOpen} title="No data" description="Add books to see status distribution." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={s.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="value"
                    labelLine={false}
                    label={CustomPieLabel as never}
                  >
                    {s.statusDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val, name) => [val, name]} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Overdue Loans */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Overdue Loans</CardTitle>
            {(act?.overdueLoans?.length ?? 0) > 0 && (
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/borrowing?status=overdue')}>
                View all
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!act || act.overdueLoans.length === 0 ? (
              <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                <span className="text-sm">No overdue loans — great job!</span>
              </div>
            ) : (
              <div className="space-y-3">
                {act.overdueLoans.slice(0, 6).map(loan => (
                  <div key={loan.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-red-50 border border-red-100">
                    <BookCover src={loan.book?.cover_image_url} title={loan.book?.title ?? ''} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{loan.book?.title}</p>
                      <p className="text-xs text-muted-foreground">{loan.employee?.full_name} · {loan.book?.book_code}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-red-600">
                        {daysOverdue(loan.due_date)}d overdue
                      </p>
                      <p className="text-[10px] text-muted-foreground">Due {formatDate(loan.due_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Borrowings */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Borrowings</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/borrowing?status=active')}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {!act || act.recentBorrowings.length === 0 ? (
              <EmptyState icon={ArrowLeftRight} title="No active loans" description="Issue a book to get started." />
            ) : (
              <div className="space-y-2">
                {act.recentBorrowings.map(loan => (
                  <div key={loan.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <BookCover src={loan.book?.cover_image_url} title={loan.book?.title ?? ''} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{loan.book?.title}</p>
                      <p className="text-xs text-muted-foreground">{loan.employee?.full_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">Due</p>
                      <p className={`text-xs font-medium ${isOverdue(loan.due_date, null) ? 'text-red-600' : 'text-foreground'}`}>
                        {formatDate(loan.due_date)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Returns */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Recent Returns</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/borrowing?status=returned')}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            {!act || act.recentReturns.length === 0 ? (
              <EmptyState icon={RotateCcw} title="No returns yet" description="Returns will appear here." />
            ) : (
              <div className="space-y-2">
                {act.recentReturns.map(loan => (
                  <div key={loan.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <BookCover src={loan.book?.cover_image_url} title={loan.book?.title ?? ''} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{loan.book?.title}</p>
                      <p className="text-xs text-muted-foreground">{loan.employee?.full_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">Returned</p>
                      <p className="text-xs font-medium">{formatDate(loan.return_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Book Requests & Waiting Lists Section */}
      <Card>
        <CardHeader className="pb-2 flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookMarked className="h-4 w-4 text-forest" />
              <span>Book Requests &amp; Waiting Lists</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Active member requests awaiting physical book availability.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-forest hover:bg-forest/5"
            onClick={() => navigate('/borrowing?tab=waiting-lists')}
          >
            Manage Queues &rarr;
          </Button>
        </CardHeader>
        <CardContent>
          {waitingLists.isLoading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Loading waiting lists…</p>
          ) : waitingCount === 0 ? (
            <div className="flex items-center gap-2 py-6 justify-center text-muted-foreground text-xs">
              <BookMarked className="h-4 w-4 text-emerald-500" />
              <span>No active waiting list requests at this time. All requested books have been issued.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {waitingLists.data!.slice(0, 5).map(req => (
                <div key={req.id} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/50 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-200 text-amber-900 font-bold flex items-center justify-center text-[10px]">
                      #{req.queue_position}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{req.book?.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Requested by <strong className="text-foreground">{req.employee?.full_name}</strong> ({req.employee?.department || 'General'})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      req.status === 'Ready for Pickup' ? 'bg-emerald-100 text-emerald-800 font-semibold' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {req.status}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      onClick={() => navigate('/borrowing?tab=waiting-lists')}
                    >
                      View in Operations
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Add Book', icon: BookPlus, action: () => navigate('/books?action=add'), id: 'qa-add-book' },
              { label: 'Issue Book', icon: ArrowLeftRight, action: () => setShowIssueDialog(true), id: 'qa-issue-book' },
              { label: 'Record Return', icon: RotateCcw, action: () => navigate('/borrowing?status=active'), id: 'qa-return-book' },
              { label: 'Manage Requests', icon: BookMarked, action: () => navigate('/borrowing?tab=waiting-lists'), id: 'qa-manage-requests' },
              { label: 'Manage Employees', icon: Users, action: () => navigate('/employees'), id: 'qa-manage-employees' },
            ].map(item => (
              <button
                key={item.id}
                id={item.id}
                onClick={item.action}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:bg-muted/60 hover:border-primary/30 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Issue Book Dialog */}
      <IssueBookDialog open={showIssueDialog} onOpenChange={setShowIssueDialog} />
    </div>
  )
}
