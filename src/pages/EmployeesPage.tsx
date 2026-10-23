import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Search, Users, Edit, UserCheck, UserX, Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState, LoadingRows, ErrorMessage } from '@/components/ui/states'
import { useEmployees, useUpdateEmployee, useCreateEmployee, useDeleteEmployee, useGenerateEmployeeCode } from '@/hooks/use-employees'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { Employee } from '@/lib/database.types'
import { formatDate } from '@/lib/utils'

const employeeSchema = z.object({
  full_name:     z.string().min(1, 'Name is required'),
  employee_code: z.string().optional(),
  department:    z.string().optional(),
  email:         z.string().email('Invalid email').optional().or(z.literal('')),
  is_active:     z.boolean(),
})

type EmployeeForm = z.infer<typeof employeeSchema>

function EmployeeDialog({
  open, onOpenChange, employee, onDelete,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  employee?: Employee
  onDelete?: (emp: Employee) => void
}) {
  const isEdit = !!employee
  const create = useCreateEmployee()
  const update = useUpdateEmployee()
  const { data: autoEmpCode, refetch: refetchEmpCode } = useGenerateEmployeeCode()

  const form = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: employee ? {
      full_name:     employee.full_name,
      employee_code: employee.employee_code ?? '',
      department:    employee.department ?? '',
      email:         employee.email ?? '',
      is_active:     employee.is_active,
    } : {
      full_name: '', employee_code: autoEmpCode ?? '', department: '', email: '', is_active: true,
    },
  })

  useEffect(() => {
    if (open) {
      if (!isEdit) {
        refetchEmpCode().then((res) => {
          if (res.data && !form.getValues('employee_code')) {
            form.setValue('employee_code', res.data)
          }
        })
      }
      form.reset(employee ? {
        full_name: employee.full_name,
        employee_code: employee.employee_code ?? '',
        department: employee.department ?? '',
        email: employee.email ?? '',
        is_active: employee.is_active,
      } : {
        full_name: '',
        employee_code: autoEmpCode ?? '',
        department: '',
        email: '',
        is_active: true,
      })
    }
  }, [open, employee, isEdit, autoEmpCode, form, refetchEmpCode])

  useEffect(() => {
    if (open && !isEdit && autoEmpCode && !form.getValues('employee_code')) {
      form.setValue('employee_code', autoEmpCode)
    }
  }, [open, isEdit, autoEmpCode, form])

  async function onSubmit(data: EmployeeForm) {
    const payload = {
      full_name:     data.full_name,
      employee_code: data.employee_code?.trim() || null,
      department:    data.department || null,
      email:         data.email || null,
      is_active:     data.is_active,
    }

    if (isEdit) await update.mutateAsync({ id: employee.id, ...payload })
    else        await create.mutateAsync(payload)

    onOpenChange(false)
  }

  const isPending = create.isPending || update.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Employee' : 'Add Employee'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update employee details.' : 'Add a new employee to the directory.'}
          </DialogDescription>
        </DialogHeader>

        <form id="employee-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="emp-name-input">Full Name *</Label>
            <Input id="emp-name-input" {...form.register('full_name')} placeholder="Full name" />
            {form.formState.errors.full_name && (
              <p className="text-xs text-destructive">{form.formState.errors.full_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="emp-code-input" className="flex items-center justify-between">
                <span>Employee Code</span>
                {!isEdit && <span className="text-[10px] text-muted-foreground font-normal">Auto-generated</span>}
              </Label>
              <Input
                id="emp-code-input"
                {...form.register('employee_code')}
                placeholder={autoEmpCode || 'EMP008'}
              />
              {!isEdit && (
                <p className="text-[11px] text-muted-foreground">
                  Sequential ID: {autoEmpCode || 'Auto-assigning'}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-dept-input">Department</Label>
              <Input id="emp-dept-input" {...form.register('department')} placeholder="Engineering" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="emp-email-input">Email</Label>
            <Input id="emp-email-input" type="email" {...form.register('email')} placeholder="user@company.com" />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <input
              id="emp-active-checkbox"
              type="checkbox"
              className="rounded border-input"
              {...form.register('is_active')}
            />
            <Label htmlFor="emp-active-checkbox">Active employee</Label>
          </div>
        </form>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          {isEdit ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5"
              onClick={() => {
                onOpenChange(false)
                onDelete?.(employee!)
              }}
            >
              <Trash2 className="h-4 w-4" />
              Remove User
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button id="employee-form-submit-btn" form="employee-form" type="submit" loading={isPending}>
              {isEdit ? 'Save Changes' : 'Add Employee'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function EmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [page, setPage]     = useState(1)
  const [addOpen, setAddOpen]   = useState(searchParams.get('action') === 'add')
  const [editEmp, setEditEmp]   = useState<Employee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null)
  const deleteEmployee = useDeleteEmployee()

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setAddOpen(true)
      const p = new URLSearchParams(searchParams)
      p.delete('action')
      setSearchParams(p, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const { data, isLoading, error } = useEmployees({ search, page, pageSize: 20 })
  const employees = data?.employees ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / 20))

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} employee record{total !== 1 ? 's' : ''}</p>
        </div>
        <Button id="add-employee-btn" onClick={() => setAddOpen(true)} size="sm">
          <Plus className="h-4 w-4" />Add Employee
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id="employee-search-input"
          placeholder="Search by name, code, or email…"
          className="pl-9"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </div>

      {/* Mobile Employee Cards */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Loading employees...</div>
        ) : employees.length === 0 ? (
          <div className="rounded-xl border bg-card p-6">
            <EmptyState
              icon={Users}
              title="No employees found"
              description="Add employees to track borrowing history."
              action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Add Employee</Button>}
            />
          </div>
        ) : (
          employees.map(emp => (
            <div key={emp.id} className="bg-card border rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                    {emp.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">{emp.full_name}</h3>
                    <p className="text-xs font-mono text-muted-foreground">{emp.employee_code || 'No Code'}</p>
                  </div>
                </div>
                <Badge variant={emp.is_active ? 'success' : 'neutral'}>
                  {emp.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50 text-muted-foreground">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground/70 block">Department</span>
                  <span className="font-medium text-foreground">{emp.department || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground/70 block">Email</span>
                  <span className="font-medium text-foreground truncate block">{emp.email || '—'}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => setEditEmp(emp)}
                >
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget(emp)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block rounded-xl border bg-card overflow-hidden">
        {error ? (
          <div className="p-6"><ErrorMessage message="Failed to load employees." /></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Department</th>
                <th>Email</th>
                <th>Status</th>
                <th>Added</th>
                <th className="w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <LoadingRows columns={7} rows={6} />
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-0">
                    <EmptyState
                      icon={Users}
                      title="No employees found"
                      description="Add employees to track borrowing history."
                      action={<Button size="sm" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add Employee</Button>}
                    />
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                          {emp.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">{emp.full_name}</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs">{emp.employee_code ?? '—'}</td>
                    <td className="text-sm">{emp.department ?? '—'}</td>
                    <td className="text-sm text-muted-foreground">{emp.email ?? '—'}</td>
                    <td>
                      <Badge variant={emp.is_active ? 'success' : 'neutral'}>
                        {emp.is_active ? <><UserCheck className="h-3 w-3 mr-1" />Active</> : <><UserX className="h-3 w-3 mr-1" />Inactive</>}
                      </Badge>
                    </td>
                    <td className="text-sm text-muted-foreground">{formatDate(emp.created_at)}</td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          onClick={() => setEditEmp(emp)}
                          aria-label="Edit employee"
                          title="Edit employee"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          id={`delete-user-${emp.id}-btn`}
                          className="p-1.5 rounded hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(emp)}
                          aria-label="Remove user"
                          title="Remove user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Showing {(page-1)*20+1}–{Math.min(page*20, total)} of {total}</span>
          <div className="flex gap-1">
            <Button id="emp-prev-btn" variant="outline" size="sm" disabled={page===1} onClick={() => setPage(p=>p-1)}>Previous</Button>
            <Button id="emp-next-btn" variant="outline" size="sm" disabled={page>=totalPages} onClick={() => setPage(p=>p+1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <EmployeeDialog open={addOpen} onOpenChange={setAddOpen} />
      {editEmp && (
        <EmployeeDialog
          open={!!editEmp}
          onOpenChange={o => !o && setEditEmp(null)}
          employee={editEmp}
          onDelete={emp => setDeleteTarget(emp)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Remove User</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Are you sure you want to remove <strong className="text-foreground">{deleteTarget?.full_name}</strong>{deleteTarget?.employee_code ? ` (${deleteTarget.employee_code})` : ''}?
              This user will no longer be listed in the library directory.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteEmployee.isPending}
            >
              Cancel
            </Button>
            <Button
              id="confirm-delete-user-btn"
              variant="destructive"
              loading={deleteEmployee.isPending}
              onClick={async () => {
                if (deleteTarget) {
                  await deleteEmployee.mutateAsync(deleteTarget.id)
                  setDeleteTarget(null)
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Remove User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
