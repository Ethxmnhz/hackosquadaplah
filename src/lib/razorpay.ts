// Dynamically load Razorpay checkout script and provide a promise interface
let loading: Promise<void> | null = null;
export function loadRazorpay(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if ((window as any).Razorpay) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => res();
    s.onerror = () => rej(new Error('RAZORPAY_SCRIPT_FAILED'));
    document.head.appendChild(s);
  });
  return loading;
}

export interface RazorpayOpenOptions {
  key: string;
  amount: number; // paise
  currency: string;
  name?: string;
  description?: string;
  order_id: string;
  handler: (res: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
}

export async function openRazorpay(opts: RazorpayOpenOptions) {
  await loadRazorpay();
  const Razorpay = (window as any).Razorpay;
  if (!Razorpay) throw new Error('RAZORPAY_NOT_AVAILABLE');
  const rzp = new Razorpay(opts);
  rzp.open();
}