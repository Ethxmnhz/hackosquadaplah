import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/api';

interface Product { id: string; name: string; description?: string | null }
interface Price { id: string; product_id: string; currency: string; unit_amount: number; billing_cycle: string; provider: string; is_active: boolean }
interface Entitlement { id: string; user_id: string; scope: string; starts_at: string; ends_at?: string | null }
interface Voucher { id: string; code: string; product_id: string; status: string; redeemed_by?: string | null }

const BillingAdminPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [prodRes, priceRes, entRes, vouRes] = await Promise.all([
          supabase.from('products').select('id,name,description'),
          supabase.from('prices').select('*').limit(200),
          supabase.from('entitlements').select('id,user_id,scope,starts_at,ends_at').limit(200),
          supabase.from('vouchers').select('id,code,product_id,status,redeemed_by').limit(200)
        ]);
        if (!mounted) return;
        if (prodRes.error) throw prodRes.error;
        if (priceRes.error) throw priceRes.error;
        if (entRes.error) throw entRes.error;
        if (vouRes.error) throw vouRes.error;
        setProducts(prodRes.data || []);
        setPrices(priceRes.data || []);
        setEntitlements(entRes.data || []);
        setVouchers(vouRes.data || []);
      } catch (e:any) {
        setError(e.message || 'Failed to load billing admin data');
      } finally { setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="p-6">Loading billing admin...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6 space-y-10">
      <h1 className="text-2xl font-semibold">Billing Admin (Read-Only)</h1>
      <section>
        <h2 className="text-lg font-medium mb-2">Products</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p.id} className="border rounded p-3 bg-white/50">
              <div className="font-semibold text-sm">{p.name}</div>
              {p.description && <div className="text-xs text-gray-600 mt-1 line-clamp-3">{p.description}</div>}
              <div className="text-[10px] text-gray-400 mt-2">ID: {p.id}</div>
            </div>
          ))}
          {!products.length && <div>No products</div>}
        </div>
      </section>
      <section>
        <h2 className="text-lg font-medium mb-2">Prices</h2>
        <div className="overflow-auto max-h-72 border rounded">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-2 py-1 text-left">ID</th>
                <th className="px-2 py-1 text-left">Product</th>
                <th className="px-2 py-1">Amount</th>
                <th className="px-2 py-1">Cycle</th>
                <th className="px-2 py-1">Provider</th>
                <th className="px-2 py-1">Active</th>
              </tr>
            </thead>
            <tbody>
              {prices.map(pr => (
                <tr key={pr.id} className="border-t">
                  <td className="px-2 py-1 font-mono">{pr.id.slice(0,8)}</td>
                  <td className="px-2 py-1 text-[11px]">{pr.product_id}</td>
                  <td className="px-2 py-1">{(pr.unit_amount/100).toFixed(2)} {pr.currency}</td>
                  <td className="px-2 py-1">{pr.billing_cycle}</td>
                  <td className="px-2 py-1">{pr.provider}</td>
                  <td className="px-2 py-1">{pr.is_active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
              {!prices.length && <tr><td className="px-2 py-2" colSpan={6}>No prices</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-medium mb-2">Entitlements (recent)</h2>
        <div className="overflow-auto max-h-72 border rounded">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-2 py-1 text-left">Scope</th>
                <th className="px-2 py-1">User</th>
                <th className="px-2 py-1">Start</th>
                <th className="px-2 py-1">End</th>
              </tr>
            </thead>
            <tbody>
              {entitlements.map(e => (
                <tr key={e.id} className="border-t">
                  <td className="px-2 py-1 font-mono text-[10px]">{e.scope}</td>
                  <td className="px-2 py-1 font-mono text-[10px]">{e.user_id.slice(0,8)}</td>
                  <td className="px-2 py-1">{new Date(e.starts_at).toLocaleDateString()}</td>
                  <td className="px-2 py-1">{e.ends_at ? new Date(e.ends_at).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
              {!entitlements.length && <tr><td className="px-2 py-2" colSpan={4}>No entitlements</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="text-lg font-medium mb-2">Vouchers (recent)</h2>
        <div className="overflow-auto max-h-60 border rounded">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="px-2 py-1 text-left">Code</th>
                <th className="px-2 py-1">Product</th>
                <th className="px-2 py-1">Status</th>
                <th className="px-2 py-1">Redeemed By</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map(v => (
                <tr key={v.id} className="border-t">
                  <td className="px-2 py-1 font-mono text-[10px]">{v.code}</td>
                  <td className="px-2 py-1 text-[11px]">{v.product_id}</td>
                  <td className="px-2 py-1">{v.status}</td>
                  <td className="px-2 py-1 font-mono text-[10px]">{v.redeemed_by ? v.redeemed_by.slice(0,8) : '-'}</td>
                </tr>
              ))}
              {!vouchers.length && <tr><td className="px-2 py-2" colSpan={4}>No vouchers</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default BillingAdminPage;
