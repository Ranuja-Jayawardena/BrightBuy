'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/services/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Lock,
  User,
  Pencil,
} from 'lucide-react';

interface EmployeeItem {
  employee_id: number;
  user_id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  role?: string;
  is_active?: boolean;
}

const STAFF_ROLES = [
  { value: 'super_admin', label: 'Super Administrator', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  { value: 'inventory_manager', label: 'Inventory Manager', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  { value: 'order_dispatcher', label: 'Order Dispatcher', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  { value: 'catalog_manager', label: 'Catalog Manager', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  { value: 'analyst', label: 'Business Analyst', badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
];

export default function AdminEmployeesPage() {
  const { user: currentUser } = useAuthStore();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Create Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone: '',
    role: 'inventory_manager',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal / Form state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    role: 'inventory_manager',
  });
  const [editFormError, setEditFormError] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  const isSelf = (emp: EmployeeItem) => {
    if (!currentUser) return false;
    return (
      (currentUser.employee_id !== undefined && currentUser.employee_id === emp.employee_id) ||
      (currentUser.user_id !== undefined && currentUser.user_id === emp.user_id)
    );
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch('/api/admin/employees');
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to load employees');
      }
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const openCreateModal = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      role: 'inventory_manager',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsModalOpen(false);
    setFormError('');
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.first_name.trim()) {
      setFormError('First name is required.');
      return;
    }
    if (!formData.last_name.trim()) {
      setFormError('Last name is required.');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Email is required.');
      return;
    }
    if (formData.password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiFetch('/api/admin/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          role: formData.role,
          phone: formData.phone.trim() || undefined
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register new employee');
      }

      setSuccess(`Employee ${formData.first_name} ${formData.last_name} (${formData.email}) registered as ${STAFF_ROLES.find(r => r.value === formData.role)?.label || formData.role} successfully.`);
      closeCreateModal();
      fetchEmployees();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp: EmployeeItem) => {
    if (isSelf(emp)) {
      setError('You cannot deactivate your own account.');
      return;
    }

    const nextStatus = !(emp.is_active ?? true);
    setTogglingId(emp.employee_id);
    setError('');
    setSuccess('');

    try {
      const res = await apiFetch(`/api/admin/employees/${emp.employee_id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to update employee status');
      }

      setEmployees((prev) =>
        prev.map((item) =>
          item.employee_id === emp.employee_id ? { ...item, is_active: nextStatus } : item
        )
      );
      setSuccess(data.message || `Employee ${nextStatus ? 'activated' : 'deactivated'} successfully.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  const openEditModal = (emp: EmployeeItem) => {
    setEditingEmployee(emp);
    setEditFormData({
      first_name: emp.first_name || '',
      last_name: emp.last_name || '',
      phone: emp.phone || '',
      role: emp.role || 'inventory_manager',
    });
    setEditFormError('');
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingEmployee(null);
    setEditFormError('');
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    setEditFormError('');

    if (!editFormData.first_name.trim()) {
      setEditFormError('First name is required.');
      return;
    }
    if (!editFormData.last_name.trim()) {
      setEditFormError('Last name is required.');
      return;
    }

    try {
      setIsEditSubmitting(true);
      const res = await apiFetch(`/api/admin/employees/${editingEmployee.employee_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: editFormData.first_name.trim(),
          last_name: editFormData.last_name.trim(),
          phone: editFormData.phone.trim() || undefined,
          role: editFormData.role,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to update employee');
      }

      const updatedEmp = data.employee;
      setEmployees((prev) =>
        prev.map((item) =>
          item.employee_id === editingEmployee.employee_id
            ? {
                ...item,
                first_name: updatedEmp?.first_name ?? editFormData.first_name.trim(),
                last_name: updatedEmp?.last_name ?? editFormData.last_name.trim(),
                phone: updatedEmp?.phone ?? (editFormData.phone.trim() || null),
                role: updatedEmp?.role ?? editFormData.role,
                is_active: updatedEmp?.is_active ?? item.is_active,
              }
            : item
        )
      );

      setSuccess(`Employee ${editFormData.first_name.trim()} ${editFormData.last_name.trim()} updated successfully.`);
      closeEditModal();
    } catch (err: any) {
      setEditFormError(err.message);
    } finally {
      setIsEditSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage administrative personnel, review team accounts, and register authorized staff.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchEmployees} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={openCreateModal}>
            <UserPlus className="w-4 h-4 mr-2" /> Add Employee
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {success && (
        <div className="p-3 bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 rounded-lg flex items-center justify-between border border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{success}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSuccess('')} className="h-6 w-6">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 rounded-lg flex items-center gap-2 border border-red-200">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Employee List Table */}
      <div className="border rounded-lg bg-card overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Users className="w-4 h-4 text-primary" /> Active Staff Accounts ({employees.length})
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="p-4 font-semibold">ID</th>
                <th className="p-4 font-semibold">Staff Member</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Phone</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                      <span>Loading team members...</span>
                    </div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-muted-foreground">
                    <p className="font-medium text-foreground">No employee accounts registered</p>
                    <p className="text-xs mt-1">Click "Add Employee" above to grant staff access.</p>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const selfAccount = isSelf(emp);
                  const isActive = emp.is_active ?? true;

                  return (
                    <tr key={emp.employee_id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-mono font-medium text-muted-foreground text-xs">
                        #{emp.employee_id}
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                            {emp.first_name[0]}{emp.last_name[0]}
                          </div>
                          <span>{emp.first_name} {emp.last_name}</span>
                          {selfAccount && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{emp.email}</span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {emp.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span>{emp.phone}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">—</span>
                        )}
                      </td>
                      <td className="p-4">
                        {(() => {
                          const matched = STAFF_ROLES.find((r) => r.value === emp.role);
                          return (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${matched?.badge || 'bg-primary/10 text-primary'}`}>
                              <ShieldCheck className="w-3.5 h-3.5" /> {matched?.label || emp.role || 'Admin'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={isActive}
                            disabled={selfAccount || togglingId === emp.employee_id}
                            onCheckedChange={() => handleToggleStatus(emp)}
                            title={selfAccount ? 'You cannot deactivate your own account' : isActive ? 'Deactivate employee' : 'Activate employee'}
                          />
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300'
                                : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                            }`}
                          >
                            {isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(emp)}
                          className="h-8 px-2.5 text-xs"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
          <div
            className="bg-card border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b flex items-start justify-between bg-muted/20">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Register New Employee</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create an administrator login credential with full store management access.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeCreateModal} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateEmployee}>
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 rounded-lg flex items-center gap-2 border border-red-200 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">First Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        required
                        placeholder="e.g. John"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="pl-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Last Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        required
                        placeholder="e.g. Doe"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="pl-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      type="email"
                      required
                      placeholder="e.g. jdoe@brightbuy.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Password (Minimum 8 characters)</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      type="password"
                      required
                      minLength={8}
                      placeholder="••••••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Phone Number (Optional)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="e.g. +1 555-0199"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Assigned Operational Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r.value} value={r.value} className="bg-popover text-popover-foreground">
                        {r.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    Controls which management modules and API endpoints this employee is permitted to access.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeCreateModal} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Registering...' : 'Create Employee Account'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {isEditModalOpen && editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto">
          <div
            className="bg-card border rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b flex items-start justify-between bg-muted/20">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Edit Employee</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Update employee contact details and operational staff role.
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeEditModal} className="rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleUpdateEmployee}>
              <div className="p-6 space-y-4">
                {editFormError && (
                  <div className="p-3 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 rounded-lg flex items-center gap-2 border border-red-200 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{editFormError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">First Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        required
                        placeholder="e.g. Marcus"
                        value={editFormData.first_name}
                        onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                        className="pl-9 text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium">Last Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                      <Input
                        required
                        placeholder="e.g. Vance"
                        value={editFormData.last_name}
                        onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                        className="pl-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Email Address (Read-only)</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      type="email"
                      disabled
                      value={editingEmployee.email}
                      className="pl-9 text-sm bg-muted/50 cursor-not-allowed opacity-80"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Employee login emails are bound to the primary identity account and cannot be modified directly.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Phone Number (Optional)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      type="tel"
                      placeholder="e.g. +1 555-0812"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="pl-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Assigned Operational Role</label>
                  <select
                    value={editFormData.role}
                    disabled={isSelf(editingEmployee)}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {STAFF_ROLES.map((r) => (
                      <option key={r.value} value={r.value} className="bg-popover text-popover-foreground">
                        {r.label}
                      </option>
                    ))}
                  </select>
                  {isSelf(editingEmployee) ? (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400">
                      Super Administrators cannot change or demote their own account role.
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Controls which management modules and API endpoints this employee is permitted to access.
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeEditModal} disabled={isEditSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isEditSubmitting}>
                  {isEditSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

