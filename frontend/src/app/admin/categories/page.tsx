'use client';

import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Edit, 
  FolderTree, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  X, 
  Loader2 
} from 'lucide-react';

interface CategoryNode {
  category_id: number;
  category_name: string;
  parent_category_id: number | null;
  is_active: boolean;
  children?: CategoryNode[];
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Dialog / Edit state
  const [editingCategory, setEditingCategory] = useState<CategoryNode | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    category_name: '',
    parent_category_id: '',
    is_active: true
  });
  const [fieldErrors, setFieldErrors] = useState<{ category_name?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await apiFetch('/api/admin/categories');
      if (!res.ok) throw new Error('Failed to load category taxonomy');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load category taxonomy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Recursively update active status in tree
  const updateCategoryInTree = (nodes: CategoryNode[], id: number, isActive: boolean): CategoryNode[] => {
    return nodes.map((node) => {
      if (node.category_id === id) {
        return { ...node, is_active: isActive };
      }
      if (node.children && node.children.length > 0) {
        return { ...node, children: updateCategoryInTree(node.children, id, isActive) };
      }
      return node;
    });
  };

  // Flattened categories for parent selection
  const flattenCategories = (nodes: CategoryNode[]): { id: number; name: string }[] => {
    let result: { id: number; name: string }[] = [];
    for (const node of nodes) {
      result.push({ id: node.category_id, name: node.category_name });
      if (node.children) {
        result = result.concat(flattenCategories(node.children));
      }
    }
    return result;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.category_name.trim()) {
      setFieldErrors({ category_name: 'Category name is required' });
      return;
    }

    setFieldErrors({});

    try {
      setIsSubmitting(true);
      const payload: {
        category_name: string;
        parent_category_id: number | null;
        is_active?: boolean;
      } = {
        category_name: formData.category_name.trim(),
        parent_category_id: formData.parent_category_id ? Number(formData.parent_category_id) : null
      };

      if (editingCategory) {
        payload.is_active = formData.is_active;
        const res = await apiFetch(`/api/admin/categories/${editingCategory.category_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Failed to update category');
        }
        setSuccess(`Category "${formData.category_name}" updated.`);
      } else {
        const res = await apiFetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Failed to create category');
        }
        setSuccess(`Category "${formData.category_name}" created.`);
      }

      setIsCreating(false);
      setEditingCategory(null);
      setFormData({ category_name: '', parent_category_id: '', is_active: true });
      fetchCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleCategoryStatus = async (id: number, currentStatus: boolean, categoryName: string) => {
    const nextStatus = !currentStatus;
    setTogglingId(id);
    setError('');
    setSuccess('');

    // Optimistically update local tree state
    setCategories((prev) => updateCategoryInTree(prev, id, nextStatus));

    try {
      const res = await apiFetch(`/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to update category status');
      }

      setSuccess(`Category "${categoryName}" marked as ${nextStatus ? 'Active' : 'Inactive'}.`);
    } catch (err: unknown) {
      // Revert optimistic update
      setCategories((prev) => updateCategoryInTree(prev, id, currentStatus));
      setError(err instanceof Error ? err.message : 'Failed to update category status');
    } finally {
      setTogglingId(null);
    }
  };

  const renderTree = (nodes: CategoryNode[]) => {
    return (
      <ul className="space-y-2 pl-3 sm:pl-4 border-l border-muted">
        {nodes.map((node) => (
          <li key={node.category_id} className="text-sm">
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/40 border bg-card transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <FolderTree className="h-4 w-4 text-primary shrink-0" />
                <span className={`font-semibold truncate ${!node.is_active ? 'line-through text-muted-foreground' : ''}`}>
                  {node.category_name}
                </span>
                {!node.is_active && (
                  <span className="text-[10px] uppercase font-bold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 px-1.5 py-0.5 rounded shrink-0">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={node.is_active}
                    disabled={togglingId === node.category_id}
                    onCheckedChange={() => handleToggleCategoryStatus(node.category_id, node.is_active, node.category_name)}
                    aria-label={`Toggle active status for ${node.category_name}`}
                  />
                  <span className={`text-xs font-medium hidden sm:inline ${node.is_active ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                    {node.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    setEditingCategory(node);
                    setIsCreating(false);
                    setFormData({
                      category_name: node.category_name,
                      parent_category_id: node.parent_category_id ? String(node.parent_category_id) : '',
                      is_active: node.is_active
                    });
                  }}
                  title="Edit Category"
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {node.children && node.children.length > 0 && renderTree(node.children)}
          </li>
        ))}
      </ul>
    );
  };

  const flattened = flattenCategories(categories);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Category Taxonomy</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize catalog hierarchy and parent-child navigation trees.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchCategories} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => {
            setIsCreating(true);
            setEditingCategory(null);
            setFormData({ category_name: '', parent_category_id: '', is_active: true });
          }}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Category
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {success && (
        <div className="p-3 bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 rounded-lg flex items-center justify-between border border-green-200">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setSuccess('')} className="h-6 w-6">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 rounded-lg flex items-center justify-between border border-red-200">
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setError('')} className="h-6 w-6">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Create / Edit Form Modal or Panel */}
      {(isCreating || editingCategory) && (
        <div className="border rounded-xl p-6 bg-card shadow-sm animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="flex justify-between items-center mb-4 pb-2 border-b">
            <h2 className="text-lg font-bold tracking-tight">
              {editingCategory ? `Edit: ${editingCategory.category_name}` : 'New Category'}
            </h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => { setIsCreating(false); setEditingCategory(null); }}
              className="h-7 w-7"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Category Name *</label>
              <Input 
                required
                placeholder="e.g. Laptops & Computers"
                value={formData.category_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setFormData({ ...formData, category_name: e.target.value });
                  if (fieldErrors.category_name) setFieldErrors({});
                }}
                className={`text-sm ${fieldErrors.category_name ? 'border-red-500' : ''}`}
              />
              {fieldErrors.category_name && (
                <p className="text-xs text-red-500 mt-0.5">{fieldErrors.category_name}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Parent Category (Optional)</label>
              <select
                className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={formData.parent_category_id}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, parent_category_id: e.target.value })}
              >
                <option value="">None (Top Level Root Category)</option>
                {flattened
                  .filter(c => !editingCategory || c.id !== editingCategory.category_id)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                }
              </select>
            </div>
            {editingCategory && (
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                <div className="space-y-0.5">
                  <label className="text-xs font-semibold">Active Status</label>
                  <p className="text-xs text-muted-foreground">
                    Active categories appear on customer browsing menus and filters.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    aria-label="Category active status"
                  />
                  <span className="text-xs font-medium">
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end pt-3 border-t">
              <Button 
                type="button" 
                variant="outline"
                size="sm"
                onClick={() => { setIsCreating(false); setEditingCategory(null); }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Category'
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Category Tree Representation */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <p className="text-xs">Loading category taxonomy...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="border border-dashed p-12 rounded-2xl text-center bg-card shadow-xs">
          <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
            <FolderTree className="h-7 w-7" />
          </div>
          <h3 className="font-bold text-base mb-1">No categories configured</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
            Build a taxonomy to help shoppers discover products by department and type.
          </p>
          <Button size="sm" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Root Category
          </Button>
        </div>
      ) : (
        <div className="border rounded-xl p-4 sm:p-6 bg-card shadow-xs">
          {renderTree(categories)}
        </div>
      )}
    </div>
  );
}
