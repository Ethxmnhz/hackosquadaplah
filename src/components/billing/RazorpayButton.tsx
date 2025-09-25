import React, { useEffect, useState } from 'react';

interface Props {
  orderId: string;
  amount: number; // smallest unit
  currency: string;
  publicKey: string;
  onSuccess?: (paymentId: string) => void;
  onClose?: () => void;
}

// Lightweight dynamic loader for Razorpay script
function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const RazorpayButton: React.FC<Props> = ({ orderId, amount, currency, publicKey, onSuccess, onClose }) => {
  const [ready, setReady] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => { loadRazorpay().then(setReady); }, []);

  async function open() {
    if (!ready) return;
    setOpening(true);
    try {
      const opts: any = {
        key: publicKey,
        order_id: orderId,
        amount,
        currency,
        name: 'Checkout',
        handler: function (response: any) {
          if (onSuccess) onSuccess(response.razorpay_payment_id);
        },
        modal: { ondismiss: () => { if (onClose) onClose(); } }
      };
      const rzp = new (window as any).Razorpay(opts);
      rzp.open();
    } finally {
      setOpening(false);
    }
  }

  return (
    <button disabled={!ready || opening} onClick={open} className="w-full rounded bg-indigo-600 text-white py-2 text-sm disabled:opacity-50">
      {opening ? 'Opening...' : 'Pay Now'}
    </button>
  );
};

export default RazorpayButton;
