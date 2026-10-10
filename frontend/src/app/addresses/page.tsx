'use client';

import { useEffect, useState } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAddressStore, Address } from '@/store/useAddressStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Edit2, Star, Plus } from 'lucide-react';

export default function AddressesPage() {
  const { addresses, cities, fetchAddresses, fetchCities, removeAddress, setDefault } = useAddressStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  useEffect(() => {
    fetchAddresses();
    fetchCities();
  }, [fetchAddresses, fetchCities]);

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">My Addresses</h1>
          <Button onClick={() => { setIsAdding(true); setEditingAddress(null); }}>
            <Plus className="w-4 h-4 mr-2" /> Add New Address
          </Button>
        </div>

        {(isAdding || editingAddress) ? (
          <div className="mb-8 border p-6 rounded-lg bg-card">
            <h2 className="text-lg font-medium mb-4">{editingAddress ? 'Edit Address' : 'New Address'}</h2>
            <AddressForm 
              address={editingAddress} 
              onClose={() => { setIsAdding(false); setEditingAddress(null); }} 
            />
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <div key={address.address_id} className={`border rounded-lg p-5 relative ${address.is_default ? 'border-primary shadow-sm' : ''}`}>
              {address.is_default && (
                <span className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs px-2 py-1 rounded flex items-center">
                  <Star className="w-3 h-3 mr-1 fill-current" /> Default
                </span>
              )}
              <h3 className="font-semibold text-lg mb-2">{address.address_line1}</h3>
              {address.address_line2 && <p className="text-muted-foreground">{address.address_line2}</p>}
              <p className="text-muted-foreground">{address.city_name}, {address.state} {address.zip_code}</p>
              
              <div className="flex items-center gap-3 mt-4 pt-4 border-t">
                {!address.is_default && (
                  <Button variant="outline" size="sm" onClick={() => setDefault(address.address_id)}>
                    Set Default
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setEditingAddress(address)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit
                </Button>
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => {
                  if (confirm('Delete this address?')) removeAddress(address.address_id);
                }}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </Button>
              </div>
            </div>
          ))}
          {addresses.length === 0 && !isAdding && (
            <p className="text-muted-foreground col-span-2 py-8 text-center">No saved addresses yet.</p>
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
    city_id: address?.city_id || '',
    zip_code: address?.zip_code || ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.address_line1 || !formData.city_id || !formData.zip_code) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      if (address) {
        await updateAddress(address.address_id, {
          ...formData,
          city_id: Number(formData.city_id)
        });
      } else {
        await addAddress({
          ...formData,
          city_id: Number(formData.city_id)
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save address');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded">{error}</div>}
      
      <div className="space-y-2">
        <Label>Address Line 1 *</Label>
        <Input 
          required 
          value={formData.address_line1}
          onChange={(e) => setFormData({...formData, address_line1: e.target.value})}
        />
      </div>
      
      <div className="space-y-2">
        <Label>Address Line 2</Label>
        <Input 
          value={formData.address_line2}
          onChange={(e) => setFormData({...formData, address_line2: e.target.value})}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>City *</Label>
          <select 
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
            value={formData.city_id}
            onChange={(e) => setFormData({...formData, city_id: e.target.value})}
          >
            <option value="">Select a city</option>
            {cities.map(city => (
              <option key={city.city_id} value={city.city_id}>{city.city_name}, {city.state}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <Label>Zip Code *</Label>
          <Input 
            required 
            value={formData.zip_code}
            onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
        <Button type="submit" disabled={isLoading}>{isLoading ? 'Saving...' : 'Save Address'}</Button>
      </div>
    </form>
  );
}
