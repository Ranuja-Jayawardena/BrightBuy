'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Trash2, 
  Edit, 
  FolderTree, 
  ChevronRight, 
  ChevronDown,
  AlertCircle 
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
  
  // Dialog / Edit state
  const [editingCategory, setEditingCategory] = useState<CategoryNode | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    category_name: '',
    parent_category_id: ''
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/admin/categories');
      if (!res.ok) throw new Error('Failed to load categories');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

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

    try {
      const payload = {
        category_name: formData.category_name,
        parent_category_id: formData.parent_category_id ? Number(formData.parent_category_id) : null
      };

      if (editingCategory) {
        const res = await apiFetch(`/api/admin/categories/${editingCategory.category_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error || 'Failed to update category');
        }
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
      }

      setIsCreating(false);
      setEditingCategory(null);
      setFormData({ category_name: '', parent_category_id: '' });
      fetchCategories();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to deactivate this category?')) return;
    try {
      const res = await apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete category');
      fetchCategories();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const renderTree = (nodes: CategoryNode[]) => {
    return (
      <ul className="space-y-2 pl-4 border-l border-muted">
        {nodes.map((node) => (
          <li key={node.category_id} className="text-sm">
            <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 border bg-card">
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-primary" />
                <span className={`font-medium ${!node.is_active ? 'line-through text-muted-foreground' : ''}`}>
                  {node.category_name}
                </span>
                {!node.is_active && (
                  <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                    Inactive
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setEditingCategory(node);
                    setIsCreating(false);
                    setFormData({
                      category_name: node.category_name,
                      parent_category_id: node.parent_category_id ? String(node.parent_category_id) : ''
                    });
                  }}
                >
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDelete(node.category_id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage hierarchy, tree structures, and category details.</p>
        </div>
        <Button onClick={() => {
          setIsCreating(true);
          setEditingCategory(null);
          setFormData({ category_name: '', parent_category_id: '' });
        }}>
          <Plus className="h-4 w-4 mr-2" /> Add Category
        </Button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {(isCreating || editingCategory) && (
        <div className="mb-8 border rounded-lg p-6 bg-card">
          <h2 className="text-lg font-semibold mb-4">
            {editingCategory ? 'Edit Category' : 'New Category'}
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Category Name</label>
              <Input 
                required
                value={formData.category_name}
                onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Parent Category (Optional)</label>
              <select
                className="w-full mt-1 flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={formData.parent_category_id}
                onChange={(e) => setFormData({ ...formData, parent_category_id: e.target.value })}
              >
                <option value="">None (Top Level)</option>
                {flattened
                  .filter(c => !editingCategory || c.id !== editingCategory.category_id)
                  .map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                }
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => { setIsCreating(false); setEditingCategory(null); }}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Loading categories...</div>
      ) : categories.length === 0 ? (
        <div className="border border-dashed p-8 rounded-lg text-center text-muted-foreground">
          No categories found. Click "Add Category" to get started.
        </div>
      ) : (
        <div className="border rounded-lg p-6 bg-card">
          {renderTree(categories)}
        </div>
      )}
    </div>
  );
}
