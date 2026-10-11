'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAddressStore, Address } from '@/store/useAddressStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Trash2, 
  Edit2, 
  Star, 
  Plus, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2 
} from 'lucide-react';

export default function AddressesPage() {
  const { addresses, cities, fetchAddresses, fetchCities, removeAddress, setDefault, isLoading } = useAddressStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchAddresses();
    fetchCities();
  }, [fetchAddresses, fetchCities]);

  const handleDelete = async (addressId: number) => {
    setDeletingId(addressId);
    try {
      await removeAddress(addressId);
      setSuccessMessage('Address removed successfully');
    } catch {
      // Handled in store
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDefault = async (addressId: number) => {
    try {
      await setDefault(addressId);
      setSuccessMessage('Default delivery address updated');
    } catch {
      // Handled in store
    }
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Saved Addresses</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your residential and workplace delivery locations for quick checkout.
            </p>
          </div>
          <Button onClick={() => { setIsAdding(true); setEditingAddress(null); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Address
          </Button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300 rounded-lg flex items-center justify-between border border-green-200">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSuccessMessage(null)} className="h-6 w-6">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {(isAdding || editingAddress) && (
          <div className="border p-6 rounded-xl bg-card shadow-sm animate-in fade-in-50 zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h2 className="text-lg font-bold tracking-tight">
                {editingAddress ? 'Update Delivery Address' : 'New Delivery Address'}
              </h2>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => { setIsAdding(false); setEditingAddress(null); }}
                className="h-7 w-7"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <AddressForm 
              address={editingAddress} 
              onClose={() => { 
                setIsAdding(false); 
                setEditingAddress(null); 
                setSuccessMessage(editingAddress ? 'Address updated' : 'Address added successfully');
              }} 
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <div 
              key={address.address_id} 
              className={`border rounded-xl p-5 bg-card flex flex-col justify-between transition-all ${
                address.is_default ? 'border-primary ring-1 ring-primary/30 shadow-xs' : 'hover:border-primary/40'
              }`}
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="font-bold text-base text-foreground line-clamp-1">{address.address_line1}</h3>
                  {address.is_default && (
                    <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full flex items-center shrink-0">
                      <Star className="w-3 h-3 mr-1 fill-current" /> Default
                    </span>
                  )}
                </div>
                {address.address_line2 && (
                  <p className="text-xs text-muted-foreground mb-1">{address.address_line2}</p>
                )}
                <p className="text-xs text-muted-foreground font-medium">
                  {address.city_name}, {address.state} {address.zip_code}
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-5 pt-3 border-t text-xs">
                {!address.is_default && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs" 
                    onClick={() => handleSetDefault(address.address_id)}
                    disabled={isLoading}
                  >
                    Set as Default
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs" 
                  onClick={() => { setEditingAddress(address); setIsAdding(false); }}
                >
                  <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 ml-auto" 
                  disabled={deletingId === address.address_id}
                  onClick={() => handleDelete(address.address_id)}
                >
                  {deletingId === address.address_id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                  )}
                  Delete
                </Button>
              </div>
            </div>
          ))}

          {addresses.length === 0 && !isAdding && (
            <div className="col-span-full text-center py-16 bg-card rounded-2xl border border-dashed p-6">
              <div className="w-14 h-14 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                <MapPin className="h-7 w-7" />
              </div>
              <h3 className="font-bold text-lg mb-1">No addresses saved</h3>
              <p className="text-xs text-muted-foreground mb-5 max-w-sm mx-auto">
                Save your home or delivery addresses to complete checkout with a single click.
              </p>
              <Button size="sm" onClick={() => setIsAdding(true)}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Your First Address
              </Button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

function AddressForm({ address, onClose }: { address: Address | null, onClose: () => void }) {
  const { addAddress, updateAddress, cities, isLoading } = useAddressStore();
  const [formData, setFormData] = useState({
    address_line1: address?.address_line1 || '',
    address_line2: address?.address_line2 || '',
    city_id: address?.city_id ? String(address.city_id) : '',
    zip_code: address?.zip_code || ''
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const errors: Record<string, string> = {};
    if (!formData.address_line1.trim()) errors.address_line1 = 'Street address is required';
    if (!formData.city_id) errors.city_id = 'Please select a city';
    if (!formData.zip_code.trim()) errors.zip_code = 'Zip / Postal code is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      if (address) {
        await updateAddress(address.address_id, {
          address_line1: formData.address_line1.trim(),
          address_line2: formData.address_line2.trim() || undefined,
          city_id: Number(formData.city_id),
          zip_code: formData.zip_code.trim()
        });
      } else {
        await addAddress({
          address_line1: formData.address_line1.trim(),
          address_line2: formData.address_line2.trim() || undefined,
          city_id: Number(formData.city_id),
          zip_code: formData.zip_code.trim()
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save address');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/50 rounded-lg flex items-center gap-2 border border-red-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      <div className="space-y-1.5">
        <Label htmlFor="address_line1" className="text-xs font-semibold">Street Address *</Label>
        <Input 
          id="address_line1"
          placeholder="e.g. 123 Main Street"
          value={formData.address_line1}
          onChange={(e) => {
            setFormData({...formData, address_line1: e.target.value});
            if (fieldErrors.address_line1) setFieldErrors({ ...fieldErrors, address_line1: '' });
          }}
          className={`text-sm ${fieldErrors.address_line1 ? 'border-red-500' : ''}`}
        />
        {fieldErrors.address_line1 && (
          <p className="text-xs text-red-500 mt-0.5">{fieldErrors.address_line1}</p>
        )}
      </div>
      
      <div className="space-y-1.5">
        <Label htmlFor="address_line2" className="text-xs font-semibold">Apartment, Suite, Unit (Optional)</Label>
        <Input 
          id="address_line2"
          placeholder="e.g. Apt 4B"
          value={formData.address_line2}
          onChange={(e) => setFormData({...formData, address_line2: e.target.value})}
          className="text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="city_id" className="text-xs font-semibold">City *</Label>
          <select 
            id="city_id"
            className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              fieldErrors.city_id ? 'border-red-500' : ''
            }`}
            value={formData.city_id}
            onChange={(e) => {
              setFormData({...formData, city_id: e.target.value});
              if (fieldErrors.city_id) setFieldErrors({ ...fieldErrors, city_id: '' });
            }}
          >
            <option value="">Select a city</option>
            {cities.map(city => (
              <option key={city.city_id} value={city.city_id}>{city.city_name}, {city.state}</option>
            ))}
          </select>
          {fieldErrors.city_id && (
            <p className="text-xs text-red-500 mt-0.5">{fieldErrors.city_id}</p>
          )}
        </div>
        
        <div className="space-y-1.5">
          <Label htmlFor="zip_code" className="text-xs font-semibold">Zip / Postal Code *</Label>
          <Input 
            id="zip_code"
            placeholder="e.g. 10001"
            value={formData.zip_code}
            onChange={(e) => {
              setFormData({...formData, zip_code: e.target.value});
              if (fieldErrors.zip_code) setFieldErrors({ ...fieldErrors, zip_code: '' });
            }}
            className={`text-sm ${fieldErrors.zip_code ? 'border-red-500' : ''}`}
          />
          {fieldErrors.zip_code && (
            <p className="text-xs text-red-500 mt-0.5">{fieldErrors.zip_code}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t">
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Address'
          )}
        </Button>
      </div>
    </form>
  );
}
